/**
 * Table of contents tree for the guide (public/guide-body.html).
 * Every `id` must exist in the guide HTML with the `toc-target` class.
 * Labels intentionally stay English, like the guide itself.
 */
export type TocItem = { id: string; label: string };
export type TocSection = TocItem & { children: TocItem[] };

export const TOC: TocSection[] = [
  {
    id: "understanding",
    label: "1. Understanding AEO/GEO & Semantic Architecture",
    children: [
      { id: "hierarchy", label: "Structural Hierarchy" },
      { id: "span-resolution", label: "Span Resolution" },
      { id: "semantic-maps", label: "Semantic Maps" },
      { id: "linear-hierarchy", label: "Linear Hierarchy" },
      { id: "rag-pairing", label: "RAG Pairing" },
    ],
  },
  {
    id: "tokens",
    label: "2. Typography Tokens & Strategic Roles",
    children: [
      { id: "token-h1", label: "H1" },
      { id: "token-h2", label: "H2" },
      { id: "token-h3", label: "H3" },
      { id: "token-subheading", label: "Subheading" },
      { id: "token-h4", label: "H4" },
      { id: "token-h6", label: "H6" },
      { id: "token-subtitle", label: "Subtitle" },
      { id: "token-overline-lg", label: "Large Overline" },
      { id: "token-overline", label: "Overline" },
      { id: "token-body", label: "Body" },
      { id: "token-caption", label: "Caption" },
    ],
  },
  {
    id: "structures",
    label: "3. Page-Specific Semantic Structures",
    children: [
      { id: "plp", label: "A. PLP" },
      { id: "pdp", label: "B. PDP" },
      { id: "editorial", label: "C. Editorial" },
    ],
  },
  {
    id: "matrix",
    label: "4. Comprehensive E-Commerce Refactor Matrix",
    children: [
      { id: "matrix-body", label: "Body Content" },
      { id: "matrix-grid", label: "Grid Item Names" },
      { id: "matrix-add-to-cart", label: "Add to Cart" },
      { id: "matrix-out-of-order", label: "Out-of-Order Headings" },
      { id: "matrix-deep-specs", label: "Deep Specs" },
      { id: "matrix-cross-sells", label: "Cross-Sells" },
      { id: "matrix-sidebar", label: "Sidebar & Footers" },
      { id: "matrix-disclaimers", label: "Disclaimers" },
    ],
  },
  {
    id: "consensus",
    label: "5. Off-Page Entity Consensus",
    children: [
      { id: "cross-platform", label: "Cross-Platform Consistency" },
      { id: "third-party", label: "Third-Party Corroboration" },
    ],
  },
];

/** Every target id in document order (section heading, then its children). */
export const TOC_IDS: string[] = TOC.flatMap((s) => [s.id, ...s.children.map((c) => c.id)]);

/** Maps any target id to the id of the numbered section that contains it. */
export const TOC_SECTION_OF: Record<string, string> = Object.fromEntries(
  TOC.flatMap((s) => [[s.id, s.id] as const, ...s.children.map((c) => [c.id, s.id] as const)]),
);
