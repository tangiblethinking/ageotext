"use client";

import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import KeyIcon from "@mui/icons-material/VpnKey";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";

import { readStoredApiKey, saveApiKey, deleteApiKey, isPlausibleApiKey } from "@/lib/api-key-store";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import type { TranslationKey } from "@/lib/i18n/translations";
import LanguageSelector, { NAV_POPUP_Z_INDEX } from "@/components/LanguageSelector";

type DesignId = "current-h" | "future-h" | "font-styles";

interface DesignLink {
  id: DesignId;
  labelKey: TranslationKey;
  hash: string;
  src: string;
}

/** Design reference pages served from /public/designs (English only), opened in an iframe overlay. */
const DESIGNS: DesignLink[] = [
  { id: "current-h", labelKey: "designCurrentH", hash: "#design-current-h", src: "/designs/current-h-design.html" },
  { id: "future-h", labelKey: "designFutureH", hash: "#design-future-h", src: "/designs/future-h-design.html" },
  { id: "font-styles", labelKey: "designFontStyles", hash: "#design-font-styles", src: "/designs/current-font-styles.html" },
];

const designFromHash = (hash: string) => DESIGNS.find((d) => d.hash === hash) ?? null;

/*
 * Stacking order:
 *   1600  API key dialog, Designs menu, language menu (NAV_POPUP_Z_INDEX)
 *   1500  sticky nav: stays visible and clickable above an open design
 *   1400  design overlay (starts below the nav)
 *   1350  SupportBot screenshot viewer
 *   1300  SupportBot FAB / panel
 */
const NAV_Z_INDEX = 1500;
const DESIGN_OVERLAY_Z_INDEX = 1400;
/** Locks page scroll while a design is open (rule in globals.css). */
const DESIGN_OPEN_BODY_CLASS = "design-overlay-open";

/** Live nav height, also exposed as the `--nav-height` CSS variable for other fixed layers. */
function useElementHeight(ref: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = useState(56);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      setHeight(h);
      document.documentElement.style.setProperty("--nav-height", `${h}px`);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return height;
}

const replaceHash = (hash: string) =>
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);

