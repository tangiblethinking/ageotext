"use client";

import { useState, useEffect, useRef } from "react";
import Fab from "@mui/material/Fab";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import SendIcon from "@mui/icons-material/Send";
import { isPlausibleApiKey, saveApiKey, readStoredApiKey } from "@/lib/api-key-store";

type Step = "welcome" | "tip" | "haveKey" | "step1" | "step2" | "step3" | "step4" | "step5" | "step6" | "step7" | "step8" | "pasteNow" | "done" | "dismissed";
type Message = { id: string; from: "bot" | "user"; text: string; sources?: { heading: string; section: string }[]; };

const TEXTS: Record<string, string> = {
  welcome: "Hi There — I’m here to help you get set up. To use the power of AI you'll need a key (if you have a google/gmail account you already have this). It only takes a couple of minutes, and the key stays with you. I'll never see it. Ready to start?",
  letsDoIt: "Let’s do it",
  iHaveMyKey: "I have my key",
  tip: "Just a quick helpful note — click through all the next steps here first before actually doing them and you'll have an even easier time getting all set up.",
  gotIt: "Got it!",
  haveKey: "Great! Just paste your Gemini key in the box below (where it says “Paste your Gemini key here…”) and hit the check button. I’ll save it for you automatically.",
  showMeHowToGetIt: "Show me how to get it",
  step1: "First, open Google AI Studio’s API keys page. Click the link below — a new tab will open so you can come back to this tab anytime for help.\n\nhttps://aistudio.google.com/api-keys\n\nSign in with your Google account if it asks. (First time? You’ll accept a short terms notice — that’s normal.)",
  imOnThePage: "I’m on the page",
  step2: "Look for the Create API key button (usually in the top-right corner). Click it.",
  iClickedCreate: "I clicked Create API key",
  step3: "A window opens. You can name your key (optional) or leave the default.\n\nThen click the project dropdown.",
  iOpenedDropdown: "I opened the dropdown",
  step4: "You’ll see options: Import project, + Create project, or any existing projects.\n\nPick an existing one if you have it, or choose “+ Create project” to make a new one.",
  next: "Next",
  step5: "If you chose to create a new project: name it and click Create project.",
  projectCreated: "Project created",
  step6: "Make sure your project is selected in the dropdown.",
  projectSelected: "Project is selected",
  step7: "Click the Create key button.",
  keyCreated: "Key is created",
  step8: "Your new key appears (it looks like a long string of letters and numbers).\n\nClick the copy icon next to it, or the “Copy key” button. Then come back to this tab and paste it below.",
  iCopiedTheKey: "I copied the key",
  pasteNow: "Nice work! Just paste it below and select the checkmark to complete the setup.",
  successReady: "Success! You're ready! Ask me anything about the AEO/GEO guide.",
  dismissed: "No problem. I’ll stay in the corner if you need help getting or replacing your key later.",
  liveChatReady: "You're all set. Ask me about heading hierarchy, semantic structure, PLP/PDP, typography, or anything in the guide.",
  fallbackHelp: "Paste a valid Gemini API key (starts with AIza…) and I’ll save it for you."
};

const STEPS: Record<Step, { text: string; buttons?: { label: string; next: Step }[] }> = {
  welcome: { text: TEXTS.welcome, buttons: [{ label: TEXTS.letsDoIt, next: "tip" }, { label: TEXTS.iHaveMyKey, next: "haveKey" }] },
  tip: { text: TEXTS.tip, buttons: [{ label: TEXTS.gotIt, next: "step1" }] },
  haveKey: { text: TEXTS.haveKey, buttons: [{ label: TEXTS.showMeHowToGetIt, next: "tip" }] },
  step1: { text: TEXTS.step1, buttons: [{ label: TEXTS.imOnThePage, next: "step2" }] },
  step2: { text: TEXTS.step2, buttons: [{ label: TEXTS.iClickedCreate, next: "step3" }] },
  step3: { text: TEXTS.step3, buttons: [{ label: TEXTS.iOpenedDropdown, next: "step4" }] },
  step4: { text: TEXTS.step4, buttons: [{ label: TEXTS.next, next: "step5" }] },
  step5: { text: TEXTS.step5, buttons: [{ label: TEXTS.projectCreated, next: "step6" }] },
  step6: { text: TEXTS.step6, buttons: [{ label: TEXTS.projectSelected, next: "step7" }] },
  step7: { text: TEXTS.step7, buttons: [{ label: TEXTS.keyCreated, next: "step8" }] },
  step8: { text: TEXTS.step8, buttons: [{ label: TEXTS.iCopiedTheKey, next: "pasteNow" }] },
  pasteNow: { text: TEXTS.pasteNow },
  done: { text: TEXTS.successReady },
  dismissed: { text: TEXTS.dismissed }
};

