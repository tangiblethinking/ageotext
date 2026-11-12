"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import TocIcon from "@mui/icons-material/Toc";
import CloseIcon from "@mui/icons-material/Close";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { TOC, TOC_IDS, TOC_SECTION_OF } from "@/lib/toc";
import {
  GUIDE_MOUNTED_EVENT,
  GUIDE_NAVIGATE_EVENT,
  scrollToGuideTarget,
  type GuideNavigateDetail,
} from "@/lib/highlight";

/** Below the sticky NavBar (1500) and design overlay (1400), and below SupportBot (1300). */
const TOC_Z_INDEX = 1200;
const SHEET_WIDTH = 272;
const RAIL_WIDTH = 48;
/** How long scroll-spy ignores updates after a programmatic jump (cut short by `scrollend`). */
const SPY_PAUSE_MS = 1500;

const FONT = "'DM Sans', sans-serif";
const TEXT = "#1c1b18";
const BORDER = "#ddd6c8";
const PAPER = "#f7f4ee";
const ACTIVE_WASH = "rgba(255, 193, 102, 0.35)"; // #FFC166 at 35%

function navHeight() {
  const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--nav-height"));
  return Number.isFinite(v) && v > 0 ? v : 56;
}

/**
 * Scroll spy: tracks which TOC target is "current" (nearest the top of the visible area, below the nav).
 * Also reacts to programmatic jumps (TOC clicks, chat Sources) announced via GUIDE_NAVIGATE_EVENT.
 */
function useScrollSpy(onActive: (id: string | null, fromJump: boolean) => void) {
  const onActiveRef = useRef(onActive);
  useEffect(() => {
    onActiveRef.current = onActive;
  });

  useEffect(() => {
    let targets: HTMLElement[] = [];
    let io: IntersectionObserver | null = null;
    const inBand = new Set<string>();
    let pausedUntil = 0;
    let raf = 0;
    let handledInitialHash = false;

    const bandTop = () => navHeight() + 16;

    const pick = () => {
      if (performance.now() < pausedUntil || targets.length === 0) return;
      const vh = window.innerHeight;
      const doc = document.documentElement;
      const atBottom = vh + window.scrollY >= doc.scrollHeight - 2;
      let id: string | null = null;
      if (atBottom) {
        // The last items can never reach the top band; at the very bottom, the last visible target wins.
        for (const el of targets) if (el.getBoundingClientRect().top < vh) id = el.id;
      } else if (inBand.size > 0) {
        id = TOC_IDS.find((t) => inBand.has(t)) ?? null;
      } else {
        // Nothing in the band (e.g. long prose between targets): keep the last target scrolled past.
        const top = bandTop();
        for (const el of targets) if (el.getBoundingClientRect().top <= top) id = el.id;
      }
      onActiveRef.current(id, false);
    };

    const observe = () => {
      io?.disconnect();
      inBand.clear();
      // Reading band: from just below the sticky nav down to ~35% of the viewport.
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) inBand.add(e.target.id);
            else inBand.delete(e.target.id);
          }
          pick();
        },
        { rootMargin: `-${Math.round(bandTop())}px 0px -65% 0px`, threshold: 0 },
      );
      targets.forEach((el) => io!.observe(el));
    };

    const attach = () => {
      const root = document.querySelector(".guide-root");
      if (!root) return;
      targets = TOC_IDS.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
      if (targets.length === 0) return;
      observe();
      if (!handledInitialHash) {
        handledInitialHash = true;
        // The guide loads after first paint, so the browser could not honor a deep link like #matrix-grid.
        const hashId = decodeURIComponent(window.location.hash.slice(1));
        if (hashId && TOC_SECTION_OF[hashId]) requestAnimationFrame(() => scrollToGuideTarget(hashId));
      }
    };

    const ensureAttached = () => {
      if (targets.length === 0 || !targets[0].isConnected) attach();
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        // IntersectionObserver covers the band; scroll only matters for the bottom-of-page case.
        if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) pick();
      });
    };

    const onNavigate = (e: Event) => {
      const { id } = (e as CustomEvent<GuideNavigateDetail>).detail;
      if (!TOC_SECTION_OF[id]) return;
      pausedUntil = performance.now() + SPY_PAUSE_MS;
      onActiveRef.current(id, true);
    };

    const onScrollEnd = () => {
      if (pausedUntil > performance.now()) pausedUntil = Math.min(pausedUntil, performance.now() + 150);
    };

    let resizeTimer: ReturnType<typeof setTimeout> | undefined;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (targets.length) observe(); // nav height / viewport changed: rebuild the band
      }, 150);
    };

    // Guide HTML is fetched client-side; attach now if present, else when it mounts (event or DOM change).
    const mo = new MutationObserver(ensureAttached);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener(GUIDE_MOUNTED_EVENT, attach);
    window.addEventListener(GUIDE_NAVIGATE_EVENT, onNavigate);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd);
    window.addEventListener("resize", onResize);
    attach();

    return () => {
      mo.disconnect();
      io?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener(GUIDE_MOUNTED_EVENT, attach);
      window.removeEventListener(GUIDE_NAVIGATE_EVENT, onNavigate);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
      window.removeEventListener("resize", onResize);
    };
  }, []);
}

