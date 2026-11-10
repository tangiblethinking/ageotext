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
import { isPlausibleApiKey, saveApiKey, readStoredApiKey } from "@/lib/api-key-store";

type Step =
  | "welcome"
  | "tip"
  | "haveKey"
  | "step1"
  | "step2"
  | "step3"
  | "step4"
  | "step5"
  | "step6"
  | "step7"
  | "step8"
  | "pasteNow"
  | "done"
  | "dismissed";

type Message = {
  id: string;
  from: "bot" | "user";
  text: string;
};

const TEXTS: Record<string, string> = {
  welcome: "Hi There — I’m here to help you get set up. To use the power of AI you'll need a key (if you have a google/gmail account you already have this). It only takes a minute.",
  letsDoIt: "Let’s do it",
  iHaveMyKey: "I already have my key",
  tip: "Quick tip: keep this tab open. We’ll open Google AI Studio in a new tab so you can jump back here anytime.",
  gotIt: "Got it",
  haveKey: "Great — paste your Gemini API key below and I’ll save it for you automatically.",
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
  successReady: "Success! You're ready!",
  dismissed: "No problem. I’ll stay in the corner if you need help getting or replacing your key later.",
  geminiKeySaved: "Gemini key saved.",
  keyDetected: "(key detected)",
};

const STEPS: Record<Step, { text: string; buttons?: { label: string; next: Step }[] }> = {
  welcome: {
    text: TEXTS.welcome,
    buttons: [
      { label: TEXTS.letsDoIt, next: "tip" },
      { label: TEXTS.iHaveMyKey, next: "haveKey" },
    ],
  },
  tip: {
    text: TEXTS.tip,
    buttons: [{ label: TEXTS.gotIt, next: "step1" }],
  },
  haveKey: {
    text: TEXTS.haveKey,
    buttons: [{ label: TEXTS.showMeHowToGetIt, next: "tip" }],
  },
  step1: {
    text: TEXTS.step1,
    buttons: [{ label: TEXTS.imOnThePage, next: "step2" }],
  },
  step2: {
    text: TEXTS.step2,
    buttons: [{ label: TEXTS.iClickedCreate, next: "step3" }],
  },
  step3: {
    text: TEXTS.step3,
    buttons: [{ label: TEXTS.iOpenedDropdown, next: "step4" }],
  },
  step4: {
    text: TEXTS.step4,
    buttons: [{ label: TEXTS.next, next: "step5" }],
  },
  step5: {
    text: TEXTS.step5,
    buttons: [{ label: TEXTS.projectCreated, next: "step6" }],
  },
  step6: {
    text: TEXTS.step6,
    buttons: [{ label: TEXTS.projectSelected, next: "step7" }],
  },
  step7: {
    text: TEXTS.step7,
    buttons: [{ label: TEXTS.keyCreated, next: "step8" }],
  },
  step8: {
    text: TEXTS.step8,
    buttons: [{ label: TEXTS.iCopiedTheKey, next: "pasteNow" }],
  },
  pasteNow: { text: TEXTS.pasteNow },
  done: { text: TEXTS.successReady },
  dismissed: { text: TEXTS.dismissed },
};

type Props = {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
};

export default function SupportBot({ apiKey: propApiKey, onApiKeyChange }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("welcome");
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [apiKey, setApiKey] = useState(propApiKey || "");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setApiKey(readStoredApiKey());
  }, []);

  const hasKey = Boolean(apiKey);

  useEffect(() => {
    if (!hasKey && !hasAutoOpened) {
      setOpen(true);
      setHasAutoOpened(true);
      pushBot(STEPS.welcome.text);
    }
  }, [hasKey, hasAutoOpened]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  function pushBot(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "bot", text }]);
  }

  function pushUser(text: string) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), from: "user", text }]);
  }

  function goTo(next: Step) {
    setStep(next);
    const nextStep = STEPS[next];
    if (nextStep?.text && next !== "dismissed" && next !== "done") {
      pushBot(nextStep.text);
    }
    if (next === "dismissed") {
      setOpen(false);
    }
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
    onApiKeyChange(trimmed);
    pushUser(trimmed.slice(0, 8) + "… " + TEXTS.keyDetected);
    pushBot(TEXTS.successReady);
    setStep("done");
    return true;
  }

  function onSend() {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    if (trySaveKey(text)) return;
    pushUser(text);
    pushBot("Paste a valid Gemini API key (starts with AIza…) and I’ll save it for you.");
  }

  function renderText(text: string) {
    const url = "https://aistudio.google.com/api-keys";
    if (!text.includes(url)) return text;
    const [before, after] = text.split(url);
    return (
      <>
        {before}
        <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#007AFF", textDecoration: "underline" }}>
          Open Google AI Studio API keys
        </a>
        {after}
      </>
    );
  }

  if (!open) {
    return (
      <Fab
        onClick={() => setOpen(true)}
        sx={{ position: "fixed", bottom: 96, right: 24, zIndex: 1300, bgcolor: "#34C759", "&:hover": { bgcolor: "#28A745" } }}
        aria-label="Open setup assistant"
      >
        <ChatBubbleOutlineIcon />
      </Fab>
    );
  }

  const current = STEPS[step];

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 1300,
        width: { xs: "100vw", sm: 400 },
        height: "70vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid rgba(60,60,67,0.12)", bgcolor: "#F2F2F7" }}>
        <Typography variant="subtitle1" fontWeight={600}>Setup Assistant</Typography>
        <IconButton size="small" onClick={() => setOpen(false)} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "#F2F2F7" }}>
        {messages.map((msg) => (
          <Box key={msg.id} sx={{ display: "flex", justifyContent: msg.from === "user" ? "flex-end" : "flex-start", mb: 1.5 }}>
            <Paper
              elevation={0}
              sx={{
                maxWidth: "85%",
                p: 1.5,
                borderRadius: 2,
                bgcolor: msg.from === "user" ? "#007AFF" : "#FFFFFF",
                color: msg.from === "user" ? "#FFFFFF" : "#000000",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <Typography variant="body2">{renderText(msg.text)}</Typography>
            </Paper>
          </Box>
        ))}
        <div ref={endRef} />
      </Box>

      {current.buttons && current.buttons.length > 0 && (
        <Box sx={{ p: 1.5, display: "flex", flexWrap: "wrap", gap: 1, bgcolor: "#FFFFFF", borderTop: "1px solid rgba(60,60,67,0.12)" }}>
          {current.buttons.map((b) => (
            <Button key={b.label} variant="outlined" size="small" onClick={() => handleButton(b.next, b.label)}>
              {b.label}
            </Button>
          ))}
        </Box>
      )}

      {(step === "pasteNow" || step === "haveKey" || step === "done") && (
        <Box sx={{ p: 1.5, borderTop: "1px solid rgba(60,60,67,0.12)", bgcolor: "#FFFFFF" }}>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onSend();
                }
              }}
              placeholder="Paste your Gemini key here…"
            />
            <Button variant="contained" onClick={onSend} disabled={!draft.trim()} sx={{ bgcolor: "#007AFF" }}>
              Save
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
