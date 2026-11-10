import { NextRequest, NextResponse } from "next/server";
import { geminiKeys } from "@/lib/keys";
import { retrieveRelevantChunks } from "@/lib/content";

const MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-3.8-flash",
  "gemini-3.6-flash",
  "gemini-2.5-flash-lite",
];

async function generate(key: string, model: string, prompt: string, system: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    const err: any = new Error(msg);
    err.status = res.status;
    err.raw = data;
    throw err;
  }
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const keyObj = geminiKeys.find((k) => k.secret && k.secret.trim().length > 10);
    if (!keyObj) {
      return NextResponse.json({ error: "No key configured in src/lib/keys.ts" }, { status: 503 });
    }

    const chunks = retrieveRelevantChunks(message, 5);
    const context = chunks.map((c) => `## ${c.heading}\n${c.text}`).join("\n\n");
    const system = "You are a precise assistant for the AEO/GEO Semantic Architecture Optimization Guide. Answer ONLY from the provided context. Cite the section. If the answer is not in the context, say so.";
    const prompt = `Context:\n${context}\n\nQuestion: ${message}`;

    let lastError = "";
    for (const model of MODELS) {
      try {
        const text = await generate(keyObj.secret, model, prompt, system);
        if (text) {
          return NextResponse.json({
            answer: text,
            sources: chunks.map((c) => ({ heading: c.heading, section: c.section })),
            modelUsed: model,
          });
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (err?.status === 401 || lastError.toLowerCase().includes("api key")) {
          // Auth failure — do not keep retrying other models
          break;
        }
        continue;
      }
    }

    return NextResponse.json({ error: lastError || "No model responded" }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
