"use client";

import { useEffect, useState } from "react";
import { GUIDE_MOUNTED_EVENT } from "@/lib/highlight";

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

  // Tell the table of contents the guide targets are in the DOM so scroll-spy can attach.
  useEffect(() => {
    if (html) window.dispatchEvent(new Event(GUIDE_MOUNTED_EVENT));
  }, [html]);

  if (!html) return null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {/* The guide stays in English regardless of the UI language. */}
      <div className="guide-root" lang="en" dangerouslySetInnerHTML={{ __html: html }} />
    </>
  );
}
