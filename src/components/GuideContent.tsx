"use client";

import { useEffect, useState } from "react";

function escapeCodeContents(html: string): string {
  return html.replace(/<code>([\s\S]*?)<\/code>/g, (_match, inner) => {
    const escaped = inner
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">");
    return `<code>${escaped}</code>`;
  });
}

export default function GuideContent() {
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/guide-body.html").then((r) => r.text()),
      fetch("/guide-style.css").then((r) => r.text()),
    ]).then(([body, style]) => {
      setHtml(escapeCodeContents(body));
      setCss(style);
    });
  }, []);

  if (!html) return <div className="p-10 text-center text-slate-500">Loading guide...</div>;

  return (
    <>
      <style>{css}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
