"use client";

import { useEffect, useState } from "react";

export default function GuideContent() {
  const [html, setHtml] = useState("");
  const [css, setCss] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/guide-body.html").then((r) => r.text()),
      fetch("/guide-style.css").then((r) => r.text()),
    ]).then(([body, style]) => {
      setHtml(body);
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
