import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { geminiKeys } from "@/lib/keys";
import { retrieveRelevantChunks } from "@/lib/content";

const MODEL_PREFERENCE = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];
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
  // Accept any key whose secret is a non-empty string longer than 10 chars
  return geminiKeys.find((k) => typeof k.secret === "string" && k.secret.trim().length > 10 && !isLimited(k.id, limitedKeys));
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

    const key = getHealthyKey();
    if (!key) {
      const debug = {
        keysLoaded: geminiKeys.length,
        secrets: geminiKeys.map((k) => ({
          id: k.id,
          secretLength: (k.secret || "").length,
          secretPrefix: (k.secret || "").slice(0, 4),
        })),
      };
      return NextResponse.json({
        error: "No usable API key found on the server.",
        debug,
      }, { status: 503 });
    }

    const chunks = retrieveRelevantChunks(message, 6);
    const context = chunks.map((c) => `## ${c.heading} (${c.section})\n${c.text}`).join("\n\n");
    const systemInstruction = `You are a precise assistant for the AEO/GEO Semantic Architecture Optimization Guide. Answer ONLY using the provided context. Focus on AEO/GEO heading tags, semantic hierarchy, span resolution, PLP/PDP/Editorial structures, and copy tagging. Cite the section used. If outside the guide, say so.`;
    const prompt = `Context:\n${context}\n\nUser: ${message}`;

    let lastError = "";
    for (let attempt = 0; attempt < 3; attempt++) {
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
