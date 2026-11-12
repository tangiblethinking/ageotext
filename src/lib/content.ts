// Summary chunks of the AEO/GEO guide: section ids, labels, and short text used for source links.
import { tokenize } from "./guide-text";

export interface ContentChunk {
  id: string;
  section: string;
  heading: string;
  level: number;
  text: string;
  keywords: string[];
}

export const contentChunks: ContentChunk[] = [
  {
    id: "hierarchy",
    section: "Foundation",
    heading: "Structural Hierarchy Over Visual Styling",
    level: 2,
    text: "AI search engines parse web pages based entirely on structural DOM hierarchy (h1 through h6). They ignore CSS visual sizing (px, rem). Visual styling does not need to be changed; the technical tag of the style must adhere to the rules for optimization.",
    keywords: ["hierarchy", "h1", "h2", "dom", "visual", "aeo", "geo"],
  },
  {
    id: "span-resolution",
    section: "Foundation",
    heading: "Span Resolution for Non-Optimal Sizing",
    level: 2,
    text: "When a lower-size visual style must appear before a larger heading (e.g., H4 visual before H1, or jumping levels), use a span with the desired class (e.g., span class=text-h4) instead of a real heading tag. This preserves linear DOM hierarchy for AEO/GEO without disrupting designer visual intent.",
    keywords: ["span", "h4", "out-of-order", "resolution", "visual"],
  },
  {
    id: "semantic-maps",
    section: "Foundation",
    heading: "Distinct Semantic Maps",
    level: 2,
    text: "PLPs, PDPs, and Editorial/Landing Pages represent three distinct semantic maps that require tailored heading structures. Prioritize in order of top visits: Homepage, PDP, PLP.",
    keywords: ["plp", "pdp", "editorial", "semantic", "map"],
  },
  {
    id: "linear-hierarchy",
    section: "Foundation",
    heading: "Core Optimization Rule",
    level: 2,
    text: "Maintain a strict linear hierarchy (h1 to h2 to h3 to h4 to h5 to h6). Skipping levels (e.g., h1 directly to h3) breaks the semantic path and degrades graph clarity. Heading sizes do not need to descend in visual scale with tag rank.",
    keywords: ["linear", "skip", "hierarchy", "h1", "h3"],
  },
  {
    id: "rag-pairing",
    section: "Foundation",
    heading: "Heading-to-Paragraph RAG Pairing",
    level: 2,
    text: "Every heading must be immediately followed by a high-density answer block in a p tag (40-60 word summary), a bulleted list, or a structured table to maximize extraction into AI search answers.",
    keywords: ["rag", "paragraph", "answer", "payload", "40-60"],
  },
  {
    id: "tokens",
    section: "Design System",
    heading: "Typography Tokens",
    level: 2,
    text: "text-h1: Spectral 32px/400, exactly one h1 per page. text-h2: DM Sans 28px/600, primary query trigger. text-h3: DM Sans 24px/300, entity chunk. text-subheading: non-heading span for visual emphasis. text-h4: detail level or span before h1. text-overline: always a span, never a real heading. text-body: RAG payload. text-caption: non-heading fine print.",
    keywords: ["token", "text-h1", "text-h2", "typography", "spectral", "dm sans"],
  },
  {
    id: "plp",
    section: "Structures",
    heading: "PLP Structure",
    level: 2,
    text: "H1: Category Name only (exactly one). H2: Semantic Filters, Catalog Subsections, or Category FAQs. H3: Curated sub-categories under an h2. Grid Items: wrap titles in clean a or div tags with span.text-h4 or span.text-subheading. Pair with ItemList JSON-LD. Do not repeat dozens of h3 tags.",
    keywords: ["plp", "product listing", "h1", "grid", "itemlist", "category"],
  },
  {
    id: "pdp",
    section: "Structures",
    heading: "PDP Structure",
    level: 2,
    text: "H1: Full exact product title. H2: Major blocks framed as high-intent queries (Ingredients and Supplement Facts, How to Take, Clinical Results and Reviews). H3: Sub-attributes under h2. H4: Technical certifications. H5/H6: Deep specs. Disclaimers and fine print use non-heading markup only (p.text-caption or span).",
    keywords: ["pdp", "product detail", "ingredients", "h2", "disclaimer"],
  },
  {
    id: "editorial",
    section: "Structures",
    heading: "Editorial and Landing Pages",
    level: 2,
    text: "H1: Editorial title with target entity. H2: Conversational problem statements or natural-language queries, immediately followed by a p.text-body answer block. H3: Recommended products or sub-steps. H4: Active ingredients or clinical callouts. H5/H6: Granular mechanisms.",
    keywords: ["editorial", "landing", "geo", "citation", "h2", "query"],
  },
  {
    id: "matrix",
    section: "Refactor",
    heading: "Refactor Matrix",
    level: 2,
    text: "Body content: RAG answer payloads after H tags. Grid items: a/div + span.text-h4 + ItemList schema. Price/Add to Cart: non-heading only. Out-of-order visuals: span with text-h4 or overline. Sidebar/footers: stripped of H-tags. Disclaimers: p.text-caption. Deep specs reserved for h5/h6. Cross-sells use h2 or h3.",
    keywords: ["refactor", "matrix", "span", "disclaimer", "sidebar", "grid"],
  },
  {
    id: "consensus",
    section: "Authority",
    heading: "Off-Page Entity Consensus",
    level: 2,
    text: "On-page hierarchy structures content for crawlers, but LLMs validate citations through cross-source entity consensus. Ensure product names, ingredients, benefits, and claims are stated identically across domain, press, social, and vendor listings. Maintain external digital PR for third-party corroboration (PubMed, journals, review sites).",
    keywords: ["consensus", "off-page", "geo", "citation", "pr", "consistency"],
  },
];

/**
 * Keyword match over the summary chunks. Short tokens such as "h1".."h6" and "p"
 * count (they used to be dropped). The chat route now answers from the full
 * guide in public/guide-body.html; this remains for simple lookups.
 */
export function retrieveRelevantChunks(query: string, topK = 6): ContentChunk[] {
  const terms = tokenize(query);
  const scored = contentChunks.map((c) => {
    const hay = (c.heading + " " + c.text + " " + c.keywords.join(" ")).toLowerCase();
    let score = 0;
    terms.forEach((w) => {
      if (hay.includes(w)) score += 2;
    });
    return { c, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => s.c);
}
