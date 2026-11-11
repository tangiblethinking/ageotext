"use client";

import { useState, useEffect, useCallback } from "react";
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
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

import { readStoredApiKey, saveApiKey, deleteApiKey, isPlausibleApiKey } from "@/lib/api-key-store";

type DesignId = "current-h" | "future-h" | "font-styles";

interface DesignLink {
  id: DesignId;
  label: string;
  hash: string;
  src: string;
}

/** Design reference pages served from /public/designs, opened in an iframe overlay. */
const DESIGNS: DesignLink[] = [
  { id: "current-h", label: "Current H Design", hash: "#design-current-h", src: "/designs/current-h-design.html" },
  { id: "future-h", label: "Future H Design", hash: "#design-future-h", src: "/designs/future-h-design.html" },
  { id: "font-styles", label: "Current Font Styles", hash: "#design-font-styles", src: "/designs/current-font-styles.html" },
];

const designFromHash = (hash: string) => DESIGNS.find((d) => d.hash === hash) ?? null;

/** Sits above SupportBot (FAB + panel use zIndex 1300). */
const DESIGN_DIALOG_Z_INDEX = 1400;

export default function NavBar() {
  const [open, setOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState("");

  const theme = useTheme();
  const isXs = useMediaQuery(theme.breakpoints.down("sm"));
  // Design open in the overlay (drives the iframe src) and the last one shown
  // (keeps the header label stable during the close transition).
  const [designId, setDesignId] = useState<DesignId | null>(null);
  const [shownDesignId, setShownDesignId] = useState<DesignId | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const activeDesign = DESIGNS.find((d) => d.id === designId) ?? null;
  const shownDesign = DESIGNS.find((d) => d.id === shownDesignId) ?? null;

  const openDesign = useCallback((design: DesignLink) => {
    setDesignId(design.id);
    setShownDesignId(design.id);
  }, []);

  const handleDesignClick = (design: DesignLink) => {
    setMenuAnchor(null);
    if (window.location.hash !== design.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${design.hash}`);
    }
    openDesign(design);
  };

  const closeDesign = () => {
    setDesignId(null);
    if (designFromHash(window.location.hash)) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
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
        position="sticky"
        elevation={0}
        sx={{
          top: 0,
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid rgba(60,60,67,0.12)",
          color: "#000",
          zIndex: 1200,
        }}
      >
        <Toolbar sx={{ minHeight: 56, gap: { xs: 1, sm: 1.5 } }}>
          <Typography
            variant="h6"
            component="div"
            noWrap
            sx={{ flexGrow: 1, minWidth: 0, fontWeight: 600, fontSize: "1.05rem" }}
          >
            AEO / GEO Guide
          </Typography>

          {/* sm and up: inline design links */}
          <Box
            component="nav"
            aria-label="Design references"
            sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 0.5, flexShrink: 0 }}
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
                  size="small"
                  sx={{
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    borderRadius: 2,
                    color: isActive ? "#007AFF" : "rgba(0,0,0,0.78)",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: { sm: "0.8rem", md: "0.875rem" },
                    px: { sm: 0.75, md: 1.25 },
                    minWidth: 0,
                    bgcolor: isActive ? "rgba(0,122,255,0.08)" : "transparent",
                    "&:hover": { bgcolor: "rgba(0,122,255,0.08)" },
                  }}
                >
                  {design.label}
                </Button>
              );
            })}
          </Box>

          {/* xs: collapsed "Designs" menu */}
          <Box component="nav" aria-label="Design references" sx={{ display: { xs: "block", sm: "none" }, flexShrink: 0 }}>
            <Button
              id="designs-menu-button"
              onClick={(e) => setMenuAnchor(e.currentTarget)}
              aria-controls={menuAnchor ? "designs-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={menuAnchor ? "true" : undefined}
              endIcon={<ExpandMoreIcon />}
              size="small"
              sx={{ textTransform: "none", borderRadius: 2, color: "rgba(0,0,0,0.78)", whiteSpace: "nowrap", minWidth: 0 }}
            >
              Designs
            </Button>
            <Menu
              id="designs-menu"
              anchorEl={menuAnchor}
              open={Boolean(menuAnchor)}
              onClose={() => setMenuAnchor(null)}
              MenuListProps={{ "aria-labelledby": "designs-menu-button" }}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
            >
              {DESIGNS.map((design) => (
                <MenuItem
                  key={design.id}
                  selected={design.id === designId}
                  aria-current={design.id === designId ? "page" : undefined}
                  onClick={() => handleDesignClick(design)}
                >
                  {design.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>

          <Button
            onClick={handleOpen}
            startIcon={<KeyIcon />}
            variant={hasKey ? "contained" : "outlined"}
            size="small"
            aria-label={hasKey ? "API Key" : "API Key (required)"}
            sx={{
              textTransform: "none",
              borderRadius: 2,
              whiteSpace: "nowrap",
              flexShrink: 0,
              ...(hasKey && { bgcolor: "#007AFF", "&:hover": { bgcolor: "#0051D5" } }),
            }}
          >
            API Key
            {!hasKey && (
              <Box component="span" sx={{ display: { xs: "none", md: "inline" } }}>
                &nbsp;(required)
              </Box>
            )}
          </Button>
        </Toolbar>
      </AppBar>

      <Dialog
        open={Boolean(activeDesign)}
        onClose={closeDesign}
        fullScreen={isXs}
        maxWidth={false}
        aria-labelledby="design-dialog-title"
        TransitionProps={{ onExited: () => setShownDesignId(null) }}
        sx={{ zIndex: DESIGN_DIALOG_Z_INDEX }}
        PaperProps={{
          sx: isXs
            ? { display: "flex", flexDirection: "column" }
            : {
                display: "flex",
                flexDirection: "column",
                width: "calc(100vw - 32px)",
                height: "calc(100vh - 32px)",
                maxWidth: "none",
                maxHeight: "none",
                m: 2,
                borderRadius: 2,
                overflow: "hidden",
              },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            pl: 2,
            pr: 1,
            minHeight: 52,
            borderBottom: "1px solid rgba(60,60,67,0.12)",
            flexShrink: 0,
          }}
        >
          <Typography id="design-dialog-title" component="div" role="heading" aria-level={2} noWrap sx={{ flexGrow: 1, minWidth: 0, m: 0, p: 0, border: 0, fontWeight: 600, fontSize: "1rem" }}>
            {shownDesign?.label}
          </Typography>
          <IconButton onClick={closeDesign} aria-label="Close design overlay" edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, position: "relative", bgcolor: "#f8fafc" }}>
          {activeDesign && (
            <iframe
              key={activeDesign.id}
              src={activeDesign.src}
              title={activeDesign.label}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, display: "block" }}
            />
          )}
        </Box>
      </Dialog>

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
