# ageotext

AEO/GEO Semantic Architecture Optimization Guide with an on-page RAG chatbot powered by Gemini.

## Features
- Full guide content rendered with preserved semantic hierarchy and similar visual layout
- Always-visible top navigation bar with API Key button
- Modal to enter, verify, and save a Gemini API key (browser-only / localStorage)
- Floating Action Button (FAB) chat that expands, restores, and minimizes
- Chat is gated: requires a saved Gemini API key
- Sticky copy icons on responses
- Wrapping text in input and responses
- Thinking animation
- Automatic model selection among free-tier Flash models with rate-limit fallback
- Content indexed for retrieval; answers stay inside the guide

## API Key
Click **API Key** in the top navigation bar. The key is stored only in your browser (localStorage) and is sent to Gemini only when you ask a question. It is never committed to the repository or stored on the server.

## Deploy
Connect the repo to Vercel. No server-side secrets or environment variables are required for the Gemini key.