export default function NavBar() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [errorKey, setErrorKey] = useState<TranslationKey | null>(null);
  const [errorText, setErrorText] = useState("");

  const navRef = useRef<HTMLElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const navHeight = useElementHeight(navRef);

  const [designId, setDesignId] = useState<DesignId | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const activeDesign = DESIGNS.find((d) => d.id === designId) ?? null;
  const isDesignOpen = Boolean(activeDesign);

  const closeDesign = useCallback(() => {
    setDesignId(null);
    if (designFromHash(window.location.hash)) replaceHash("");
  }, []);

  const openDesign = useCallback((design: DesignLink) => {
    // Lets other layers (e.g. the SupportBot screenshot viewer) step aside.
    window.dispatchEvent(new CustomEvent("ageotext-design-open", { detail: design.id }));
    setDesignId((current) => {
      if (current === null && document.activeElement instanceof HTMLElement) {
        returnFocusRef.current = document.activeElement;
      }
      return design.id;
    });
  }, []);

  /** Nav click: open, swap to a different design, or toggle the open one closed. */
  const handleDesignClick = (design: DesignLink) => {
    setMenuAnchor(null);
    if (design.id === designId) {
      closeDesign();
      return;
    }
    if (window.location.hash !== design.hash) replaceHash(design.hash);
    openDesign(design);
  };

  // Deep links: #design-current-h, #design-future-h, #design-font-styles
  // open the matching overlay on load and on hashchange. Other hashes (guide anchors) are ignored.
  useEffect(() => {
    const syncFromHash = () => {
      const design = designFromHash(window.location.hash);
      if (design) openDesign(design);
    };
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [openDesign]);

  // While a design is open: lock page scroll, make the page behind inert (the nav
  // and the overlay stay interactive), close on Esc, and move focus into the overlay.
  useEffect(() => {
    if (!isDesignOpen) return;
    // Lock on <body> (not <html>): body overflow propagates to the viewport, so the
    // sticky nav keeps sticking. Hiding overflow on <html> would turn <body> into the
    // scroll container as soon as an MUI menu/dialog also locks it, unsticking the nav.
    // A class (not an inline style) so it can't fight MUI's own inline save/restore
    // when a menu or dialog opens or closes on top of the overlay.
    const html = document.documentElement;
    const prevGutter = html.style.scrollbarGutter;
    html.style.scrollbarGutter = "stable";
    document.body.classList.add(DESIGN_OPEN_BODY_CLASS);

    const nav = navRef.current;
    const overlay = overlayRef.current;
    const inerted: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement)) continue;
      if (child === nav || child === overlay || child.contains(nav) || child.contains(overlay)) continue;
      if (["SCRIPT", "STYLE", "LINK", "TEMPLATE"].includes(child.tagName) || child.inert) continue;
      // Leave MUI portals (dialogs, menus, tooltips) alone.
      if (child.classList.contains("MuiModal-root") || child.classList.contains("MuiPopper-root")) continue;
      child.inert = true;
      inerted.push(child);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      // A dialog or menu stacked above the overlay (focus is trapped inside it) handles its own Esc.
      if (e.target instanceof Element && e.target.closest(".MuiModal-root")) return;
      closeDesign();
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.classList.remove(DESIGN_OPEN_BODY_CLASS);
      html.style.scrollbarGutter = prevGutter;
      inerted.forEach((el) => (el.inert = false));
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isDesignOpen, closeDesign]);

  // Focus the close control when the overlay first opens; restore focus when it closes.
  useEffect(() => {
    if (isDesignOpen) {
      const active = document.activeElement;
      const fromNav = active instanceof HTMLElement && navRef.current?.contains(active);
      if (!fromNav) closeButtonRef.current?.focus({ preventScroll: true });
      return;
    }
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    if (target && target.isConnected && !target.closest("[inert]")) target.focus({ preventScroll: true });
  }, [isDesignOpen]);

  /** Esc pressed while focus is inside the (same-origin) design iframe. */
  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      e.currentTarget.contentWindow?.document.addEventListener("keydown", (ev) => {
        if (ev.key === "Escape") closeDesign();
      });
    } catch {
      /* cross-origin: ignore */
    }
  };

  useEffect(() => {
    const sync = () => setHasKey(Boolean(readStoredApiKey()));
    sync();
    window.addEventListener("ageotext-key-changed", sync);
    return () => window.removeEventListener("ageotext-key-changed", sync);
  }, []);

  const setError = (key: TranslationKey | null, text = "") => {
    setErrorKey(key);
    setErrorText(text);
  };

  const handleOpen = () => {
    setMenuAnchor(null);
    setKeyInput(readStoredApiKey() || "");
    setVerified(false);
    setError(null);
    setOpen(true);
  };

  const handleVerify = async () => {
    const trimmed = keyInput.trim();
    if (!isPlausibleApiKey(trimmed)) {
      setError("enterValidKey");
      return;
    }
    setVerifying(true);
    setError(null);
    setVerified(false);
    try {
      const res = await fetch("/api/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed }),
      });
      const data = await res.json();
      if (data.ok) {
        setVerified(true);
      } else if (data.error) {
        setError(null, data.error);
      } else {
        setError("keyRejected");
      }
    } catch {
      setError("networkErrorVerify");
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = () => {
    const trimmed = keyInput.trim();
    if (!isPlausibleApiKey(trimmed)) return;
    saveApiKey(trimmed);
    setHasKey(true);
    setOpen(false);
  };

  const handleClear = () => {
    deleteApiKey();
    setKeyInput("");
    setHasKey(false);
    setVerified(false);
  };

  const errorMessage = errorKey ? t(errorKey) : errorText;

  return (
    <>
      <AppBar
        ref={navRef}
        position="sticky"
        elevation={0}
        sx={{
          top: 0,
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid rgba(60,60,67,0.12)",
          color: "#000",
          zIndex: NAV_Z_INDEX,
        }}
      >
        <Toolbar sx={{ minHeight: 56, gap: { xs: 0.75, sm: 1.5 }, px: { xs: 1.5, sm: 2 } }}>
          <Typography
            variant="h6"
            component="div"
            noWrap
            sx={{ flexGrow: 1, minWidth: 0, fontWeight: 600, fontSize: "1.05rem" }}
          >
            {t("navTitle")}
          </Typography>

          {/* md and up: inline design links (longer DE/FR/PT labels need the room) */}
          <Box
            component="nav"
            aria-label={t("designReferences")}
            sx={{ display: { xs: "none", md: "flex" }, alignItems: "center", gap: 0.5, flexShrink: 0 }}
          >
            {DESIGNS.map((design) => {
              const isActive = design.id === designId;
              return (
                <Button
                  key={design.id}
                  href={design.hash}
                  onClick={(e) => {
                    e.preventDefault();
                    handleDesignClick(design);
                  }}
                  aria-current={isActive ? "page" : undefined}
                  aria-haspopup="dialog"
                  aria-expanded={isActive}
                  aria-controls={isActive ? "design-overlay" : undefined}
                  size="small"
                  sx={{
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    borderRadius: 2,
                    color: isActive ? "#007AFF" : "rgba(0,0,0,0.78)",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: { md: "0.8rem", lg: "0.875rem" },
                    px: { md: 0.75, lg: 1.25 },
                    minWidth: 0,
                    bgcolor: isActive ? "rgba(0,122,255,0.08)" : "transparent",
                    "&:hover": { bgcolor: "rgba(0,122,255,0.08)" },
                  }}
                >
                  {t(design.labelKey)}
                </Button>
              );
            })}
          </Box>

          {/* below md: collapsed "Designs" menu */}
          <Box component="nav" aria-label={t("designReferences")} sx={{ display: { xs: "block", md: "none" }, flexShrink: 0 }}>
            <Button
              id="designs-menu-button"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-controls={menuAnchor ? "designs-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={menuAnchor ? "true" : undefined}
              endIcon={<ExpandMoreIcon />}
              size="small"
              sx={{
                textTransform: "none",
                borderRadius: 2,
                whiteSpace: "nowrap",
                minWidth: 0,
                px: 1,
                color: isDesignOpen ? "#007AFF" : "rgba(0,0,0,0.78)",
                bgcolor: isDesignOpen ? "rgba(0,122,255,0.08)" : "transparent",
                "& .MuiButton-endIcon": { ml: 0.25 },
              }}
            >
              {t("designs")}
            </Button>
            <Menu
              id="designs-menu"
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              MenuListProps={{ "aria-labelledby": "designs-menu-button" }}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              sx={{ zIndex: NAV_POPUP_Z_INDEX }}
            >
              {DESIGNS.map((design) => (
                <MenuItem
                  key={design.id}
                  selected={design.id === designId}
                  aria-current={design.id === designId ? "page" : undefined}
                  onClick={() => handleDesignClick(design)}
                >
                  {t(design.labelKey)}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          <LanguageSelector />

          <Button
            onClick={handleOpen}
            startIcon={<KeyIcon />}
            variant={hasKey ? "contained" : "outlined"}
            size="small"
            aria-label={hasKey ? t("apiKey") : t("apiKeyRequiredAria")}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              whiteSpace: "nowrap",
              flexShrink: 0,
              ...(hasKey && { bgcolor: "#007AFF", "&:hover": { bgcolor: "#0051D5" } }),
            }}
          >
            {t("apiKey")}
            {!hasKey && (
              <Box component="span" sx={{ display: { xs: "none", lg: "inline" } }}>
                &nbsp;{t("required")}
              </Box>
            )}
          </Button>
        </Toolbar>
      </AppBar>

      {/*
        Design overlay. Deliberately not an MUI Modal: a Modal aria-hides and traps focus
        away from the nav, but the nav has to stay usable above the open design.
      */}
      <Box
        ref={overlayRef}
        id="design-overlay"
        role="dialog"
        aria-modal="false"
        aria-labelledby={activeDesign ? "design-overlay-title" : undefined}
        hidden={!activeDesign}
        sx={{
          position: "fixed",
          top: navHeight,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: DESIGN_OVERLAY_Z_INDEX,
          display: activeDesign ? "flex" : "none",
          p: { xs: 0, sm: 1.5 },
        }}
      >
        {/* Backdrop: only the area below the nav, so nav clicks still land on the nav. */}
        <Box
          aria-hidden
          onClick={closeDesign}
          sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.5)" }}
        />
        <Box
          sx={{
            position: "relative",
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            bgcolor: "#fff",
            borderRadius: { xs: 0, sm: 2 },
            overflow: "hidden",
            boxShadow: 24,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              pl: 1.5,
              pr: 0.5,
              minHeight: 40,
              borderBottom: "1px solid rgba(60,60,67,0.12)",
              flexShrink: 0,
            }}
          >
            <Typography
              id="design-overlay-title"
              component="div"
              noWrap
              sx={{ flexGrow: 1, minWidth: 0, fontWeight: 600, fontSize: "0.875rem", color: "rgba(0,0,0,0.72)" }}
            >
              {activeDesign && t(activeDesign.labelKey)}
            </Typography>
            <IconButton ref={closeButtonRef} onClick={closeDesign} aria-label={t("closeDesignOverlay")} size="small">
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, position: "relative", bgcolor: "#f8fafc" }}>
            {activeDesign && (
              <iframe
                key={activeDesign.id}
                src={activeDesign.src}
                title={t(activeDesign.labelKey)}
                lang="en"
                onLoad={handleIframeLoad}
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }}
              />
            )}
          </Box>
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth sx={{ zIndex: NAV_POPUP_Z_INDEX }}>
        <DialogTitle>{t("apiKeysTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {t("apiKeysIntro")}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" fontWeight={600}>
                {t("geminiKey")}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("guideAssistantCaption")}
              </Typography>
            </Box>
            <Chip label={t("requiredForChat")} size="small" color="warning" variant="outlined" />
          </Box>

          <TextField
            fullWidth
            type={showKey ? "text" : "password"}
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              setVerified(false);
              setError(null);
            }}
            placeholder={t("apiKeyInputPlaceholder")}
            size="small"
            sx={{ mt: 1, mb: 1 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowKey((s) => !s)}
                    edge="end"
                    aria-label={showKey ? t("hideKey") : t("showKey")}
                  >
                    {showKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {errorMessage && (
            <Typography variant="caption" color="error" sx={{ display: "block", mb: 1 }}>
              {errorMessage}
            </Typography>
          )}
          {verified && (
            <Typography variant="caption" color="success.main" sx={{ display: "block", mb: 1 }}>
              {t("keyVerified")}
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Button
              onClick={handleVerify}
              disabled={verifying || !keyInput.trim()}
              variant="outlined"
              size="small"
            >
              {verifying ? t("verifying") : t("verify")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!verified || !keyInput.trim()}
              variant="contained"
              size="small"
              sx={{ bgcolor: "#007AFF", "&:hover": { bgcolor: "#0051D5" } }}
            >
              {t("save")}
            </Button>
            {hasKey && (
              <Button onClick={handleClear} color="error" size="small">
                {t("clear")}
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>{t("done")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
