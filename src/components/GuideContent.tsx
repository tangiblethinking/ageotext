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

  if (!html) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
