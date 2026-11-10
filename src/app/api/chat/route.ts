import { NextRequest, NextResponse } from "next/server";
import { retrieveRelevantChunks } from "@/lib/content";

const MODELS = ["gemini-2.0-flash", "gemini-2.5-flash-lite", "gemini-1.5-flash"];

async function tryGenerate(key: string, model: string, prompt: string, system: string) {
  const url1 = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  let res = await fetch(url1, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });
  let data = await res.json();
  if (res.ok) return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "", method: "header" };

  const url2 = `${url1}?key=${encodeURIComponent(key)}`;
  res = await fetch(url2, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: system }] },
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
  });
  data = await res.json();
  if (res.ok) return { text: data?.candidates?.[0]?.content?.parts?.[0]?.text || "", method: "query" };

  const err: any = new Error(data?.error?.message || `HTTP ${res.status}`);
  err.status = res.status;
  throw err;
}

export async function POST(req: NextRequest) {
  try {
    const { message, apiKey } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 10) {
      return NextResponse.json({ error: "Valid Gemini API key required" }, { status: 401 });
    }

    const chunks = retrieveRelevantChunks(message, 6);
    const context = chunks.map((c) => `## ${c.heading} (${c.section})\n${c.text}`).join("\n\n");
    const system = "You are a precise assistant for the AEO/GEO Semantic Architecture Optimization Guide. Answer fully from the provided context. Include all relevant details and examples. Cite the sections used. If the answer is not in the context, say so.";
    const prompt = `Context:\n${context}\n\nQuestion: ${message}`;

    let lastError = "";
    for (const model of MODELS) {
      try {
        const result = await tryGenerate(apiKey.trim(), model, prompt, system);
        if (result.text) {
          return NextResponse.json({
            answer: result.text,
            sources: chunks.map((c) => ({ heading: c.heading, section: c.section })),
            modelUsed: model,
            method: result.method,
          });
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (err?.status === 401) break;
      }
    }

    return NextResponse.json({ error: lastError || "No model responded" }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
