// Structured content chunks from the AEO/GEO guide for RAG.
export interface ContentChunk { id: string; section: string; heading: string; level: number; text: string; keywords: string[]; }
export const contentChunks: ContentChunk[] = [
  { id: 'intro', section: 'Foundation', heading: 'Structural Hierarchy', level: 2, text: 'AI search engines parse pages based on DOM hierarchy (h1-h6). They ignore CSS visual sizing. Use proper tags or spans for visual styles that would break linear hierarchy.', keywords: ['hierarchy','h1','h2','span','aeo','geo'] },
  { id: 'span', section: 'Foundation', heading: 'Span Resolution', level: 2, text: 'When a smaller visual style must appear before a larger heading, use <span class="text-h4"> instead of a real heading tag to preserve linear DOM hierarchy.', keywords: ['span','h4','visual','out-of-order'] },
  { id: 'plp', section: 'Structures', heading: 'PLP Structure', level: 2, text: 'H1: category name only. H2: filters or FAQs. H3: sub-categories. Product cards use <a> or <div> + span.text-h4 + ItemList schema. Do not repeat H3s.', keywords: ['plp','product','listing','h1','grid'] },
  { id: 'pdp', section: 'Structures', heading: 'PDP Structure', level: 2, text: 'H1: full product title. H2: Ingredients, How to Take, Clinical Results as high-intent queries. H3: sub-attributes. Disclaimers in non-heading elements.', keywords: ['pdp','product','detail','ingredients','h2'] },
  { id: 'editorial', section: 'Structures', heading: 'Editorial Pages', level: 2, text: 'H1: editorial title with entity. H2: conversational questions followed immediately by 40-60 word answer paragraphs. H3: recommendations.', keywords: ['editorial','geo','citation','h2','query'] },
  { id: 'matrix', section: 'Refactor', heading: 'Refactor Matrix', level: 2, text: 'Use spans for non-semantic visual styling. Grid items use anchors + schema. Price and disclaimers are never headings. Sidebar/footer stripped of H-tags.', keywords: ['refactor','span','disclaimer','sidebar'] }
];
export function retrieveRelevantChunks(query: string, topK = 5): ContentChunk[] {
  const q = query.toLowerCase();
  const scored = contentChunks.map(c => {
    let score = 0;
    const hay = (c.heading + ' ' + c.text + ' ' + c.keywords.join(' ')).toLowerCase();
    q.split(/\s+/).forEach(w => { if (hay.includes(w)) score += 2; });
    return { c, score };
  });
  return scored.filter(s => s.score > 0).sort((a,b) => b.score - a.score).slice(0, topK).map(s => s.c);
}