type TreeProps = {
  idPrefix: string;
  activeId: string | null;
  openSection: string | null;
  onToggleSection: (sectionId: string) => void;
  onNavigate: (id: string) => void;
};

/** The section/child tree. Rendered once in the desktop sheet and once in the mobile drawer. */
function TocTree({ idPrefix, activeId, openSection, onToggleSection, onNavigate }: TreeProps) {
  const { t } = useLanguage();
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the active item visible inside the sheet (manual scrollTop so the window's smooth scroll isn't interrupted).
  useEffect(() => {
    if (!activeId) return;
    const timer = setTimeout(() => {
      const list = listRef.current;
      const scroller = list?.parentElement;
      const item = list?.querySelector<HTMLElement>(`[data-toc-id="${activeId}"]`);
      if (!scroller || !item || item.offsetParent === null) return;
      const s = scroller.getBoundingClientRect();
      const r = item.getBoundingClientRect();
      if (r.top < s.top) scroller.scrollTop += r.top - s.top - 8;
      else if (r.bottom > s.bottom) scroller.scrollTop += r.bottom - s.bottom + 8;
    }, 260); // after the accordion finishes opening
    return () => clearTimeout(timer);
  }, [activeId, openSection]);

  const linkSx = (active: boolean, level: 0 | 1) => ({
    display: "block",
    flex: 1,
    minWidth: 0,
    textDecoration: "none",
    color: TEXT,
    fontFamily: FONT,
    fontSize: level === 0 ? "0.875rem" : "0.8125rem",
    lineHeight: 1.35,
    fontWeight: active ? 700 : level === 0 ? 500 : 400,
    py: level === 0 ? 1 : 0.625,
    pl: level === 0 ? 1.25 : 2.5,
    pr: 1,
    borderLeft: "3px solid",
    borderLeftColor: active ? TEXT : "transparent",
    bgcolor: active ? ACTIVE_WASH : "transparent",
    borderRadius: "0 6px 6px 0",
    "&:hover": { bgcolor: active ? ACTIVE_WASH : "rgba(28, 27, 24, 0.05)" },
    "&:focus-visible": { outline: `2px solid ${TEXT}`, outlineOffset: -2 },
  });

  const activeSection = activeId ? TOC_SECTION_OF[activeId] : null;

  return (
    <Box component="ul" ref={listRef} sx={{ listStyle: "none", m: 0, p: 0, pb: 2 }}>
      {TOC.map((section) => {
        const isOpen = openSection === section.id;
        const panelId = `${idPrefix}-section-${section.id}`;
        const sectionActive = activeId === section.id;
        return (
          <Box component="li" key={section.id} sx={{ m: 0, borderBottom: `1px solid ${BORDER}` }}>
            <Box sx={{ display: "flex", alignItems: "flex-start" }}>
              <Box
                component="a"
                href={`#${section.id}`}
                data-toc-id={section.id}
                aria-current={sectionActive ? "location" : undefined}
                onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                  e.preventDefault();
                  onNavigate(section.id);
                }}
                sx={{ ...linkSx(sectionActive, 0), fontWeight: sectionActive || activeSection === section.id ? 700 : 500 }}
              >
                {section.label}
              </Box>
              <IconButton
                size="small"
                onClick={() => onToggleSection(section.id)}
                aria-expanded={isOpen}
                aria-controls={panelId}
                aria-label={`${isOpen ? t("collapse") : t("expand")}: ${section.label}`}
                sx={{ mt: 0.5, mr: 0.5, color: TEXT }}
              >
                <ExpandMoreIcon
                  fontSize="small"
                  sx={{ transition: "transform 200ms", transform: isOpen ? "rotate(180deg)" : "none" }}
                />
              </IconButton>
            </Box>
            <Collapse in={isOpen} timeout={200} id={panelId}>
              <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0, pb: 1 }}>
                {section.children.map((child) => {
                  const active = activeId === child.id;
                  return (
                    <Box component="li" key={child.id} sx={{ m: 0 }}>
                      <Box
                        component="a"
                        href={`#${child.id}`}
                        data-toc-id={child.id}
                        aria-current={active ? "location" : undefined}
                        onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                          e.preventDefault();
                          onNavigate(child.id);
                        }}
                        sx={linkSx(active, 1)}
                      >
                        {child.label}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Collapse>
          </Box>
        );
      })}
    </Box>
  );
}

