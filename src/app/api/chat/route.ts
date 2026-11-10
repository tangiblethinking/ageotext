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
];
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
  return geminiKeys.find((k) => typeof k.secret === "string" && k.secret.trim().length > 10 && !isLimited(k.id, limitedKeys));
}
function getHealthyModel() {
  return MODEL_PREFERENCE.find((m) => !isLimited(m, limitedModels)) || MODEL_PREFERENCE[0];
}

async function callOpenAICompat(key: string, model: string, prompt: string, systemInstruction: string) {
  const url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const err: any = new Error(data?.error?.message || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data?.choices?.[0]?.message?.content || "";
}

async function callNative(key: string, model: string, prompt: string, systemInstruction: string) {
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

    const keyObj = getHealthyKey();
    if (!keyObj) {
      return NextResponse.json({ error: "No usable API key found on the server.", debug: { keysLoaded: geminiKeys.length } }, { status: 503 });
    }

    const chunks = retrieveRelevantChunks(message, 6);
    const context = chunks.map((c) => `## ${c.heading} (${c.section})\n${c.text}`).join("\n\n");
    const systemInstruction = `You are a precise assistant for the AEO/GEO Semantic Architecture Optimization Guide. Answer ONLY using the provided context. Focus on AEO/GEO heading tags, semantic hierarchy, span resolution, PLP/PDP/Editorial structures, and copy tagging. Cite the section used. If outside the guide, say so.`;
    const prompt = `Context:\n${context}\n\nUser: ${message}`;

    let lastError = "";
    const methods = ["openai", "native", "sdk"];
    for (let attempt = 0; attempt < 6; attempt++) {
      const model = getHealthyModel();
      const method = methods[attempt % methods.length];
      try {
        let text = "";
        if (method === "openai") {
          text = await callOpenAICompat(keyObj.secret, model, prompt, systemInstruction);
        } else if (method === "native") {
          text = await callNative(keyObj.secret, model, prompt, systemInstruction);
        } else {
          const ai = new GoogleGenAI({ apiKey: keyObj.secret });
          const response = await ai.models.generateContent({
            model,
            contents: prompt,
            config: { systemInstruction, temperature: 0.3, maxOutputTokens: 1024 },
          });
          text = response.text || "";
        }
        if (text) {
          return NextResponse.json({
            answer: text,
            sources: chunks.map((c) => ({ heading: c.heading, section: c.section })),
            modelUsed: model,
            keyUsed: keyObj.id,
            method,
          });
        }
      } catch (err: any) {
        lastError = err?.message || String(err);
        if (err?.status === 429 || lastError.toLowerCase().includes("rate") || lastError.toLowerCase().includes("quota")) {
          markLimited(model, limitedModels, 90000);
          markLimited(keyObj.id, limitedKeys, 60000);
        } else {
          markLimited(model, limitedModels, 20000);
        }
        continue;
      }
    }
    return NextResponse.json({ error: "Unable to respond. " + lastError }, { status: 503 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
