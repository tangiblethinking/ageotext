import ChatFAB from "@/components/ChatFAB";

export default function Home() {
  return (
    <>
      <main className="min-h-screen bg-slate-50 text-slate-800">
        <div className="max-w-4xl mx-auto bg-white my-8 p-6 sm:p-10 rounded-xl shadow-sm border border-slate-200">
          <h1 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-slate-900 border-b-2 border-slate-200 pb-3 mb-6">
            AEO/GEO & Semantic Architecture Optimization Guide
          </h1>

          <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-blue-600 block mb-1">
            Foundation
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 border-b border-slate-200 pb-2 mb-4">
            1. Understanding AEO/GEO & Semantic Architecture
          </h2>
          <ul className="space-y-3 mb-6 list-disc pl-5 text-sm">
            <li>
              <strong>Structural Hierarchy Over Visual Styling:</strong> AI engines parse DOM hierarchy (h1–h6), not CSS size. Use correct tags or spans.
            </li>
            <li>
              <strong>Span Resolution:</strong> For out-of-order visual styles, use a span with class text-h4 instead of a real heading tag to keep linear hierarchy.
            </li>
            <li>
              <strong>Core Rule:</strong> Never skip levels. Visual size does not have to match tag rank.
            </li>
            <li>
              <strong>RAG Pairing:</strong> Every heading should be followed by a 40–60 word answer block, list, or table.
            </li>
          </ul>

          <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-blue-600 block mb-1 mt-8">
            Typography Tokens
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 border-b border-slate-200 pb-2 mb-4">
            2. Tokens & Strategic Roles
          </h2>
          <div className="space-y-2 text-sm">
            <div className="bg-slate-50 border rounded-lg p-3">
              <code className="text-xs bg-slate-200 px-1 rounded">.text-h1</code> — Exactly one h1 per page. Entity scope.
            </div>
            <div className="bg-slate-50 border rounded-lg p-3">
              <code className="text-xs bg-slate-200 px-1 rounded">.text-h2</code> — Primary query trigger. Conversational questions.
            </div>
            <div className="bg-slate-50 border rounded-lg p-3">
              <code className="text-xs bg-slate-200 px-1 rounded">.text-h3</code> — Entity chunks under H2.
            </div>
            <div className="bg-slate-50 border rounded-lg p-3">
              <code className="text-xs bg-slate-200 px-1 rounded">.text-h4 / span</code> — Detail level or visual span before H1.
            </div>
            <div className="bg-slate-50 border rounded-lg p-3">
              <code className="text-xs bg-slate-200 px-1 rounded">.text-overline</code> — Always a span. Never a real heading.
            </div>
          </div>

          <span className="text-xs font-extrabold uppercase tracking-[0.15em] text-blue-600 block mb-1 mt-8">
            Implementation
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 border-b border-slate-200 pb-2 mb-4">
            3. Page-Specific Structures
          </h2>
          <details className="mb-2">
            <summary className="cursor-pointer font-semibold py-1">A. Product Listing Page (PLP)</summary>
            <p className="text-sm pl-4 mt-1">H1 = category only. H2 = filters/FAQs. Product cards = anchor/div + span.text-h4 + ItemList schema.</p>
          </details>
          <details className="mb-2">
            <summary className="cursor-pointer font-semibold py-1">B. Product Detail Page (PDP)</summary>
            <p className="text-sm pl-4 mt-1">H1 = full title. H2 = Ingredients / How to Take / Clinical (high-intent). Disclaimers = non-heading.</p>
          </details>
          <details className="mb-4">
            <summary className="cursor-pointer font-semibold py-1">C. Editorial / Landing</summary>
            <p className="text-sm pl-4 mt-1">H2 = conversational questions immediately followed by 40–60 word answer paragraphs.</p>
          </details>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-6">
            4. Refactor Matrix (summary)
          </h2>
          <p className="text-sm">Grid items → spans + schema. Out-of-order visuals → spans. Price/Add-to-Cart/Disclaimers/Sidebar → never headings.</p>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-6">
            5. Off-Page Consensus
          </h2>
          <p className="text-sm">Keep product names, ingredients, and claims identical across all channels. LLMs validate against external sources.</p>

          <p className="mt-8 text-xs text-slate-400">Content is fully indexed for the assistant. Answers stay inside this guide.</p>
        </div>
      </main>
      <ChatFAB />
    </>
  );
}