/** Sheet title + close control. Not a heading element, so the guide's own heading outline is untouched. */
function SheetHeader({ onClose, controls, icon }: { onClose: () => void; controls: string; icon: React.ReactNode }) {
  const { t } = useLanguage();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        pl: 1.75,
        pr: 0.5,
        py: 0.75,
        borderBottom: `1px solid ${BORDER}`,
        flex: "0 0 auto",
      }}
    >
      <Typography
        component="div"
        sx={{ fontFamily: FONT, fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1875rem", textTransform: "uppercase", color: TEXT, m: 0 }}
      >
        {t("tableOfContents")}
      </Typography>
      <IconButton
        size="small"
        onClick={onClose}
        aria-label={t("closeTableOfContents")}
        aria-expanded
        aria-controls={controls}
        sx={{ color: TEXT }}
      >
        {icon}
      </IconButton>
    </Box>
  );
}

export default function TableOfContents() {
  const { t } = useLanguage();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeRef = useRef<string | null>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const railButtonRef = useRef<HTMLButtonElement>(null);
  const desktopPanelRef = useRef<HTMLDivElement>(null);

  // Active item changes (scroll or jump) open its section, closing any other (one at a time).
  useScrollSpy(
    useCallback((id: string | null, fromJump: boolean) => {
      if (id === activeRef.current && !fromJump) return;
      activeRef.current = id;
      setActiveId(id);
      if (id) setOpenSection(TOC_SECTION_OF[id] ?? null);
    }, []),
  );

  const toggleSection = useCallback((sectionId: string) => {
    setOpenSection((cur) => (cur === sectionId ? null : sectionId));
  }, []);

  const navigate = useCallback((id: string) => {
    setOpenSection(TOC_SECTION_OF[id] ?? null);
    scrollToGuideTarget(id, { updateHash: true });
  }, []);

  const navigateMobile = useCallback(
    (id: string) => {
      setMobileOpen(false);
      navigate(id);
    },
    [navigate],
  );

  // Mobile drawer: Escape closes; focus moves in on open and back to the toggle on close.
  const wasMobileOpen = useRef(false);
  useEffect(() => {
    if (mobileOpen) {
      const focusTimer = setTimeout(() => drawerRef.current?.querySelector<HTMLElement>("button, a")?.focus(), 50);
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") setMobileOpen(false);
      };
      window.addEventListener("keydown", onKey);
      wasMobileOpen.current = true;
      return () => {
        clearTimeout(focusTimer);
        window.removeEventListener("keydown", onKey);
      };
    }
    if (wasMobileOpen.current) {
      wasMobileOpen.current = false;
      mobileToggleRef.current?.focus({ preventScroll: true });
    }
  }, [mobileOpen]);

  const treeProps = { activeId, openSection, onToggleSection: toggleSection };
  const desktopPanelId = "toc-desktop-panel";
  const mobilePanelId = "toc-mobile-panel";
  const sheetHeight = "calc(100dvh - var(--nav-height, 56px))";

  return (
    <>
      {/* Desktop (md+): sticky side sheet that pushes the guide; collapses to a thin rail. */}
      <Box
        component="aside"
        sx={{
          display: { xs: "none", md: "block" },
          flex: "0 0 auto",
          width: desktopOpen ? SHEET_WIDTH : RAIL_WIDTH,
          transition: "width 220ms ease",
          position: "sticky",
          top: "var(--nav-height, 56px)",
          height: sheetHeight,
          zIndex: TOC_Z_INDEX,
          bgcolor: PAPER,
          borderRight: `1px solid ${BORDER}`,
          overflow: "hidden",
        }}
      >
        {desktopOpen ? (
          <Box
            ref={desktopPanelRef}
            component="nav"
            id={desktopPanelId}
            aria-label={t("tableOfContents")}
            sx={{ width: SHEET_WIDTH, height: "100%", display: "flex", flexDirection: "column" }}
          >
            <SheetHeader
              controls={desktopPanelId}
              icon={<MenuOpenIcon fontSize="small" />}
              onClose={() => {
                setDesktopOpen(false);
                requestAnimationFrame(() => railButtonRef.current?.focus());
              }}
            />
            <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
              <TocTree idPrefix="toc-desktop" onNavigate={navigate} {...treeProps} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ width: RAIL_WIDTH, display: "flex", justifyContent: "center", pt: 0.75 }}>
            <IconButton
              ref={railButtonRef}
              size="small"
              onClick={() => {
                setDesktopOpen(true);
                requestAnimationFrame(() => desktopPanelRef.current?.querySelector<HTMLElement>("button")?.focus());
              }}
              aria-label={t("openTableOfContents")}
              aria-expanded={false}
              title={t("tableOfContents")}
              sx={{ color: TEXT }}
            >
              <TocIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </Box>

      {/* Mobile (< md): closed by default; a tab on the left edge opens an overlay drawer. */}
      <Box sx={{ display: { xs: "block", md: "none" } }}>
        <IconButton
          ref={mobileToggleRef}
          onClick={() => setMobileOpen(true)}
          aria-label={t("openTableOfContents")}
          aria-expanded={mobileOpen}
          aria-controls={mobilePanelId}
          sx={{
            position: "fixed",
            left: 0,
            top: "calc(var(--nav-height, 56px) + 12px)",
            zIndex: TOC_Z_INDEX,
            width: 32,
            height: 40,
            borderRadius: "0 8px 8px 0",
            bgcolor: "#fff",
            color: TEXT,
            border: `1px solid ${BORDER}`,
            borderLeft: "none",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
            "&:hover": { bgcolor: PAPER },
          }}
        >
          <TocIcon fontSize="small" />
        </IconButton>
        {mobileOpen && (
          <Box
            onClick={() => setMobileOpen(false)}
            aria-hidden
            sx={{
              position: "fixed",
              left: 0,
              right: 0,
              bottom: 0,
              top: "var(--nav-height, 56px)",
              zIndex: TOC_Z_INDEX + 40,
              bgcolor: "rgba(28, 27, 24, 0.35)",
            }}
          />
        )}
        <Box
          ref={drawerRef}
          component="nav"
          id={mobilePanelId}
          aria-label={t("tableOfContents")}
          sx={{
            position: "fixed",
            left: 0,
            top: "var(--nav-height, 56px)",
            height: sheetHeight,
            width: "min(300px, 85vw)",
            zIndex: TOC_Z_INDEX + 50,
            bgcolor: PAPER,
            borderRight: `1px solid ${BORDER}`,
            boxShadow: mobileOpen ? "4px 0 16px rgba(0,0,0,0.15)" : "none",
            transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
            visibility: mobileOpen ? "visible" : "hidden",
            transition: "transform 220ms ease, visibility 220ms",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <SheetHeader
            controls={mobilePanelId}
            onClose={() => setMobileOpen(false)}
            icon={<CloseIcon fontSize="small" />}
          />
          <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain" }}>
            <TocTree idPrefix="toc-mobile" onNavigate={navigateMobile} {...treeProps} />
          </Box>
        </Box>
      </Box>
    </>
  );
}
