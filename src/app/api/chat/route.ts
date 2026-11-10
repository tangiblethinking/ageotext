import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { geminiKeys } from "@/lib/keys";
import { retrieveRelevantChunks } from "@/lib/content";

const MODEL_PREFERENCE = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.6-flash"];
const limitedModels = new Map<string, number>();
const limitedKeys = new Map<string, number>();

function isLimited(id: string, map: Map<string, number>): boolean {
  const until = map.get(id);
  if (!until) return false;
  if (Date.now() > until) { map.delete(id); return false; }
  return true;
}
function markLimited(id: string, map: Map<string, number>, durationMs = 60000) {
  map.set(id, Date.now() + durationMs);
}
function getHealthyKey() {
  return geminiKeys.find((k) => k.secret && !k.secret.includes("PASTE_") && !k.secret.includes("YOUR_") && !isLimited(k.id, limitedKeys));
}
function getHealthyModel() {
  return MODEL_PREFERENCE.find((m) => !isLimited(m, limitedModels)) || MODEL_PREFERENCE[0];
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }
    const chunks = retrieveRelevantChunks(message, 6);
    const context = chunks.map((c) => `## ${c.heading} (${c.section})\n${c.text}`).join("\n\n");
    const systemInstruction = `You are a precise assistant for the AEO/GEO Semantic Architecture Optimization Guide. Answer ONLY using the provided context. Focus on AEO/GEO heading tags, semantic hierarchy, span resolution, PLP/PDP/Editorial structures, and copy tagging. Cite the section used. If outside the guide, say so.`;
    const prompt = `Context:\n${context}\n\nUser: ${message}`;
    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
      const key = getHealthyKey();
      if (!key) return NextResponse.json({ error: "No valid API key configured. Paste your Gemini key in src/lib/keys.ts and redeploy." }, { status: 503 });
      const model = getHealthyModel();
      try {
        const ai = new GoogleGenAI({ apiKey: key.secret });
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction, temperature: 0.3, maxOutputTokens: 1024 },
        });
        return NextResponse.json({
          answer: response.text || "No response.",
          sources: chunks.map((c) => ({ heading: c.heading, section: c.section })),
          modelUsed: model,
          keyUsed: key.id,
        });
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (err?.status === 429 || lastError.toLowerCase().includes("rate") || lastError.toLowerCase().includes("quota")) {
          markLimited(model, limitedModels, 90000);
          markLimited(key.id, limitedKeys, 60000);
          continue;
        }
        break;
      }
    }
    return NextResponse.json({ error: "Unable to respond. " + lastError }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
