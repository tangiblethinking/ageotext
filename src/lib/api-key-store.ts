export const API_KEY_STORAGE = "ageotext.gemini-api-key";

export function readStoredApiKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(API_KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function saveApiKey(key: string): void {
  window.localStorage.setItem(API_KEY_STORAGE, key.trim());
  window.dispatchEvent(new Event("ageotext-key-changed"));
}

export function deleteApiKey(): void {
  window.localStorage.removeItem(API_KEY_STORAGE);
  window.dispatchEvent(new Event("ageotext-key-changed"));
}

export function maskApiKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 8) return "••••";
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••${suffix}`;
}

/** Google AI Studio / Cloud keys typically start with AIza and are 30–50+ chars. */
export function isPlausibleApiKey(key: string): boolean {
  const trimmed = key.trim();
  if (trimmed.length < 20 || /\s/.test(trimmed)) return false;
  if (/^AIza[0-9A-Za-z_-]{20,}$/.test(trimmed)) return true;
  return trimmed.length >= 30 && !/^xai-/i.test(trimmed);
}
