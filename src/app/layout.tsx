import type { Metadata } from "next";
import { AppProviders } from "@/components/providers/AppProviders";
import "katex/dist/katex.min.css";
import "@xyflow/react/dist/style.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "GuNotes — Học bá có gu | Không gian ghi chú Minimal Paper",
  description:
    "Ứng dụng học tập và ghi chú chủ động chuẩn gu 9x–2k: Cornell Note, Color-coding, Blur Recall, Flashcards và Focus Cockpit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" data-theme="minimal-paper">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&family=Lora:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen antialiased selection:bg-[var(--sem-hl-bg)] selection:text-[#1F1E1B]">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
