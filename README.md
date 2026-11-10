# ageotext

AEO/GEO Semantic Architecture Optimization Guide with an on-page RAG chatbot powered by Gemini.

## Features
- Full guide content rendered with preserved semantic hierarchy and similar visual layout
- Always-visible top navigation bar with API Key button
- Single Floating Action Button (FAB) that handles both the guided Setup Assistant (identical flow to ATS-X2-prod) and the live RAG chat once a key is saved
- Chat is gated: requires a saved Gemini API key
- Sticky copy icons on responses
- Wrapping text in input and responses
- Thinking animation
- Automatic model selection among free-tier Flash models with rate-limit fallback
- Content indexed for retrieval; answers stay inside the guide
- Mascot video in the assistant header (from ATS-X2-prod)

## API Key
The Setup Assistant auto-opens if no key is saved and walks you through Google AI Studio step by step. You can also use the **API Key** button in the top bar. The key is stored only in your browser (localStorage under `ageotext.gemini-api-key`) and is sent to Gemini only when you ask a question. It is never committed to the repository or stored on the server.

## Deploy
Connect the repo to Vercel. No server-side secrets or environment variables are required for the Gemini key.
