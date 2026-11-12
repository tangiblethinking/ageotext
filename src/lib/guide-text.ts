// Turns public/guide-body.html into plain text and id-anchored sections, and
// scores those sections against a query. Pure functions: no fs or network here,
// so the chat pipeline (and tests) can feed in whatever HTML was loaded.

export interface GuideSection {
  /** The element id in guide-body.html (used for source links), or "intro". */
  id: string;
  /** Visible heading or lead-in of the section, as written in the guide. */
  title: string;
  /** Plain-text body of the section, including its heading. */
  text: string;
}

export interface ParsedGuide {
  /** The whole guide as readable plain text. */
  fullText: string;
  sections: GuideSection[];
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rarr: "→",
  larr: "←",
  ndash: "–",
  mdash: "—",
  reg: "®",
  trade: "™",
  copy: "©",
  hellip: "…",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/** Lightly cleaned plain text: keeps headings, list items, table rows, and code as `code`. */
export function htmlToText(html: string): string {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, "");
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  s = s.replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, inner: string) => "`" + inner.replace(/<[^>]+>/g, "") + "`");
  s = s.replace(/<h([1-6])[^>]*>/gi, (_m, lvl: string) => "\n\n" + "#".repeat(Number(lvl)) + " ");
  s = s.replace(/<\/h[1-6]>/gi, "\n");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<li[^>]*>/gi, "\n- ");
  s = s.replace(/<tr[^>]*>/gi, "\n|");
  s = s.replace(/<\/(td|th)>/gi, " |");
  s = s.replace(/<\/(p|div|li|ul|ol|table|thead|tbody|tr)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = decodeEntities(s);
  s = s
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

/**
 * Split the guide at every element that carries an id (the same ids the page
 * uses as source anchors). Text before the first id becomes "intro".
 */
export function parseGuideHtml(html: string): ParsedGuide {
  const fullText = htmlToText(html);
  const sections: GuideSection[] = [];
  const re = /<([a-z][a-z0-9]*)\b[^>]*\sid="([^"]+)"[^>]*>/gi;
  const marks: { id: string; tag: string; start: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) marks.push({ tag: m[1].toLowerCase(), id: m[2], start: m.index });

  const firstStart = marks.length ? marks[0].start : html.length;
  const introText = htmlToText(html.slice(0, firstStart));
  if (introText) sections.push({ id: "intro", title: firstLine(introText), text: introText });

  marks.forEach((mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].start : html.length;
    const chunk = html.slice(mark.start, end);
    const text = htmlToText(chunk);
    if (!text) return;
    let title = "";
    if (/^h[1-6]$/.test(mark.tag)) {
      const h = chunk.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
      title = h ? htmlToText(h[1]) : firstLine(text);
    } else {
      const strong = chunk.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i);
      title = strong ? htmlToText(strong[1]).replace(/:\s*$/, "") : firstLine(text);
    }
    sections.push({ id: mark.id, title, text });
  });

  return { fullText, sections };
}

function firstLine(text: string): string {
  return text.split("\n").find((l) => l.trim())?.replace(/^#+\s*/, "").trim() ?? "";
}

const STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "to", "in", "on", "for", "with", "by", "at", "as", "is", "are", "was", "were",
  "be", "been", "it", "its", "this", "that", "these", "those", "what", "which", "who", "whom", "how", "why", "when",
  "where", "do", "does", "did", "can", "could", "should", "would", "will", "shall", "may", "might", "must", "i", "me",
  "my", "you", "your", "we", "our", "they", "them", "their", "he", "she", "about", "tell", "explain", "please", "show",
  "give", "use", "using", "used", "there", "here", "if", "so", "not", "no", "yes", "any", "some", "all", "from", "into",
  "than", "then", "also", "just", "get", "got", "like", "want", "need", "know", "mean", "means", "guide", "page",
]);

/** Single letters that are real HTML tags and worth matching (e.g. "p", "a"). */
const SHORT_TAGS = new Set(["p", "a", "b", "i", "u", "s"]);

/**
 * Query terms. Unlike the old retriever, short tokens such as "h1".."h6" and
 * "p" are kept. "<h1>", "H1", ".text-h1" all yield "h1" (and "text-h1").
 */
export function tokenize(query: string): string[] {
  const lower = query.toLowerCase();
  const out = new Set<string>();
  for (const raw of lower.match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? []) {
    const parts = raw.includes("-") ? [raw, ...raw.split("-")] : [raw];
    for (const w of parts) {
      if (!w || STOPWORDS.has(w)) continue;
      if (w.length === 1 && !SHORT_TAGS.has(w)) continue;
      out.add(w);
    }
  }
  return [...out];
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countWord(hay: string, word: string): number {
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(word)}(?=$|[^\\p{L}\\p{N}])`, "gu");
  return (hay.match(re) ?? []).length;
}

export interface ScoredSection extends GuideSection {
  score: number;
}

/** Score every section by whole-word term hits; title hits weigh more. */
export function scoreSections(sections: GuideSection[], terms: string[]): ScoredSection[] {
  const uniq = [...new Set(terms.map((t) => t.toLowerCase()).filter(Boolean))];
  return sections
    .map((s) => {
      const title = s.title.toLowerCase();
      const body = s.text.toLowerCase();
      let score = 0;
      for (const t of uniq) {
        const inBody = countWord(body, t);
        if (inBody) score += 2 + Math.min(inBody, 6);
        if (countWord(title, t)) score += 4;
      }
      return { ...s, score };
    })
    .sort((a, b) => b.score - a.score);
}
