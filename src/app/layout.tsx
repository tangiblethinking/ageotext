import type { Metadata } from "next";
import { DM_Sans, Spectral } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", weight: ["300", "400", "600", "800"] });
const spectral = Spectral({ subsets: ["latin"], variable: "--font-spectral", weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "AEO/GEO Semantic Architecture Guide",
  description: "AEO/GEO optimization guide with on-page RAG assistant",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spectral.variable}`}>
      <body className="font-sans antialiased bg-slate-50">{children}</body>
    </html>
  );
}
