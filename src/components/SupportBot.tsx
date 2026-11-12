"use client";

import { useState, useEffect, useRef } from "react";
import Fab from "@mui/material/Fab";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Dialog from "@mui/material/Dialog";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import TranslateIcon from "@mui/icons-material/Translate";
import { isPlausibleApiKey, saveApiKey, readStoredApiKey } from "@/lib/api-key-store";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n/languages";
import type { TranslationKey } from "@/lib/i18n/translations";

type Step = "language" | "welcome" | "tip" | "haveKey" | "step1" | "step2" | "step3" | "step4" | "step5" | "step6" | "step7" | "step8" | "pasteNow" | "done" | "dismissed";

type Source = { heading: string; section: string; id: string };
type StepImage = { src: string; width: number; height: number };

/** Scripted messages keep their translation key so they re-render when the language changes. */
type Message = {
  id: string;
  from: "bot" | "user";
  textKey?: TranslationKey;
  text?: string;
  images?: StepImage[];
  isLanguageSelect?: boolean;
  sources?: Source[];
};

const IMG = "/support/api-key";
const STEP_IMAGES: Partial<Record<Step, StepImage[]>> = {
  step2: [{ src: `${IMG}/step2-create-button.png`, width: 1453, height: 682 }],
  step3: [{ src: `${IMG}/step3-create-window.png`, width: 585, height: 368 }],
  step4: [{ src: `${IMG}/step4-project-dropdown.png`, width: 572, height: 405 }],
  step5: [{ src: `${IMG}/step5-create-project.png`, width: 539, height: 258 }],
  step6: [{ src: `${IMG}/step6-project-selected.png`, width: 542, height: 342 }],
  step7: [{ src: `${IMG}/step7-create-key.png`, width: 542, height: 336 }],
  step8: [{ src: `${IMG}/step8-copy-key.png`, width: 616, height: 564 }],
};

const STEPS: Record<Step, { textKey: TranslationKey; buttons?: { labelKey: TranslationKey; next: Step }[] }> = {
  language: { textKey: "pleaseSelectLanguage" },
  welcome: { textKey: "welcome", buttons: [{ labelKey: "letsDoIt", next: "tip" }, { labelKey: "iHaveMyKey", next: "haveKey" }] },
  tip: { textKey: "tip", buttons: [{ labelKey: "gotIt", next: "step1" }] },
  haveKey: { textKey: "haveKey", buttons: [{ labelKey: "showMeHowToGetIt", next: "tip" }] },
  step1: { textKey: "step1", buttons: [{ labelKey: "imOnThePage", next: "step2" }] },
  step2: { textKey: "step2", buttons: [{ labelKey: "iClickedCreate", next: "step3" }] },
  step3: { textKey: "step3", buttons: [{ labelKey: "iOpenedDropdown", next: "step4" }] },
  step4: { textKey: "step4", buttons: [{ labelKey: "next", next: "step5" }] },
  step5: { textKey: "step5", buttons: [{ labelKey: "projectCreated", next: "step6" }] },
  step6: { textKey: "step6", buttons: [{ labelKey: "projectSelected", next: "step7" }] },
  step7: { textKey: "step7", buttons: [{ labelKey: "keyCreated", next: "step8" }] },
  step8: { textKey: "step8", buttons: [{ labelKey: "iCopiedTheKey", next: "pasteNow" }] },
  pasteNow: { textKey: "pasteNow" },
  done: { textKey: "successReady" },
  dismissed: { textKey: "dismissed" },
};

/** Above SupportBot (1300), below the design overlay (1400) and the sticky nav (1500). */
const IMAGE_VIEWER_Z_INDEX = 1350;
const AI_STUDIO_URL = "https://aistudio.google.com/api-keys";

type PanelMode = "closed" | "default" | "expanded";

function renderMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={i}>{part.slice(1, -1)}</em>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={i} style={{ background: "rgba(0,0,0,0.06)", padding: "0 4px", borderRadius: 4, fontSize: "0.9em" }}>{part.slice(1, -1)}</code>;
    return part;
  });
}

