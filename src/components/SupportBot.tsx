"use client";

import { useState, useEffect, useRef } from "react";
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
    return (<>{before}<a href={url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary underline underline-offset-2">Open Google AI Studio API keys</a>{after}</>);
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => { setMode("default"); if (messages.length === 0 && hasKey) pushBot(TEXTS.liveChatReady); else if (messages.length === 0) pushBot(STEPS.welcome.text); }}
        className="fixed bottom-4 right-4 z-50 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 sm:size-14"
        aria-label="Open AEO/GEO assistant"
      >
        <svg className="size-5 sm:size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
      </button>
    );
  }

  const current = STEPS[step];
  const showButtons = current.buttons && current.buttons.length > 0 && step !== "done" && !hasKey;
  const showInput = hasKey || step === "pasteNow" || step === "haveKey" || step === "done";

  return (
    <div
      className={`fixed right-4 z-50 flex w-[min(100vw-2rem,22rem)] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl sm:w-96 ${
        isExpanded ? "bottom-4 top-4 h-[calc(100dvh-2rem)]" : "bottom-4 h-[min(32rem,calc(100dvh-2rem))]"
      }`}
    >
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-neutral-800 bg-black px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="relative size-10 sm:size-12 shrink-0">
            <video
              src="/mascot/supportbot-mascot-original.mp4"
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 size-full object-contain pointer-events-none"
            />
          </div>
          <p className="text-sm font-medium text-white">AEO/GEO Assistant</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="h-8 w-8 p-0 text-white hover:bg-neutral-800 rounded"
            onClick={() => setMode(isExpanded ? "default" : "expanded")}
            aria-label={isExpanded ? "Collapse" : "Expand chat to full height"}
          >
            {isExpanded ? "↓" : "↑"}
          </button>
          <button
            type="button"
            className="h-8 w-8 p-0 text-white hover:bg-neutral-800 rounded"
            onClick={() => setMode("closed")}
            aria-label="Minimize"
          >
            ×
          </button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-3 text-sm bg-muted/30">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 relative ${msg.from === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
              {msg.from === "bot" && (
                <button
                  type="button"
                  className="absolute top-1 right-1 size-6 flex items-center justify-center rounded bg-background/50 text-muted-foreground hover:bg-background"
                  onClick={() => copyText(msg.id, msg.text)}
                  aria-label="Copy message"
                >
                  {copiedId === msg.id ? "✓" : "⎘"}
                </button>
              )}
              <div className="whitespace-pre-wrap break-words pr-6">{renderText(msg.text)}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-1 text-xs opacity-70">Sources: {msg.sources.map((s) => s.heading).join(" · ")}</div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-muted px-3 py-2 flex gap-1">
              <span className="size-2 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-foreground/60 [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-foreground/60" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {showButtons && (
        <div className="flex flex-wrap gap-2 border-t border-border p-3 bg-background">
          {current.buttons!.map((b) => (
            <button
              key={b.label}
              type="button"
              className="h-8 rounded-md border border-border px-3 text-sm hover:bg-accent"
              onClick={() => handleButton(b.next, b.label)}
            >
              {b.label}
            </button>
          ))}
        </div>
      )}

      {showInput && (
        <div className="border-t border-border p-3 bg-background">
          <div className="flex gap-2">
            <textarea
              className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              placeholder={hasKey ? "Ask about AEO/GEO..." : "Paste your Gemini key here…"}
              disabled={thinking}
            />
            <button
              type="button"
              onClick={onSend}
              disabled={thinking || !draft.trim()}
              className="self-end rounded-md bg-primary px-3 py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              aria-label="Send"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
