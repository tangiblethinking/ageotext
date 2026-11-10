import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { geminiKeys } from "@/lib/keys";
import { retrieveRelevantChunks } from "@/lib/content";

const MODEL_PREFERENCE = [
  "gemini-3.5-flash",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];
const limitedModels = new Map<string, number>();
const limitedKeys = new Map<string, number>();

function isLimited(id: string, map: Map<string, number>): boolean {
  const until = map.get(id);
  if (!until) return false;
  if (Date.now() > until) {
    map.delete(id);
    return false;
  }
  return true;
}
function markLimited(id: string, map: Map<string, number>, durationMs = 60000) {
  map.set(id, Date.now() + durationMs);
}
function getHealthyKey() {
  return geminiKeys.find(
    (k) => typeof k.secret === "string" && k.secret.trim().length > 10 && !isLimited(k.id, limitedKeys)
  );
}
function getHealthyModel() {
  return MODEL_PREFERENCE.find((m) => !isLimited(m, limitedModels)) || MODEL_PREFERENCE[0];
}

async function callDirect(key: string, model: string, prompt: string, systemInstruction: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.raw = data;
    throw err;
  }
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text;
}

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const keyObj = getHealthyKey();
    if (!keyObj) {
      return NextResponse.json({
        error: "No usable API key found on the server.",
        debug: { keysLoaded: geminiKeys.length },
      }, { status: 503 });
    }

    const chunks = retrieveRelevantChunks(message, 6);
    const context = chunks.map((c) => `## ${c.heading} (${c.section})\n${c.text}`).join("\n\n");
    const systemInstruction = `You are a precise assistant for the AEO/GEO Semantic Architecture Optimization Guide. Answer ONLY using the provided context. Focus on AEO/GEO heading tags, semantic hierarchy, span resolution, PLP/PDP/Editorial structures, and copy tagging. Cite the section used. If outside the guide, say so.`;
    const prompt = `Context:\n${context}\n\nUser: ${message}`;

    let lastError = "";
    for (let attempt = 0; attempt < 4; attempt++) {
      const model = getHealthyModel();
      try {
        // Try SDK first
        const ai = new GoogleGenAI({ apiKey: keyObj.secret });
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: { systemInstruction, temperature: 0.3, maxOutputTokens: 1024 },
        });
        const text = response.text || "";
        if (text) {
          return NextResponse.json({
            answer: text,
            sources: chunks.map((c) => ({ heading: c.heading, section: c.section })),
            modelUsed: model,
            keyUsed: keyObj.id,
            method: "sdk",
          });
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        // On auth error, try direct fetch as fallback
        if (lastError.toLowerCase().includes("api key") || err?.status === 401 || err?.status === 400) {
          try {
            const text = await callDirect(keyObj.secret, model, prompt, systemInstruction);
            if (text) {
              return NextResponse.json({
                answer: text,
                sources: chunks.map((c) => ({ heading: c.heading, section: c.section })),
                modelUsed: model,
                keyUsed: keyObj.id,
                method: "direct",
              });
            }
          } catch (directErr: any) {
            lastError = directErr?.message || String(directErr);
          }
        }
        if (err?.status === 429 || lastError.toLowerCase().includes("rate") || lastError.toLowerCase().includes("quota")) {
          markLimited(model, limitedModels, 90000);
          markLimited(keyObj.id, limitedKeys, 60000);
          continue;
        }
        // Try next model on any error
        markLimited(model, limitedModels, 30000);
        continue;
      }
    }
    return NextResponse.json({ error: "Unable to respond. " + lastError }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
