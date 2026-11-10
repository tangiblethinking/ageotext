import { NextRequest, NextResponse } from "next/server";
import { geminiKeys } from "@/lib/keys";
import { retrieveRelevantChunks } from "@/lib/content";

const MODELS = ["gemini-3.5-flash-lite", "gemini-3.8-flash", "gemini-2.5-flash-lite"];

async function tryGenerate(key: string, model: string, prompt: string, system: string) {
  // Method 1: x-goog-api-key header
  const url1 = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let res = await fetch(url1, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
  });
  let data = await res.json();
  if (res.ok) return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "", method: "header" };

  // Method 2: ?key= query parameter
  const url2 = `${url1}?key=${encodeURIComponent(key)}`;
  res = await fetch(url2, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
  });
  data = await res.json();
  if (res.ok) return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "", method: "query" };

  const err: any = new Error(data?.error?.message || `HTTP ${res.status}`);
  err.status = res.status;
  err.raw = data;
  throw err;
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const keyObj = geminiKeys.find((k) => k.secret && k.secret.trim().length > 10);
    if (!keyObj) {
      return NextResponse.json({ error: "No key in src/lib/keys.ts" }, { status: 503 });
    }

    const chunks = retrieveRelevantChunks(message, 5);
    const context = chunks.map((c) => `## ${c.heading}\n${c.text}`).join("\n\n");
    const system = "You are a precise assistant for the AEO/GEO Semantic Architecture Optimization Guide. Answer ONLY from the provided context. Cite the section. If the answer is not in the context, say so.";
    const prompt = `Context:\n${context}\n\nQuestion: ${message}`;

    let lastError = "";
    for (const model of MODELS) {
      try {
        const result = await tryGenerate(keyObj.secret, model, prompt, system);
        if (result.text) {
          return NextResponse.json({
            answer: result.text,
            sources: chunks.map((c) => ({ heading: c.heading, section: c.section })),
            modelUsed: model,
            method: result.method,
            keyPrefix: keyObj.secret.slice(0, 6),
          });
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (err?.status === 401) break;
      }
    }

    return NextResponse.json({
      error: lastError || "No model responded",
      keyPrefix: keyObj.secret.slice(0, 6),
      keyLength: keyObj.secret.length,
    }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