type PanelMode = "closed" | "default" | "expanded";

export default function SupportBot() {
  const [mode, setMode] = useState<PanelMode>("closed");
  const [step, setStep] = useState<Step>("welcome");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [thinking, setThinking] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const hasKey = Boolean(apiKey);
  const isOpen = mode !== "closed";
  const isExpanded = mode === "expanded";

  useEffect(() => { setApiKey(readStoredApiKey()); }, []);

  useEffect(() => {
    if (!hasKey && !hasAutoOpened) {
      setMode("default");
      setHasAutoOpened(true);
      pushBot(STEPS.welcome.text);
    }
  }, [hasKey, hasAutoOpened]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking, isOpen]);

  function pushBot(text: string, sources?: { heading: string; section: string }[]) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "bot", text, sources }]);
  }
  function pushUser(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "user", text }]);
  }
  function goTo(next: Step) {
    setStep(next);
    const nextStep = STEPS[next];
    if (nextStep?.text && next !== "dismissed" && next !== "done") pushBot(nextStep.text);
    if (next === "dismissed") setMode("closed");
    if (next === "done") pushBot(TEXTS.successReady);
  }
  function handleButton(next: Step, label: string) {
    pushUser(label);
    goTo(next);
  }
  function trySaveKey(raw: string) {
    const trimmed = raw.trim();
    if (!isPlausibleApiKey(trimmed)) return false;
    saveApiKey(trimmed);
    setApiKey(trimmed);
    pushUser(trimmed.slice(0, 8) + "… (key detected)");
    pushBot(TEXTS.successReady);
    setStep("done");
    return true;
  }
  async function sendChat(text: string) {
    const key = readStoredApiKey();
    if (!key) return;
    setThinking(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, apiKey: key }) });
      const data = await res.json();
      pushBot(data.answer || data.error || "Unable to respond.", data.sources);
    } catch {
      pushBot("Network error. Please try again.");
    } finally {
      setThinking(false);
    }
  }
  function onSend() {
    const text = draft.trim();
    if (!text || thinking) return;
    setDraft("");
    if (trySaveKey(text)) return;
    if (hasKey) {
      pushUser(text);
      sendChat(text);
      return;
    }
    pushUser(text);
    pushBot(TEXTS.fallbackHelp);
  }
  function copyText(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1400);
    });
  }
  function renderText(text: string) {
    const url = "https://aistudio.google.com/api-keys";
    if (!text.includes(url)) return text;
    const [before, after] = text.split(url);
    return (<>{before}<a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#007AFF", textDecoration: "underline" }}>Open Google AI Studio API keys</a>{after}</>);
  }

  if (!isOpen) {
    return (
      <Fab onClick={() => { setMode("default"); if (messages.length === 0 && hasKey) pushBot(TEXTS.liveChatReady); else if (messages.length === 0) pushBot(STEPS.welcome.text); }} sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 1300, bgcolor: "#1c1b18", color: "#f3efe6", "&:hover": { bgcolor: "#2c2a24" }, width: 56, height: 56 }} aria-label="Open AEO/GEO assistant">
        <ChatBubbleOutlineIcon />
      </Fab>
    );
  }

  const current = STEPS[step];
  const showButtons = current.buttons && current.buttons.length > 0 && step !== "done" && !hasKey;
  const showInput = hasKey || step === "pasteNow" || step === "haveKey" || step === "done";

  return (
    <Paper elevation={12} sx={{
      position: "fixed", bottom: 16, right: 16, top: isExpanded ? 16 : "auto", zIndex: 1300,
      width: isExpanded ? "min(100vw - 2rem, 384px)" : { xs: "calc(100vw - 2rem)", sm: 384 },
      height: isExpanded ? "calc(100dvh - 2rem)" : "min(512px, calc(100dvh - 2rem))",
      display: "flex", flexDirection: "column", borderRadius: 4, overflow: "hidden",
      bgcolor: "#12110f", color: "#f3efe6", border: "1px solid #2f2c26"
    }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.5, py: 1, borderBottom: "1px solid #2f2c26", bgcolor: "#000", color: "#fff", flexShrink: 0 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", bgcolor: "#222", flexShrink: 0, position: "relative" }}>
            <video src="/mascot/supportbot-mascot-original.mp4" autoPlay loop muted playsInline style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
          </Box>
          <Typography variant="subtitle2" fontWeight={600} sx={{ color: "#fff" }}>AEO/GEO Assistant</Typography>
        </Box>
        <Box>
          <IconButton size="small" onClick={() => setMode(isExpanded ? "default" : "expanded")} aria-label={isExpanded ? "Collapse" : "Expand"} sx={{ color: "#fff" }}>
            {isExpanded ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
          </IconButton>
          <IconButton size="small" onClick={() => setMode("closed")} aria-label="Minimize" sx={{ color: "#fff" }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
      </Box>
      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5, bgcolor: "#191815" }}>
        {messages.map((msg) => (
          <Box key={msg.id} sx={{ display: "flex", justifyContent: msg.from === "user" ? "flex-end" : "flex-start", mb: 1.5 }}>
            <Paper elevation={0} sx={{ maxWidth: "85%", p: 1.5, borderRadius: 3, bgcolor: msg.from === "user" ? "#f3efe6" : "#26241f", color: msg.from === "user" ? "#1c1b18" : "#f3efe6", position: "relative", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {msg.from === "bot" && <IconButton size="small" onClick={() => copyText(msg.id, msg.text)} sx={{ position: "absolute", top: 4, right: 4, bgcolor: "rgba(255,255,255,0.1)", color: "inherit" }} aria-label="Copy">{copiedId === msg.id ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}</IconButton>}
              <Typography variant="body2" component="div" sx={{ pr: msg.from === "bot" ? 3 : 0 }}>{renderText(msg.text)}</Typography>
              {msg.sources && msg.sources.length > 0 && <Typography variant="caption" sx={{ display: "block", mt: 1, opacity: 0.7 }}>Sources: {msg.sources.map((s) => s.heading).join(" · ")}</Typography>}
            </Paper>
          </Box>
        ))}
        {thinking && <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1.5 }}><Paper elevation={0} sx={{ p: 1.5, borderRadius: 3, bgcolor: "#26241f", display: "flex", gap: 0.5 }}>{[0, 0.16, 0.32].map((delay) => <Box key={delay} sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#a8a196", animation: "bounce 1.4s infinite ease-in-out both", animationDelay: `${delay}s` }} />)}</Paper></Box>}
        <div ref={endRef} />
      </Box>
      {showButtons && <Box sx={{ p: 1.5, display: "flex", flexWrap: "wrap", gap: 1, bgcolor: "#191815", borderTop: "1px solid #2f2c26" }}>{current.buttons!.map((b) => <Button key={b.label} variant="outlined" size="small" onClick={() => handleButton(b.next, b.label)} sx={{ borderColor: "#2f2c26", color: "#f3efe6", "&:hover": { borderColor: "#f3efe6" } }}>{b.label}</Button>)}</Box>}
      {showInput && <Box sx={{ p: 1.5, borderTop: "1px solid #2f2c26", bgcolor: "#191815" }}><Box sx={{ display: "flex", gap: 1 }}><TextField fullWidth multiline maxRows={4} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }} placeholder={hasKey ? "Ask about AEO/GEO..." : "Paste your Gemini key here…"} size="small" disabled={thinking} sx={{ "& .MuiOutlinedInput-root": { bgcolor: "#26241f", color: "#f3efe6", "& fieldset": { borderColor: "#2f2c26" } }, "& .MuiInputBase-input": { color: "#f3efe6" } }} /><IconButton onClick={onSend} disabled={thinking || !draft.trim()} sx={{ bgcolor: "#f3efe6", color: "#12110f", "&:hover": { bgcolor: "#e4dfd4" }, alignSelf: "flex-end" }} aria-label="Send"><SendIcon /></IconButton></Box></Box>}
      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
    </Paper>
  );
}
