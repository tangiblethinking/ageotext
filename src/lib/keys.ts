// Server-only Gemini API keys.
// Edit this file directly, then commit and redeploy.
// Never import this file from client components.

import 'server-only';

export interface GeminiKey {
  id: string;
  secret: string;
  notes?: string;
}

export const geminiKeys: GeminiKey[] = [
  {
    id: "key-1",
    secret: "YOUR_GEMINI_API_KEY_HERE",
    notes: "Primary key — replace with real key from Google AI Studio",
  },
  {
    id: "key-2",
    secret: "YOUR_SECOND_GEMINI_API_KEY_HERE",
    notes: "Backup key",
  },
  // Add more keys as needed. Format:
  // { id: "key-3", secret: "AIza...", notes: "optional" },
];
