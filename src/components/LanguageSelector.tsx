"use client";

import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import TranslateIcon from "@mui/icons-material/Translate";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { LANGUAGES, type LanguageCode } from "@/lib/i18n/languages";

/** Above the sticky nav (1500) and the design overlay (1400). */
export const NAV_POPUP_Z_INDEX = 1600;

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);

  const choose = (code: LanguageCode) => {
    setLanguage(code);
    setAnchor(null);
  };

  return (
    <>
      <Tooltip title={t("languageSelector")}>
        <IconButton
          id="language-menu-button"
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={t("languageSelector")}
          aria-controls={anchor ? "language-menu" : undefined}
          aria-haspopup="true"
          aria-expanded={anchor ? "true" : undefined}
          size="medium"
          sx={{ flexShrink: 0, color: "rgba(0,0,0,0.72)", width: 40, height: 40 }}
        >
          <TranslateIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu
        id="language-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        MenuListProps={{ "aria-labelledby": "language-menu-button" }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ zIndex: NAV_POPUP_Z_INDEX }}
      >
        {LANGUAGES.map((lang) => (
          <MenuItem
            key={lang.code}
            lang={lang.code}
            selected={lang.code === language}
            aria-current={lang.code === language ? "true" : undefined}
            onClick={() => choose(lang.code)}
          >
            {lang.nativeName}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
