"use client";

import { useState, useRef, useEffect } from "react";
import Fab from "@mui/material/Fab";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SendIcon from "@mui/icons-material/Send";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: { heading: string; section: string }[];
};

type PanelMode = "closed" | "default" | "expanded";

export default function ChatFAB() {
  const [mode, setMode] = useState<PanelMode>("closed");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const send = async () => {
    const text = input.trim();
    if (!text || thinking) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setThinking(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: data.answer || data.error || "Unable to respond.",
          sources: data.sources,
        },
      ]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setThinking(false);
    }
  };

  const copyText = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (mode === "closed") {
    return (
      <Fab
        onClick={() => setMode("default")}
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 1300,
          bgcolor: "#007AFF",
          color: "#fff",
          "&:hover": { bgcolor: "#0051D5" },
        }}
        aria-label="Open AEO/GEO assistant"
      >
        <ChatBubbleOutlineIcon />
      </Fab>
    );
  }

  const isExpanded = mode === "expanded";

  return (
    <Paper
      elevation={8}
      sx={{
        position: "fixed",
        bottom: isExpanded ? 0 : 24,
        right: isExpanded ? 0 : 24,
        zIndex: 1300,
        width: isExpanded ? "100vw" : { xs: "100vw", sm: 400 },
        height: isExpanded ? "100vh" : "70vh",
        display: "flex",
        flexDirection: "column",
        borderRadius: isExpanded ? 0 : 3,
        overflow: "hidden",
        bgcolor: "#FFFFFF",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: "1px solid rgba(60,60,67,0.12)", bgcolor: "#F2F2F7" }}>
        <Typography variant="subtitle1" fontWeight={600}>
          AEO/GEO Guide Assistant
        </Typography>
        <Box>
          {mode === "default" && (
            <IconButton size="small" onClick={() => setMode("expanded")} aria-label="Expand">
              <FullscreenIcon fontSize="small" />
            </IconButton>
          )}
          {mode === "expanded" && (
            <IconButton size="small" onClick={() => setMode("default")} aria-label="Restore">
              <FullscreenExitIcon fontSize="small" />
            </IconButton>
          )}
          <IconButton size="small" onClick={() => setMode("closed")} aria-label="Minimize">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "#F2F2F7" }}>
        {messages.length === 0 && (
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
            Ask about heading hierarchy, span resolution, PLP/PDP structures, or typography tokens.
          </Typography>
        )}
        {messages.map((msg, i) => (
          <Box key={i} sx={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", mb: 1.5 }}>
            <Paper
              elevation={0}
              sx={{
                maxWidth: "85%",
                p: 1.5,
                borderRadius: 2,
                bgcolor: msg.role === "user" ? "#007AFF" : "#FFFFFF",
                color: msg.role === "user" ? "#FFFFFF" : "#000000",
                position: "relative",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {msg.role === "assistant" && (
                <IconButton
                  size="small"
                  onClick={() => copyText(msg.content)}
                  sx={{ position: "sticky", top: 4, float: "right", ml: 1, bgcolor: "rgba(0,0,0,0.05)" }}
                  aria-label="Copy response"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              )}
              <Typography variant="body2" component="div">{msg.content}</Typography>
              {msg.sources && msg.sources.length > 0 && (
                <Typography variant="caption" sx={{ display: "block", mt: 1, opacity: 0.7 }}>
                  Sources: {msg.sources.map((s) => s.heading).join(" · ")}
                </Typography>
              )}
            </Paper>
          </Box>
        ))}
        {thinking && (
          <Box sx={{ display: "flex", justifyContent: "flex-start", mb: 1.5 }}>
            <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: "#FFFFFF", display: "flex", gap: 0.5 }}>
              {[0, 0.16, 0.32].map((delay) => (
                <Box
                  key={delay}
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: "#8E8E93",
                    animation: "bounce 1.4s infinite ease-in-out both",
                    animationDelay: `${delay}s`,
                  }}
                />
              ))}
            </Paper>
          </Box>
        )}
        <div ref={endRef} />
      </Box>

      <Box sx={{ p: 1.5, borderTop: "1px solid rgba(60,60,67,0.12)", bgcolor: "#FFFFFF" }}>
        <Box sx={{ display: "flex", gap: 1 }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about AEO/GEO..."
            size="small"
          />
          <IconButton
            onClick={send}
            disabled={thinking || !input.trim()}
            sx={{ bgcolor: "#007AFF", color: "#fff", "&:hover": { bgcolor: "#0051D5" }, alignSelf: "flex-end" }}
            aria-label="Send"
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Box>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </Paper>
  );
}