export default function SupportBot() {
  const { t, language, setLanguage, hasChosenLanguage } = useLanguage();
  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));

  const [mode, setMode] = useState<PanelMode>("closed");
  const [step, setStep] = useState<Step>("welcome");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [keyLoaded, setKeyLoaded] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<StepImage | null>(null);
  const [viewerZoomed, setViewerZoomed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const apiKeyRef = useRef("");
  const stepRef = useRef<Step>("welcome");

  const hasKey = Boolean(apiKey);
  const isOpen = mode !== "closed";
  const isExpanded = mode === "expanded";

  const resolve = (msg: Message) => (msg.textKey ? t(msg.textKey) : msg.text ?? "");

  function changeStep(next: Step) {
    stepRef.current = next;
    setStep(next);
  }
  function pushBot(msg: Omit<Message, "id" | "from">) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "bot", ...msg }]);
  }
  function pushUser(msg: Omit<Message, "id" | "from">) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "user", ...msg }]);
  }

  /** After a language is known: live chat if a key exists, otherwise the key walkthrough. */
  function continueAfterLanguage() {
    if (apiKeyRef.current) {
      changeStep("done");
      pushBot({ textKey: "liveChatReady" });
    } else {
      changeStep("welcome");
      pushBot({ textKey: "welcome" });
    }
  }
  /** First message of a conversation: ask for a language unless one was already chosen. */
  function startConversation() {
    if (!hasChosenLanguage) {
      changeStep("language");
      pushBot({ textKey: "pleaseSelectLanguage", isLanguageSelect: true });
      return;
    }
    continueAfterLanguage();
  }

  // Read the saved key, and follow changes made from the nav's API Key dialog.
  useEffect(() => {
    const initial = readStoredApiKey();
    apiKeyRef.current = initial;
    setApiKey(initial);
    setKeyLoaded(true);

    const onKeyChanged = () => {
      const next = readStoredApiKey();
      const hadKey = Boolean(apiKeyRef.current);
      apiKeyRef.current = next;
      setApiKey(next);
      if (next && !hadKey && stepRef.current !== "language") {
        // Saved from the nav while the walkthrough was in progress.
        setMessages((prev) => (prev.length > 0 ? [...prev, { id: crypto.randomUUID(), from: "bot", textKey: "successReady" }] : prev));
        changeStep("done");
      }
    };
    window.addEventListener("ageotext-key-changed", onKeyChanged);
    return () => window.removeEventListener("ageotext-key-changed", onKeyChanged);
  }, []);

  // Auto-open once for visitors without a key (after the language preference is known).
  useEffect(() => {
    if (!keyLoaded || hasChosenLanguage === null || hasAutoOpened) return;
    setHasAutoOpened(true);
    if (!apiKeyRef.current) {
      setMode("default");
      startConversation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyLoaded, hasChosenLanguage, hasAutoOpened]);

  // A language picked from the nav selector also counts as the user's choice.
  useEffect(() => {
    if (step === "language" && hasChosenLanguage) continueAfterLanguage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, hasChosenLanguage]);

  // Opening a design overlay closes the screenshot viewer so it can't trap focus underneath.
  useEffect(() => {
    const close = () => setViewerImage(null);
    window.addEventListener("ageotext-design-open", close);
    return () => window.removeEventListener("ageotext-design-open", close);
  }, []);

  function scrollToBottom(smooth = true) {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    });
  }
  useEffect(() => { scrollToBottom(); }, [messages, thinking, isOpen]);

  function chooseLanguage(code: LanguageCode, nativeName: string) {
    setLanguage(code);
    if (stepRef.current !== "language") return;
    pushUser({ text: nativeName });
    continueAfterLanguage();
  }
  function goTo(next: Step) {
    changeStep(next);
    if (next === "dismissed") { setMode("closed"); return; }
    pushBot({ textKey: STEPS[next].textKey, images: STEP_IMAGES[next] });
  }
  function handleButton(next: Step, labelKey: TranslationKey) {
    pushUser({ textKey: labelKey });
    goTo(next);
  }
  function trySaveKey(raw: string) {
    const trimmed = raw.trim();
    if (!isPlausibleApiKey(trimmed)) return false;
    apiKeyRef.current = trimmed; // set first so the key-changed listener doesn't announce it twice
    saveApiKey(trimmed);
    setApiKey(trimmed);
    pushUser({ text: `${trimmed.slice(0, 8)}… ${t("keyDetected")}` });
    pushBot({ textKey: "successReady" });
    changeStep("done");
    return true;
  }
  async function sendChat(text: string) {
    const key = readStoredApiKey();
    if (!key) return;
    setThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, apiKey: key, language }),
      });
      const data = await res.json();
      if (data.answer) pushBot({ text: data.answer, sources: data.sources });
      else if (data.error) pushBot({ text: data.error });
      else pushBot({ textKey: "unableToRespond" });
    } catch {
      pushBot({ textKey: "networkErrorRetry" });
    } finally {
      setThinking(false);
    }
  }
  function onSend() {
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft("");
    if (trySaveKey(text)) return;
    pushUser({ text });
    if (hasKey) {
      sendChat(text);
      return;
    }
    pushBot({ textKey: "fallbackHelp" });
  }
  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1400);
    });
  }
  function handleSourceClick(e: React.MouseEvent<HTMLAnchorElement>, id: string) {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("source-highlight");
    setTimeout(() => el.classList.remove("source-highlight"), 2000);
  }
  function renderText(text: string) {
    if (!text.includes(AI_STUDIO_URL)) return renderMarkdown(text);
    const [before, after] = text.split(AI_STUDIO_URL);
    return (<>{renderMarkdown(before)}<a href={AI_STUDIO_URL} target="_blank" rel="noopener noreferrer" style={{ color: "#1c1b18", fontWeight: 600, textDecoration: "underline" }}>{t("openAiStudio")}</a>{renderMarkdown(after)}</>);
  }
  function openViewer(img: StepImage) {
    setViewerZoomed(false);
    setViewerImage(img);
  }

  const viewer = (
    <Dialog
      open={Boolean(viewerImage)}
      onClose={() => setViewerImage(null)}
      fullScreen={isXs}
      maxWidth={false}
      aria-label={t("screenshotAlt")}
      // Sits below the sticky nav, so start under it.
      sx={{ zIndex: IMAGE_VIEWER_Z_INDEX, top: "var(--nav-height, 56px)" }}
      slotProps={{ backdrop: { sx: { top: "var(--nav-height, 56px)" } } }}
      PaperProps={{
        sx: {
          bgcolor: "#111",
          position: "relative",
          overflow: "hidden",
          ...(isXs ? {} : { width: "min(1200px, calc(100vw - 48px))", height: "calc(100% - 48px)", maxHeight: "none", m: 3 }),
        },
      }}
    >
      <IconButton
        onClick={() => setViewerImage(null)}
        aria-label={t("closeImageViewer")}
        sx={{ position: "absolute", top: 8, right: 8, zIndex: 1, bgcolor: "rgba(255,255,255,0.9)", color: "#000", "&:hover": { bgcolor: "#fff" } }}
      >
        <CloseIcon />
      </IconButton>
      {viewerImage && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            alignItems: viewerZoomed ? "flex-start" : "center",
            justifyContent: viewerZoomed ? "flex-start" : "center",
            p: { xs: 1, sm: 2 },
            pt: { xs: 7, sm: 7 },
            touchAction: "pan-x pan-y pinch-zoom",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={viewerImage.src}
            alt={t("screenshotAlt")}
            width={viewerImage.width}
            height={viewerImage.height}
            onClick={() => setViewerZoomed((z) => !z)}
            style={{
              display: "block",
              cursor: viewerZoomed ? "zoom-out" : "zoom-in",
              borderRadius: 6,
              background: "#fff",
              ...(viewerZoomed
                ? { maxWidth: "none", width: viewerImage.width, height: "auto" }
                : { maxWidth: "100%", maxHeight: "100%", width: "auto", height: "auto", objectFit: "contain" }),
            }}
          />
        </Box>
      )}
    </Dialog>
  );

  if (!isOpen) {
    return (
      <>
        <Fab onClick={() => { setMode("default"); if (messages.length === 0) startConversation(); }} sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 1300, bgcolor: "#1c1b18", color: "#f7f4ee", "&:hover": { bgcolor: "#2c2a24" }, width: 56, height: 56 }} aria-label={t("openSupport")}>
          <ChatBubbleOutlineIcon />
        </Fab>
        {viewer}
      </>
    );
  }

  const current = STEPS[step];
  const showButtons = current.buttons && current.buttons.length > 0 && step !== "done" && !hasKey;
  const showInput = hasKey || step === "pasteNow" || step === "haveKey" || step === "done";

  return (
    <>
    <Paper elevation={16} sx={{
      position: "fixed", bottom: 16, right: 16, top: isExpanded ? "calc(var(--nav-height, 56px) + 16px)" : "auto", zIndex: 1300,
      width: isExpanded ? "min(100vw - 2rem, 384px)" : { xs: "calc(100vw - 2rem)", sm: 384 },
      height: isExpanded ? "auto" : "min(520px, calc(100dvh - var(--nav-height, 56px) - 2rem))",
      display: "flex", flexDirection: "column", borderRadius: "16px", overflow: "hidden",
      bgcolor: "#f8fafc", color: "#1c1b18", border: "1px solid #ddd6c8"
    }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1, bgcolor: "#000", color: "#fff", flexShrink: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ width: 40, height: 40, borderRadius: "50%", overflow: "hidden", bgcolor: "#222", flexShrink: 0, position: "relative" }}>
            <video src="/mascot/supportbot-mascot-original.mp4" autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
          </Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ color: "#fff", fontSize: "0.95rem" }}>{t("support")}</Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <IconButton size="small" onClick={() => setMode(isExpanded ? "default" : "expanded")} aria-label={isExpanded ? t("collapse") : t("expand")} sx={{ color: "#fff" }}>
            {isExpanded ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
          </IconButton>
          <IconButton size="small" onClick={() => setMode("closed")} aria-label={t("minimize")} sx={{ color: "#fff" }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>
      <Box ref={scrollRef} sx={{ flex: 1, overflowY: "auto", overscrollBehavior: "contain", p: 1.5, bgcolor: "#f8fafc" }}>
        {messages.map((msg) => {
          const text = resolve(msg);
          return (
          <Box key={msg.id} sx={{ display: "flex", justifyContent: msg.from === "user" ? "flex-end" : "flex-start", mb: 1.25 }}>
            <Paper elevation={0} sx={{ maxWidth: "88%", minWidth: 0, p: 1.5, borderRadius: "16px", bgcolor: msg.from === "user" ? "#1c1b18" : "#f0ebe3", color: msg.from === "user" ? "#f7f4ee" : "#1c1b18", position: "relative", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.875rem", lineHeight: 1.5 }}>
              {msg.from === "bot" && !msg.isLanguageSelect && <IconButton size="small" onClick={() => copyText(msg.id, text)} sx={{ position: "sticky", top: 4, right: 4, float: "right", bgcolor: "rgba(0,0,0,0.05)", color: "inherit", width: 24, height: 24, zIndex: 1 }} aria-label={t("copy")}>{copiedId === msg.id ? <CheckIcon sx={{ fontSize: 14 }} /> : <ContentCopyIcon sx={{ fontSize: 14 }} />}</IconButton>}
              {msg.isLanguageSelect ? (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1 }}>
                    <TranslateIcon sx={{ fontSize: 16 }} />
                    <span>{text}</span>
                  </Box>
                  <Box role="group" aria-label={t("languageSelector")} sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, whiteSpace: "normal" }}>
                    {LANGUAGES.map((lang) => {
                      const selected = hasChosenLanguage === true && lang.code === language;
                      return (
                        <Button
                          key={lang.code}
                          lang={lang.code}
                          size="small"
                          variant={selected ? "contained" : "outlined"}
                          aria-pressed={selected}
                          onClick={() => chooseLanguage(lang.code, lang.nativeName)}
                          sx={{
                            borderRadius: "16px", textTransform: "none", fontSize: "0.8rem", minWidth: 0, px: 1.25, py: 0.25,
                            borderColor: "#ddd6c8", color: selected ? "#f7f4ee" : "#1c1b18", bgcolor: selected ? "#1c1b18" : "#fff",
                            "&:hover": { borderColor: "#1c1b18", bgcolor: selected ? "#2c2a24" : "rgba(0,0,0,0.03)" },
                          }}
                        >
                          {lang.nativeName}
                        </Button>
                      );
                    })}
                  </Box>
                </Box>
              ) : (
                <Box component="div" sx={{ pr: msg.from === "bot" ? 2.5 : 0 }}>{renderText(text)}</Box>
              )}
              {msg.images && msg.images.length > 0 && (
                <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1, clear: "both" }}>
                  {msg.images.map((img) => (
                    <Box
                      key={img.src}
                      component="button"
                      type="button"
                      onClick={() => openViewer(img)}
                      aria-label={t("enlargeImage")}
                      sx={{ p: 0, m: 0, border: "1px solid #ddd6c8", borderRadius: "8px", overflow: "hidden", bgcolor: "#fff", cursor: "zoom-in", display: "block", width: "100%", "&:hover": { opacity: 0.9 }, "&:focus-visible": { outline: "2px solid #007AFF", outlineOffset: 2 } }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.src}
                        alt={t("screenshotAlt")}
                        width={img.width}
                        height={img.height}
                        loading="lazy"
                        decoding="async"
                        onLoad={() => scrollToBottom()}
                        style={{ display: "block", width: "100%", height: "auto" }}
                      />
                    </Box>
                  ))}
                </Box>
              )}
              {msg.sources && msg.sources.length > 0 && (
                <Typography variant="caption" sx={{ display: "block", mt: 1, fontSize: "0.7rem", clear: "both" }}>
                  {t("sourcesLabel")} {msg.sources.map((s, i) => (
                    <span key={s.id}>
                      {i > 0 && " • "}
                      <a href={`#${s.id}`} onClick={(e) => handleSourceClick(e, s.id)} style={{ color: "#5b7c99", textDecoration: "underline", cursor: "pointer" }}>{s.heading}</a>
                    </span>
                  ))}
                </Typography>
              )}
            </Paper>
          </Box>
          );
        })}
        {thinking && <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1.25 }}><Paper elevation={0} sx={{ p: 1.5, borderRadius: "16px", bgcolor: "#f0ebe3", display: "flex", gap: 0.5 }}>{[0, 0.16, 0.32].map((delay) => <Box key={delay} sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: "#6b6560", animation: "bounce 1.4s infinite ease-in-out both", animationDelay: `${delay}s` }} />)}</Paper></Box>}
      </Box>
      {showButtons && <Box sx={{ px: 1.5, pb: 1, display: "flex", flexWrap: "wrap", gap: 1, bgcolor: "#f8fafc" }}>{current.buttons!.map((b) => <Button key={b.labelKey} variant="outlined" size="small" onClick={() => handleButton(b.next, b.labelKey)} endIcon={<ChevronRightIcon sx={{ fontSize: 16 }} />} sx={{ borderRadius: "20px", borderColor: "#ddd6c8", color: "#1c1b18", textTransform: "none", fontSize: "0.8rem", px: 1.5, py: 0.5, "&:hover": { borderColor: "#1c1b18", bgcolor: "rgba(0,0,0,0.02)" } }}>{t(b.labelKey)}</Button>)}</Box>}
      {showInput && <Box sx={{ p: 1.5, borderTop: "1px solid #ddd6c8", bgcolor: "#f8fafc" }}><Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}><TextField fullWidth multiline maxRows={4} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={hasKey ? t("askAboutPlaceholder") : t("pasteKeyPlaceholder")} size="small" disabled={thinking} sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#fff", borderRadius: "12px", "& fieldset": { borderColor: "#ddd6c8" }, "&:hover fieldset": { borderColor: "#c5c0b6" } }, "& .MuiInputBase-input": { fontSize: "0.875rem" } }} /><IconButton onClick={onSend} disabled={thinking || !draft.trim()} sx={{ bgcolor: "#1c1b18", color: "#f7f4ee", width: 40, height: 40, "&:hover": { bgcolor: "#2c2a24" }, "&.Mui-disabled": { bgcolor: "#e4dfd4", color: "#a8a196" } }} aria-label={t("send")}><CheckIcon fontSize="small" /></IconButton></Box></Box>}
      <style>{`
        @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
        .source-highlight {
          animation: sourceHighlight 2s ease-in-out;
        }
        @keyframes sourceHighlight {
          0% { background-color: transparent; }
          25% { background-color: rgba(91, 124, 153, 0.25); }
          75% { background-color: rgba(91, 124, 153, 0.25); }
          100% { background-color: transparent; }
        }
      `}</style>
    </Paper>
    {viewer}
    </>
  );
}
