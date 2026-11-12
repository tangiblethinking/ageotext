import GuideContent from "@/components/GuideContent";
import NavBar from "@/components/NavBar";
import SupportBot from "@/components/SupportBot";
import TableOfContents from "@/components/TableOfContents";

export default function Home() {
  return (
    <>
      <NavBar />
      {/* Table of contents (left side sheet) pushes the guide on desktop; on mobile it is an overlay drawer. */}
      <div style={{ display: "flex", alignItems: "flex-start" }}>
        <TableOfContents />
        <main style={{ flex: 1, minWidth: 0 }}>
          <GuideContent />
        </main>
      </div>
      <SupportBot />
    </>
  );
}
