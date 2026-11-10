# ageotext

AEO/GEO Semantic Architecture Optimization Guide with an on-page RAG chatbot powered by Gemini.

## Features
- Full guide content rendered with preserved semantic hierarchy and similar visual layout
- Floating Action Button (FAB) chat that expands, restores, and minimizes
- Sticky copy icons on responses
- Wrapping text in input and responses
- Thinking animation
- Gemini key bank in `src/lib/keys.ts` (server-only)
- Automatic model selection among free-tier Flash models with rate-limit fallback
- Content indexed for retrieval; answers stay inside the guide

## Keys
Edit `src/lib/keys.ts` directly with your Gemini API keys from Google AI Studio. Commit and redeploy.

## Deploy
Connect the repo to Vercel. No extra configuration required beyond the keys file.
