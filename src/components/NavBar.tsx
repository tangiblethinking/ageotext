"use client";

import { useState, useEffect } from "react";
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

import { readStoredApiKey, saveApiKey, deleteApiKey, isPlausibleApiKey } from "@/lib/api-key-store";

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const saved = readStoredApiKey();
    setHasKey(!!saved);
    if (saved) setKeyInput(saved);
  }, []);

  const handleOpen = () => {
    const saved = readStoredApiKey();
    setKeyInput(saved || "");
    setVerified(false);
    setError("");
    setOpen(true);
  };

  const handleVerify = async () => {
    const trimmed = keyInput.trim();
    if (!isPlausibleApiKey(trimmed)) {
      setError("Enter a valid Gemini API key");
      return;
    }
    setVerifying(true);
    setError("");
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
      } else {
        setError(data.error || "Key rejected");
      }
    } catch {
      setError("Network error during verification");
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

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid rgba(60,60,67,0.12)",
          color: "#000",
          zIndex: 1200,
        }}
      >
        <Toolbar sx={{ minHeight: 56 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600, fontSize: "1.05rem" }}>
            AEO / GEO Guide
          </Typography>
          <Button
            onClick={handleOpen}
            startIcon={<KeyIcon />}
            variant={hasKey ? "contained" : "outlined"}
            size="small"
            sx={{
              textTransform: "none",
              borderRadius: 2,
              ...(hasKey && { bgcolor: "#007AFF", "&:hover": { bgcolor: "#0051D5" } }),
            }}
          >
            API Key{hasKey ? "" : " (required)"}
          </Button>
        </Toolbar>
      </AppBar>
      {/* Spacer so content is not hidden under fixed bar */}
      <Box sx={{ height: 56 }} />

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>API keys</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Gemini key for the guide assistant. Stored only in this browser — never sent to our servers except when calling Gemini.
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight={600}>
                Gemini key
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Guide assistant: answers from the AEO/GEO guide
              </Typography>
            </Box>
            <Chip label="Required for Chat" size="small" color="warning" variant="outlined" />
          </Box>

          <TextField
            fullWidth
            type={showKey ? "text" : "password"}
            value={keyInput}
            onChange={(e) => {
              setKeyInput(e.target.value);
              setVerified(false);
              setError("");
            }}
            placeholder="AIza… (AI Studio / Generative Language)"
            size="small"
            sx={{ mt: 1, mb: 1 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowKey((s) => !s)}
                    edge="end"
                    aria-label={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {error && (
            <Typography variant="caption" color="error" sx={{ display: "block", mb: 1 }}>
              {error}
            </Typography>
          )}
          {verified && (
            <Typography variant="caption" color="success.main" sx={{ display: "block", mb: 1 }}>
              Key verified successfully
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Button
              onClick={handleVerify}
              disabled={verifying || !keyInput.trim()}
              variant="outlined"
              size="small"
            >
              {verifying ? "Verifying…" : "Verify"}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!verified || !keyInput.trim()}
              variant="contained"
              size="small"
              sx={{ bgcolor: "#007AFF", "&:hover": { bgcolor: "#0051D5" } }}
            >
              Save
            </Button>
            {hasKey && (
              <Button onClick={handleClear} color="error" size="small">
                Clear
              </Button>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
