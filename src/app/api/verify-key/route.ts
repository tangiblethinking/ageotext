import { NextRequest, NextResponse } from "next/server";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";

function statusError(status: number): string {
  if (status === 400) return "The request was rejected. Check the API key and try again.";
  if (status === 401 || status === 403) return "The Google API key was rejected. Create a free key at aistudio.google.com/apikey.";
  if (status === 404) return "That Gemini model is not available on this key. Try another free Flash model or create a new key.";
  if (status === 429) return "Google free-tier rate limit hit. Wait a minute and try again.";
  if (status >= 500) return "The Gemini service is unavailable. Try again shortly.";
  return `The API returned an error (${status}).`;
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey } = await req.json();
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim().length < 20) {
      return NextResponse.json({ ok: false, error: "Enter a valid API key." }, { status: 400 });
    }

    const url = `${GEMINI_BASE}/models?pageSize=5`;
    const res = await fetch(url, {
      headers: { "x-goog-api-key": apiKey.trim() },
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: statusError(res.status) }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message || "Could not reach the model service." }, { status: 500 });
  }
}
