"use client";

import { useState, useRef, useEffect } from "react";

type Message = { role: "user" | "assistant"; content: string; sources?: { heading: string; section: string }[] };
type PanelMode = "closed" | "default" | "expanded";

export default function ChatFAB() {
  const [mode, setMode] = useState<PanelMode>("closed");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setThinking(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.answer || data.error || "Error", sources: data.sources }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error." }]);
    } finally { setThinking(false); }
  };

  const copy = (text: string, btn: HTMLButtonElement) => {
    navigator.clipboard.writeText(text);
    const orig = btn.textContent;
    btn.textContent = "Copied";
    setTimeout(() => { btn.textContent = orig; }, 1200);
  };

  if (mode === "closed") {
    return (
      <button onClick={() => setMode("default")} className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center text-2xl hover:bg-blue-700" aria-label="Open assistant">💬</button>
    );
  }

  const height = mode === "expanded" ? "h-screen" : "h-[70vh]";

  return (
    <div className={`fixed bottom-0 right-0 z-50 w-full sm:w-96 ${height} bg-white border border-slate-200 shadow-2xl flex flex-col rounded-t-xl sm:rounded-xl sm:bottom-6 sm:right-6 overflow-hidden`}>
      <div className="flex items-center justify-between px-4 py-3 border-b bg-slate-50">
        <span className="font-semibold text-sm text-slate-800">AEO/GEO Assistant</span>
        <div className="flex gap-1">
          {mode === "default" && <button onClick={() => setMode("expanded")} className="p-1 text-slate-500" title="Expand">⛶</button>}
          {mode === "expanded" && <button onClick={() => setMode("default")} className="p-1 text-slate-500" title="Restore">⧉</button>}
          <button onClick={() => setMode("closed")} className="p-1 text-slate-500" title="Minimize">✕</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.length === 0 && <p className="text-sm text-slate-500 text-center py-8">Ask about heading hierarchy, spans, PLP/PDP, or tokens.</p>}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`relative max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words ${msg.role === "user" ? "bg-blue-600 text-white" : "bg-white border text-slate-800"}`}>
              {msg.role === "assistant" && (
                <button onClick={(e) => copy(msg.content, e.currentTarget)} className="absolute -top-1 -right-1 w-6 h-6 bg-slate-100 border rounded-full text-xs" title="Copy">📋</button>
              )}
              {msg.content}
              {msg.sources && <div className="mt-1 text-xs text-slate-500">Sources: {msg.sources.map(s => s.heading).join(", ")}</div>}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-2xl px-3 py-2 flex gap-1">
              <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" /><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:"0.15s"}} /><span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:"0.3s"}} />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Ask about AEO/GEO..." className="flex-1 resize-none rounded-xl border px-3 py-2 text-sm min-h-[40px] max-h-28" rows={1} />
          <button onClick={send} disabled={thinking || !input.trim()} className="self-end px-3 py-2 bg-blue-600 text-white rounded-xl text-sm disabled:opacity-50">Send</button>
        </div>
      </div>
    </div>
  );
}
