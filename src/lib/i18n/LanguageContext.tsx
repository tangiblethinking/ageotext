"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGUAGES, DEFAULT_LANGUAGE, type LanguageCode } from "./languages";
import { translations, type TranslationKey } from "./translations";

export const LANGUAGE_STORAGE_KEY = "ageotext.lang";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKey) => string;
  /**
   * Whether the user has explicitly chosen a language (saved in `ageotext.lang`).
   * `null` until the provider has read localStorage on the client.
   */
  hasChosenLanguage: boolean | null;
};

const isLanguageCode = (value: unknown): value is LanguageCode =>
  typeof value === "string" && LANGUAGES.some((l) => l.code === value);

function readStoredLanguage(): LanguageCode | null {
  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguageCode(stored) ? stored : null;
  } catch {
    return null;
  }
}

function detectBrowserLanguage(): LanguageCode {
  const candidates = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const tag of candidates) {
    const code = tag.slice(0, 2).toLowerCase();
    if (isLanguageCode(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}

const translate = (language: LanguageCode, key: TranslationKey): string =>
  translations[language]?.[key] ?? translations.en[key] ?? key;

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Server render and first client render use English so hydration matches;
  // the real language is applied right after mount. Children are never unmounted.
  const [language, setLanguageState] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [hasChosenLanguage, setHasChosenLanguage] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = readStoredLanguage();
    setLanguageState(stored ?? detectBrowserLanguage());
    setHasChosenLanguage(Boolean(stored));
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    setHasChosenLanguage(true);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      /* storage unavailable (private mode); keep in memory */
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({ language, setLanguage, t: (key) => translate(language, key), hasChosenLanguage }),
    [language, setLanguage, hasChosenLanguage],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    return {
      language: DEFAULT_LANGUAGE,
      setLanguage: () => {},
      t: (key) => translate(DEFAULT_LANGUAGE, key),
      hasChosenLanguage: null,
    };
  }
  return ctx;
}
