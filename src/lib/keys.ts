// Server-only Gemini API keys.
// Edit this file directly, then commit and redeploy.
// Array pattern: duplicate entries to add more keys.
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
    secret: "AQ.Ab8RN6Ji2UtaysDSLrGy0v3henuX7pIoov7JmY2W3L-XIsEepA",
    notes: "Primary key",
  },
  // Duplicate the object above to add more keys:
  // {
  //   id: "key-2",
  //   secret: "AIza...",
  //   notes: "Backup",
  // },
];
