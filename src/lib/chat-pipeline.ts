// Multi-step chat pipeline for /api/chat:
//   1. understand the message  2. gather the guide  3. write the answer
//   4. check (and rewrite if needed)  5. deliver
// The model call is injected so the route can use its Gemini fallback list and
// tests can stub it. Intermediate notes never leave the server.

import { contentChunks } from "./content";
import { parseGuideHtml, scoreSections, tokenize, type ParsedGuide, type ScoredSection } from "./guide-text";

export type HistoryTurn = { role: "user" | "assistant"; text: string };

export interface GenerateResult {
  text: string;
  model: string;
}

/** Calls the model (with its own fallback/retry). Throws if no model answers. */
export type GenerateFn = (prompt: string, system: string, opts?: { preferredModel?: string; maxModels?: number }) => Promise<GenerateResult>;

export interface PipelineInput {
  message: string;
  history: HistoryTurn[];
  /** English name of the response language, e.g. "Spanish". */
  responseLanguage: string;
  guideHtml: string;
  generate: GenerateFn;
  /** Optional hook for logs/tests; never sent to the client. */
  onStep?: (step: string, detail: Record<string, unknown>) => void;
}

export interface Understanding {
  question: string;
  terms: string[];
}

export interface PipelineOutput {
  answer: string;
  sources: { heading: string; section: string; id: string }[];
  modelUsed: string;
}

export const MAX_HISTORY_TURNS = 8;
const MAX_TURN_CHARS = 1500;
const MAX_MESSAGE_CHARS = 4000;

/** Validate and trim client-supplied history; drops anything that looks like an API key. */
export function sanitizeHistory(raw: unknown): HistoryTurn[] {
  if (!Array.isArray(raw)) return [];
  const out: HistoryTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const text = (item as { text?: unknown }).text;
    if ((role !== "user" && role !== "assistant" && role !== "bot") || typeof text !== "string") continue;
    const clean = text.replace(/AIza[0-9A-Za-z_-]{20,}/g, "[redacted]").trim();
    if (!clean) continue;
    out.push({ role: role === "user" ? "user" : "assistant", text: clean.slice(0, MAX_TURN_CHARS) });
  }
  return out.slice(-MAX_HISTORY_TURNS);
}

function formatHistory(history: HistoryTurn[]): string {
  if (!history.length) return "(no earlier messages)";
  return history.map((h) => `${h.role === "user" ? "User" : "Assistant"}: ${h.text}`).join("\n");
}

