import ChatFAB from "@/components/ChatFAB";

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-slate-50 text-slate-800 py-10 px-4">
        <div className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-xl shadow-md border border-slate-200">
          <h1 className="text-4xl font-serif font-normal tracking-tight text-slate-900 border-b-2 border-slate-200 pb-3 mb-6">
            AEO/GEO & Semantic Architecture Optimization Guide
          </h1>

          <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-blue-600 block mb-1">Foundation</span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 border-b border-slate-200 pb-2 mb-4">1. Understanding AEO/GEO & Semantic Architecture</h2>

          <ul className="space-y-4 list-disc pl-5 text-base">
            <li>
              <strong>Structural Hierarchy Over Visual Styling:</strong> AI search engines parse web pages based entirely on structural DOM hierarchy (<code className="bg-slate-100 px-1 rounded text-sm"><h1></code> through <code className="bg-slate-100 px-1 rounded text-sm"><h6></code>). They ignore CSS visual sizing (px, rem).
              <div className="mt-2 bg-slate-100 border-l-4 border-blue-600 p-3 rounded-r text-sm">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 mr-2">MEANING</span>
                Visual styling does not need to be changed; rather, the technical tag of the style must adhere to the rules/constraints for optimization.
              </div>
            </li>
            <li>
              <strong>The span Resolution for Non-Optimal Sizing:</strong> When a lower-size visual style must appear before a larger heading (or levels would be skipped), use a span with the desired class instead of a real heading tag.
              <div className="mt-2 bg-slate-100 border-l-4 border-blue-600 p-3 rounded-r text-sm">
                <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 mr-2">RESOLUTION</span>
                Use <code className="bg-slate-100 px-1 rounded text-sm"><span class="text-h4"></code> (or any token class). This preserves linear DOM hierarchy for AEO/GEO without disrupting designer visual intent.
              </div>
            </li>
            <li>
              <strong>Distinct Semantic Maps:</strong> PLPs, PDPs, and Editorial/Landing Pages represent three distinct semantic maps. Prioritize Homepage, then PDP, then PLP.
            </li>
            <li>
              <strong>Core Optimization Rule:</strong> Maintain a strict linear hierarchy (h1 → h2 → h3 → h4 → h5 → h6). Skipping levels degrades graph clarity. Visual size does not have to descend with tag rank.
            </li>
            <li>
              <strong>Heading-to-Paragraph RAG Pairing:</strong> Every heading must be immediately followed by a high-density answer block (40–60 word summary), list, or table.
            </li>
          </ul>

          <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-blue-600 block mb-1 mt-10">Design System Token Mapping</span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 border-b border-slate-200 pb-2 mb-4">2. Typography Tokens & Strategic Roles</h2>
          <p className="text-lg text-slate-600 mb-4">Complete mapping of typography design tokens to their AEO/GEO semantic implementation rules.</p>

          <div className="space-y-3">
            {[
              { tag: ".text-h1", name: "Heading 1 (Display / Hero)", spec: "Spectral · 32px/32px · 400", role: "Exactly one <h1> per page. Establishes the overarching semantic entity." },
              { tag: ".text-h2", name: "Heading 2", spec: "DM Sans · 28px/28px · 600", role: "Primary query trigger. Framed as explicit conversational questions or high-intent statements." },
              { tag: ".text-h3", name: "Heading 3", spec: "DM Sans · 24px/28px · 300", role: "Entity chunk level. Breaks down concepts or sub-topics under an h2." },
              { tag: ".text-subheading", name: "Subheading", spec: "DM Sans · 24px/28px · 600", role: "Non-heading. Use via span for visual emphasis without breaking DOM hierarchy." },
              { tag: ".text-h4", name: "Heading 4", spec: "DM Sans · 16px/20px · 600", role: "Detail level under h3, or applied as span when smaller styling is needed before an h1." },
              { tag: ".text-h6", name: "Heading 6", spec: "Spectral · 24px/28px · 400", role: "Granular technical attributes in nested structures. Never a visual shortcut for small text." },
              { tag: ".text-subtitle", name: "True Subtitle", spec: "DM Sans · 20px/24px · 400", role: "Non-heading subtext under H1/H2. Applied via p or span." },
              { tag: ".text-overline-lg", name: "Large Overline / Eyebrow", spec: "DM Sans · 16px · 800 · UPPERCASE", role: "Major section eyebrow. Always a span so it never invalidates hierarchy." },
              { tag: ".text-overline", name: "Small Overline / Eyebrow", spec: "DM Sans · 12px · 800 · UPPERCASE", role: "Micro eyebrow. Applied via span above primary section titles." },
              { tag: ".text-body", name: "Body Paragraph", spec: "DM Sans · 16px/20px · 300", role: "RAG payload layer. 40–60 word answer blocks immediately following headings." },
              { tag: ".text-caption", name: "UI Caption / Helper Text", spec: "DM Sans · 12px/16px · 400", role: "Non-heading fine print for captions, disclaimers, and legal text." },
            ].map((t) => (
              <div key={t.tag} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs bg-slate-200 text-slate-900 px-2 py-0.5 rounded font-semibold">{t.tag}</span>
                  <strong className="text-sm">{t.name}</strong>
                </div>
                <p className="text-xs text-slate-500 mb-1">{t.spec}</p>
                <p className="text-sm text-slate-700">{t.role}</p>
              </div>
            ))}
          </div>

          <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-blue-600 block mb-1 mt-10">Implementation</span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 border-b border-slate-200 pb-2 mb-4">3. Page-Specific Semantic Structures</h2>

          <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-2">A. The Product Listing Page (PLP) Structure</h3>
          <p className="text-base text-slate-600 mb-3">Establishes catalog breadth and category domain authority.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><strong>h1:</strong> Category Name only. Exactly one per page.</li>
            <li><strong>h2:</strong> Reserved for Semantic Filters, Catalog Subsections, or Category FAQs.</li>
            <li><strong>h3:</strong> Curated sub-categories or featured formula collections under an h2.</li>
            <li><strong>Grid Items (Product Cards):</strong> Wrap titles in clean anchor or div tags. Use span with text-h4 or text-subheading for visual styling. Pair with ItemList JSON-LD. Do not repeat dozens of h3 tags.</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-2">B. The Product Detail Page (PDP) Structure</h3>
          <p className="text-base text-slate-600 mb-3">Feeds AI engines product specs, active ingredients, clinical proof, and purchase intent data.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><strong>h1:</strong> Full exact product title.</li>
            <li><strong>h2:</strong> Major functional blocks framed for high-intent queries (Ingredients & Supplement Facts, How to Take, Clinical Results & Reviews).</li>
            <li><strong>h3:</strong> Specific sub-attributes nested under h2 blocks.</li>
            <li><strong>h4:</strong> Technical certifications or dense sub-data.</li>
            <li><strong>h5 / h6:</strong> Deep technical specs or precise ingredient breakdowns.</li>
            <li><strong>Boilerplate & Fine Print:</strong> Non-heading markup only (p or span with text-caption) for legal disclosures.</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-700 mt-6 mb-2">C. Copy-Heavy Landing Pages & Editorial Content</h3>
          <p className="text-base text-slate-600 mb-3">Maps user problems to commercial solutions. Primary source for GEO citations.</p>
          <ul className="list-disc pl-5 space-y-2 text-sm">
            <li><strong>h1:</strong> Editorial title containing the target entity or core topic.</li>
            <li><strong>h2:</strong> Conversational problem statements or natural-language queries. Immediately followed by a p text-body answer block.</li>
            <li><strong>h3:</strong> Recommended product entities or sub-steps.</li>
            <li><strong>h4:</strong> Active ingredients or clinical callouts.</li>
            <li><strong>h5 / h6:</strong> Granular sub-mechanisms of action.</li>
          </ul>

          <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-blue-600 block mb-1 mt-10">Refactoring Matrix</span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 border-b border-slate-200 pb-2 mb-4">4. Comprehensive E-Commerce Refactor Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-200 p-3 text-left font-semibold">Element / Scenario</th>
                  <th className="border border-slate-200 p-3 text-left font-semibold">Legacy SEO</th>
                  <th className="border border-slate-200 p-3 text-left font-semibold">New AEO / GEO</th>
                  <th className="border border-slate-200 p-3 text-left font-semibold">Practical Context</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-200 p-3">Body Content (p)</td>
                  <td className="border border-slate-200 p-3">Plain visual body text</td>
                  <td className="border border-slate-200 p-3">Precise RAG answer payloads immediately following H tags</td>
                  <td className="border border-slate-200 p-3 text-xs">40–60 word summaries under h2 for AI Overview extraction</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 p-3">Grid Item Names (PLP)</td>
                  <td className="border border-slate-200 p-3">Repeating h3 tags</td>
                  <td className="border border-slate-200 p-3">Clean a/div + span.text-h4 + ItemList schema</td>
                  <td className="border border-slate-200 p-3 text-xs">Avoids fragmenting DOM heading trees</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 p-3">Add to Cart / Price</td>
                  <td className="border border-slate-200 p-3">Heading tags for styling</td>
                  <td className="border border-slate-200 p-3">Non-heading only</td>
                  <td className="border border-slate-200 p-3 text-xs">Keeps transactional text out of entity graphs</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 p-3">Out-of-Order Visual Headings</td>
                  <td className="border border-slate-200 p-3">h4 before h1</td>
                  <td className="border border-slate-200 p-3">span with text-h4 or overline class</td>
                  <td className="border border-slate-200 p-3 text-xs">Preserves linear hierarchy without visual compromise</td>
                </tr>
                <tr>
                  <td className="border border-slate-200 p-3">Sidebar & Footers</td>
                  <td className="border border-slate-200 p-3">Generic h3/h4</td>
                  <td className="border border-slate-200 p-3">Stripped of H-tags; CSS spans only</td>
                  <td className="border border-slate-200 p-3 text-xs">Removes non-entity content from the hierarchy</td>
                </tr>
                <tr className="bg-slate-50">
                  <td className="border border-slate-200 p-3">Disclaimers & Disclosures</td>
                  <td className="border border-slate-200 p-3">h4 at section bottoms</td>
                  <td className="border border-slate-200 p-3">Plain p.text-caption or div</td>
                  <td className="border border-slate-200 p-3 text-xs">Keeps legal text out of the semantic topic map</td>
                </tr>
              </tbody>
            </table>
          </div>

          <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-blue-600 block mb-1 mt-10">Consensus & Authority</span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 border-b border-slate-200 pb-2 mb-4">5. Off-Page Entity Consensus (The GEO Authority Layer)</h2>
          <p className="text-base text-slate-600 mb-3">On-page HTML hierarchy structures content for crawlers, but LLMs validate citations through cross-source entity consensus.</p>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li><strong>Cross-Platform Consistency:</strong> Ensure product names, active ingredients, primary benefits, and clinical claims are stated identically across your domain, press releases, social channels, and third-party vendor listings.</li>
            <li><strong>Third-Party Corroboration:</strong> Generative engines cross-reference on-page claims against external web consensus (PubMed, scientific journals, independent review sites, health publications, and online forums). Maintain active external digital PR.</li>
          </ol>

          <p className="mt-10 text-xs text-slate-400">Content is fully indexed for the on-page assistant. Answers remain strictly within this guide.</p>
        </div>
      </main>
      <ChatFAB />
    </>
  );
}
