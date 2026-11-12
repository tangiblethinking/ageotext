import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { contentChunks } from "@/lib/content";
import { runChatPipeline, sanitizeHistory, type GenerateFn } from "@/lib/chat-pipeline";

// Up to four model calls per message (understand, write, review, plus one refusal retry).
export const maxDuration = 60;

/** English names for the UI languages, used in the "Respond in …" instruction. */
const RESPONSE_LANGUAGES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  zh: "Simplified Chinese",
  ja: "Japanese",
  ko: "Korean",
  th: "Thai",
};

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

/** Thrown when no model produced the written answer; carries the last API error. */
class NoModelError extends Error {}

/**
 * The guide is read from public/guide-body.html at runtime so answers stay in sync
 * with the page. next.config.ts traces the file into this function's bundle; the
 * public URL and the summary chunks are fallbacks.
 */
let cachedGuide: { html: string; at: number } | null = null;
const GUIDE_CACHE_MS = 5 * 60 * 1000;

async function loadGuideHtml(req: NextRequest): Promise<string> {
  if (cachedGuide && Date.now() - cachedGuide.at < GUIDE_CACHE_MS) return cachedGuide.html;
  let html = "";
  try {
    html = await readFile(path.join(process.cwd(), "public", "guide-body.html"), "utf8");
  } catch {
    try {
      const res = await fetch(new URL("/guide-body.html", req.url), { cache: "no-store" });
      if (res.ok) html = await res.text();
    } catch {
      /* use the summary chunks below */
    }
  }
  if (!html.trim()) {
    return contentChunks.map((c) => `<h2 id="${c.id}">${c.heading}</h2><p>${c.text}</p>`).join("\n");
  }
  cachedGuide = { html, at: Date.now() };
  return html;
}

/** Try the free-tier models in order (preferred first), with tryGenerate's 429/5xx retry. */
function makeGenerate(key: string): GenerateFn {
  return async (prompt, system, opts) => {
    const order = opts?.preferredModel
      ? [opts.preferredModel, ...FREE_TIER_MODELS.filter((m) => m !== opts.preferredModel)]
      : FREE_TIER_MODELS;
    const models = order.slice(0, opts?.maxModels ?? order.length);
    let lastError = "";
    for (const model of models) {
      try {
        const result = await tryGenerate(key, model, prompt, system);
        if (result.text && result.text.trim()) return result;
        lastError = lastError || "No model responded";
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (err?.status === 401 || err?.status === 403) break;
      }
    }
    throw new NoModelError(lastError || "No model responded");
  };
}

export async function POST(req: NextRequest) {
  try {
    const { message, apiKey, language, history } = await req.json();
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 20) {
      return NextResponse.json({ error: "Valid Gemini API key required" }, { status: 401 });
    }

    const responseLanguage = (typeof language === "string" && RESPONSE_LANGUAGES[language]) || RESPONSE_LANGUAGES.en;
    const guideHtml = await loadGuideHtml(req);

    try {
      const result = await runChatPipeline({
        message,
        history: sanitizeHistory(history),
        responseLanguage,
        guideHtml,
        generate: makeGenerate(apiKey.trim()),
      });
      return NextResponse.json(result);
    } catch (err: any) {
      if (err instanceof NoModelError) {
        return NextResponse.json({ error: err.message || "No model responded" }, { status: 503 });
      }
      throw err;
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