const REFUSAL_PATTERNS: RegExp[] = [
  /not (?:mentioned|covered|found|included|present|discussed|addressed|specified|stated|available|provided) in the (?:provided |given |supplied )?(?:context|guide|text|document|information|page|material)/i,
  /(?:answer|information) (?:is|was) not (?:in|within|part of|contained in|found in) the (?:provided |given )?(?:context|guide|text|document|page)/i,
  /\bnot in the (?:provided |given |supplied )?context\b/i,
  /\bthe answer is not in\b/i,
  /\bthere is no (?:mention|explanation|information|reference|discussion) (?:of|about|on|regarding)\b/i,
  /\bno mention of\b/i,
  /\bthe (?:provided |given |supplied )?(?:context|text|document|guide) (?:does not|doesn't) (?:mention|cover|contain|include|say|discuss|explain|address|provide)\b/i,
  /\bI (?:cannot|can't|can not|am unable to|'m unable to) (?:answer|find|provide|help with|determine)\b/i,
  /\bI (?:do not|don't) have (?:enough )?(?:information|details|context)\b/i,
  // Common equivalents in the other UI languages.
  /no se menciona|no está en el contexto|no aparece en el contexto|n'est pas mentionné|ne figure pas dans le contexte|nicht im kontext|wird nicht erwähnt|não é mencionad|não está no contexto|上下文中没有|未提及|文脈には.*ありません|言及されていません|언급되지 않|컨텍스트에.*없|ไม่ได้กล่าวถึง/i,
];

export function isRefusal(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return REFUSAL_PATTERNS.some((re) => re.test(t));
}

/** Pull the first JSON object out of a model reply (tolerates ``` fences and chatter). */
export function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const v = JSON.parse(cleaned.slice(start, end + 1));
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ---------- Step 1: understand ----------

export const UNDERSTAND_SYSTEM =
  "You interpret questions for a help assistant on a page that hosts the \"AEO/GEO & Semantic Architecture Optimization Guide\" " +
  "(heading hierarchy h1–h6, span resolution, typography tokens such as .text-h1, PLP/PDP/editorial page structures, the refactor matrix, " +
  "heading-to-paragraph RAG pairing, and off-page entity consensus). Do not answer the question. " +
  "Work out what the user means, using the earlier conversation for follow-ups, and expand short or informal input into a complete question. " +
  "For example, \"h1\" means: \"What does the guide say about the h1 tag: its rules, its typography token, and its examples?\" " +
  "Return only a JSON object, no other text: {\"question\": string (one or two plain English sentences), \"terms\": string[] (3 to 10 short search terms that appear in or relate to the guide, such as \"h1\", \"text-h1\", \"PDP\", \"span\")}.";

export function buildUnderstandPrompt(message: string, history: HistoryTurn[]): string {
  return `Earlier conversation:\n${formatHistory(history)}\n\nNew user message:\n${message}\n\nReturn the JSON object now.`;
}

export function parseUnderstanding(text: string): Understanding | null {
  const json = extractJson(text);
  if (!json) return null;
  const question = typeof json.question === "string" ? json.question.trim() : "";
  if (!question) return null;
  const terms = Array.isArray(json.terms) ? json.terms.filter((t): t is string => typeof t === "string" && t.trim().length > 0).map((t) => t.trim()).slice(0, 12) : [];
  return { question: question.slice(0, 600), terms };
}

// ---------- Step 2: gather ----------

export interface Gathered {
  terms: string[];
  relevant: ScoredSection[];
  fullText: string;
  sources: PipelineOutput["sources"];
}

const SOURCE_META = new Map(contentChunks.map((c) => [c.id, c]));

export function gatherGuide(parsed: ParsedGuide, message: string, understanding: Understanding | null, maxSections = 5): Gathered {
  const terms = tokenize([message, understanding?.question ?? "", ...(understanding?.terms ?? [])].join(" "));
  const scored = scoreSections(parsed.sections, terms);
  const relevant = scored.filter((s) => s.score > 0).slice(0, maxSections);
  const sources = relevant
    .filter((s) => SOURCE_META.has(s.id))
    .slice(0, 4)
    .map((s) => {
      const meta = SOURCE_META.get(s.id)!;
      return { heading: meta.heading, section: meta.section, id: meta.id };
    });
  return { terms, relevant, fullText: parsed.fullText, sources };
}

// ---------- Step 3: write ----------

export function buildWriteSystem(responseLanguage: string): string {
  return (
    "You are the helpful guide assistant on a web page that presents the \"AEO/GEO & Semantic Architecture Optimization Guide\". " +
    "The full guide is provided with every request; it is the page the user is reading. Your job is to understand what the user wants and give a clear, complete, genuinely helpful answer from that page.\n" +
    "How to answer:\n" +
    "- Work from the interpreted question (what the user actually means), not only the literal words. Short inputs like \"h1\" deserve a full explanation.\n" +
    "- Use the guide: explain the relevant rules in plain language, include the guide's own examples (code, tokens, tags), and name the guide sections you drew from (for example, \"Typography Tokens & Strategic Roles\" or \"The Product Detail Page (PDP) Structure\").\n" +
    "- If the guide does not spell something out directly, answer with the closest related material from the guide and explain how it applies. Do not invent rules, numbers, or claims the guide does not support.\n" +
    "- Never say or imply that the answer is not in the context, not mentioned, not covered, or that you cannot answer. Never refer to \"the context\" or \"the provided text\"; refer to \"the guide\" instead.\n" +
    "- Write in complete, grammatically correct sentences. Lead with the direct answer, then supporting detail. Use short paragraphs or bullet lists; **bold** and `code` are supported, headings and tables are not.\n" +
    "- Keep it focused: usually 80–300 words, longer only when the question needs it.\n" +
    `Respond in ${responseLanguage}.` +
    (responseLanguage === "English"
      ? ""
      : " The guide is in English: translate your explanation, but keep code, HTML tags, CSS, and quoted section headings exactly as written in the guide.")
  );
}

export function buildWritePrompt(args: { message: string; history: HistoryTurn[]; understanding: Understanding | null; gathered: Gathered; reminder?: string }): string {
  const { message, history, understanding, gathered, reminder } = args;
  const excerpts = gathered.relevant.length
    ? gathered.relevant.map((s) => `### ${s.title}\n${s.text}`).join("\n\n")
    : "(No single section stood out; use the full guide below.)";
  return [
    `Earlier conversation:\n${formatHistory(history)}`,
    `User's message:\n${message}`,
    `Interpreted question:\n${understanding?.question ?? message}`,
    `Most relevant guide sections:\n${excerpts}`,
    `Full guide (the page the user is reading):\n${gathered.fullText}`,
    reminder ? `Important: ${reminder}` : "",
    "Write the answer for the user now.",
  ]
    .filter(Boolean)
    .join("\n\n---\n\n");
}

export const REFUSAL_REMINDER =
  "Your previous draft said the information was missing. That is not acceptable. The guide above is the full page; answer the user's question from it, using the closest related material and its examples. Do not mention context or missing information.";

// ---------- Step 4: review ----------

export function buildReviewSystem(responseLanguage: string): string {
  return (
    "You are the final quality check for a help assistant on the \"AEO/GEO & Semantic Architecture Optimization Guide\" page. " +
    "Review the draft answer against this checklist:\n" +
    "1. It actually answers what the user asked (the interpreted question).\n" +
    "2. It is helpful: concrete, uses the guide's rules and examples, names the sections used.\n" +
    "3. Grammar, spelling, and punctuation are clean, and it reads naturally.\n" +
    "4. It never says or implies the answer is missing, not in the context, not mentioned, or that it cannot answer.\n" +
    `5. It is written in ${responseLanguage} (code, HTML tags, CSS, and quoted section headings may stay in English).\n` +
    "If every item passes, return {\"verdict\": \"pass\"}. If any item fails, rewrite the whole answer so it passes, using only what the guide supports, " +
    "and return {\"verdict\": \"rewrite\", \"answer\": \"<the full rewritten answer>\"}. Return only the JSON object, no other text."
  );
}

export function buildReviewPrompt(args: { message: string; understanding: Understanding | null; draft: string; gathered: Gathered }): string {
  const { message, understanding, draft, gathered } = args;
  const excerpts = gathered.relevant.length ? gathered.relevant.map((s) => `### ${s.title}\n${s.text}`).join("\n\n") : gathered.fullText;
  return [
    `User's message:\n${message}`,
    `Interpreted question:\n${understanding?.question ?? message}`,
    `Draft answer to review:\n${draft}`,
    `Guide material for any rewrite:\n${excerpts}`,
    "Return the JSON object now.",
  ].join("\n\n---\n\n");
}

export function parseReview(text: string): { verdict: "pass" } | { verdict: "rewrite"; answer: string } | null {
  const json = extractJson(text);
  if (!json) return null;
  const verdict = typeof json.verdict === "string" ? json.verdict.toLowerCase() : "";
  if (verdict === "pass") return { verdict: "pass" };
  if (verdict === "rewrite" && typeof json.answer === "string" && json.answer.trim()) return { verdict: "rewrite", answer: json.answer.trim() };
  return null;
}

// ---------- Last-resort answer (never a refusal) ----------

/** Built from the guide itself if every model draft was a refusal. */
export function buildGuideExcerptAnswer(gathered: Gathered, parsed: ParsedGuide): string {
  const picks = gathered.relevant.length ? gathered.relevant.slice(0, 3) : parsed.sections.filter((s) => s.id !== "intro").slice(0, 3);
  const body = picks
    .map((s) => `**${s.title}**\n${s.text.replace(/^#+\s.*\n?/, "").trim()}`)
    .join("\n\n");
  return `Here is what the guide says that relates to your question:\n\n${body}`;
}

// ---------- Orchestration ----------

export async function runChatPipeline(input: PipelineInput): Promise<PipelineOutput> {
  const { history, responseLanguage, guideHtml, generate } = input;
  const message = input.message.trim().slice(0, MAX_MESSAGE_CHARS);
  const log = input.onStep ?? (() => {});
  const parsed = parseGuideHtml(guideHtml);

  // 1. Understand (optional: on any failure, continue with the raw message).
  let understanding: Understanding | null = null;
  let lastModel = "";
  try {
    const res = await generate(buildUnderstandPrompt(message, history), UNDERSTAND_SYSTEM, { maxModels: 2 });
    lastModel = res.model;
    understanding = parseUnderstanding(res.text);
    log("understand", { ok: Boolean(understanding), understanding });
  } catch (err) {
    log("understand", { ok: false, error: String((err as Error)?.message ?? err) });
  }

  // 2. Gather: relevant sections plus the whole guide, always.
  const gathered = gatherGuide(parsed, message, understanding);
  log("gather", { terms: gathered.terms, sections: gathered.relevant.map((s) => s.id), fullTextChars: gathered.fullText.length });

  // 3. Write (required: errors here propagate to the route).
  const writeSystem = buildWriteSystem(responseLanguage);
  let usedReminder = false;
  let write = await generate(buildWritePrompt({ message, history, understanding, gathered }), writeSystem, { preferredModel: lastModel || undefined });
  if (isRefusal(write.text)) {
    log("write", { refusal: true, retry: true });
    usedReminder = true;
    try {
      const retry = await generate(buildWritePrompt({ message, history, understanding, gathered, reminder: REFUSAL_REMINDER }), writeSystem, { preferredModel: write.model });
      if (retry.text.trim()) write = retry;
    } catch (err) {
      log("write", { retryError: String((err as Error)?.message ?? err) });
    }
  }
  let draft = write.text.trim();
  let modelUsed = write.model;
  log("write", { model: modelUsed, refusal: isRefusal(draft), chars: draft.length });

  // 4. Review (optional: on failure, deliver the draft if it is acceptable).
  let finalAnswer = draft;
  try {
    const res = await generate(buildReviewPrompt({ message, understanding, draft, gathered }), buildReviewSystem(responseLanguage), { preferredModel: modelUsed, maxModels: 2 });
    const review = parseReview(res.text);
    log("review", { verdict: review?.verdict ?? "unparsed", model: res.model });
    if (review?.verdict === "rewrite" && !isRefusal(review.answer)) {
      finalAnswer = review.answer;
      modelUsed = res.model;
    }
  } catch (err) {
    log("review", { ok: false, error: String((err as Error)?.message ?? err) });
  }

  // Safety net: never deliver a refusal.
  if (isRefusal(finalAnswer) && !usedReminder) {
    log("safety", { retryWrite: true });
    try {
      const retry = await generate(buildWritePrompt({ message, history, understanding, gathered, reminder: REFUSAL_REMINDER }), writeSystem, { preferredModel: modelUsed });
      if (!isRefusal(retry.text)) {
        finalAnswer = retry.text.trim();
        modelUsed = retry.model;
      }
    } catch {
      /* fall through to the excerpt answer */
    }
  }
  if (isRefusal(finalAnswer)) {
    log("safety", { excerptFallback: true });
    finalAnswer = buildGuideExcerptAnswer(gathered, parsed);
  }

  return { answer: finalAnswer, sources: gathered.sources, modelUsed };
}
