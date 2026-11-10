import { NextRequest, NextResponse } from "next/server";
import { retrieveRelevantChunks } from "@/lib/content";

const FREE_TIER_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.7-flash",
];

function statusError(status: number): string {
  if (status === 400) return "The request was rejected. Check the API key and try again.";
  if (status === 401 || status === 403) return "The Google API key was rejected. Create a free key at aistudio.google.com/apikey.";
  if (status === 404) return "That Gemini model is not available on this key. Try another free Flash model or create a new key.";
  if (status === 429) return "Google free-tier rate limit hit. Wait a minute and run again (Flash-Lite has higher free RPM).";
  if (status >= 500) return "The Gemini service is unavailable. Try again shortly.";
  return `The API returned an error (${status}).`;
}

async function tryGenerate(key: string, model: string, prompt: string, system: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const headers = { "Content-Type": "application/json", "x-goog-api-key": key };
  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: system }] },
    generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
  });

  let res = await fetch(url, { method: "POST", headers, body });
  if (res.ok) {
    const data = await res.json();
    return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "", model };
  }

  // Retry once on 429/5xx
  if (res.status === 429 || res.status >= 500) {
    await new Promise((r) => setTimeout(r, 1200));
    res = await fetch(url, { method: "POST", headers, body });
    if (res.ok) {
      const data = await res.json();
      return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "", model };
    }
  }

  const err: any = new Error(statusError(res.status));
  err.status = res.status;
  throw err;
}

export async function POST(req: NextRequest) {
  try {
    const { message, apiKey } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 20) {
      return NextResponse.json({ error: "Valid Gemini API key required" }, { status: 401 });
    }

    const chunks = retrieveRelevantChunks(message, 6);
    const context = chunks.map((c) => `## ${c.heading} (${c.section})\n${c.text}`).join("\n\n");
    const system = "You are a precise assistant for the AEO/GEO Semantic Architecture Optimization Guide. Answer fully from the provided context. Include all relevant details and examples. Cite the sections used. If the answer is not in the context, say so.";
    const prompt = `Context:\n${context}\n\nQuestion: ${message}`;

    let lastError = "";
    for (const model of FREE_TIER_MODELS) {
      try {
        const result = await tryGenerate(apiKey.trim(), model, prompt, system);
        if (result.text) {
          return NextResponse.json({
            answer: result.text,
            sources: chunks.map((c) => ({ heading: c.heading, section: c.section })),
            modelUsed: result.model,
          });
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (err?.status === 401 || err?.status === 403) break;
      }
    }

    return NextResponse.json({ error: lastError || "No model responded" }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
