import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "GuNotes — Học bá có gu",
    short_name: "GuNotes",
    description:
      "Không gian ghi chú chủ động chuẩn Minimal Paper: Cornell Note, Bút nhớ, Sơ đồ đa tầng, Flashcards & Focus Cockpit.",
    start_url: "/workspace",
    scope: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#1f1e1b",
    lang: "vi",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
