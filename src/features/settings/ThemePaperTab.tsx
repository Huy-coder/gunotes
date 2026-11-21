"use client";

import React from "react";
import { Check } from "lucide-react";
import { PAPER_STYLE_META, STUDY_PERSONA_META } from "@/lib/semantic-styles";
import { useAppStore } from "@/store/useAppStore";
import type { NoteFont, ThemeId } from "@/types/study";

const THEME_CARDS: Array<{
  id: ThemeId;
  name: string;
  desc: string;
  deskBg: string;
  paperBg: string;
  inkColor: string;
  accentBg: string;
}> = [
  {
    id: "minimal-paper",
    name: "Minimal Paper",
    desc: "Giấy kem dịu mắt, mực than chì & pastel",
    deskBg: "#F4F1EA",
    paperBg: "#FAF8F3",
    inkColor: "#1F1E1B",
    accentBg: "#DCE8F2",
  },
  {
    id: "cyber-kit",
    name: "Cyber-Kit Dark",
    desc: "Nền đen sâu, viền hologram & cyan neon",
    deskBg: "#0B0E14",
    paperBg: "#121722",
    inkColor: "#EEF2F7",
    accentBg: "#38BDF8",
  },
  {
    id: "blueprint",
    name: "Blueprint Lab",
    desc: "Xanh kỹ thuật sắc nét, phong cách kiến trúc",
    deskBg: "#132238",
    paperBg: "#182B47",
    inkColor: "#F1F6FD",
    accentBg: "#7DD3FC",
  },
  {
    id: "cozy-lofi",
    name: "Cozy Lo-fi",
    desc: "Tông giấy rang trầm ấm cho buổi đêm",
    deskBg: "#EBE2D3",
    paperBg: "#F6F0E4",
    inkColor: "#2C221E",
    accentBg: "#DCE5E8",
  },
];

export function ThemePaperTab() {
  const user = useAppStore((s) => s.user);
  const theme = useAppStore((s) => s.theme);
  const defaultPaper = useAppStore((s) => s.defaultPaper);
  const noteFont = useAppStore((s) => s.noteFont);
  const setTheme = useAppStore((s) => s.setTheme);
  const setDefaultPaper = useAppStore((s) => s.setDefaultPaper);
  const setNoteFont = useAppStore((s) => s.setNoteFont);
  const setStudyPersona = useAppStore((s) => s.setStudyPersona);
  const showToast = useAppStore((s) => s.showToast);

  return (
    <div className="mt-6 space-y-8">
      <section>
        <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
          Chọn Gu Không Gian (Theme Presets)
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {THEME_CARDS.map((card) => {
            const active = theme === card.id;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setTheme(card.id);
                  showToast(`Đã chuyển sang gu ${card.name}`);
                }}
                className={`paper-shadow flex flex-col overflow-hidden rounded-2xl border text-left transition ${
                  active
                    ? "border-[var(--ink-primary)] ring-2 ring-[var(--ink-primary)]/20"
                    : "border-[var(--border-hairline)] hover:border-[var(--ink-muted)]"
                }`}
              >
                <div
                  className="flex h-24 w-full items-center gap-3 p-4"
                  style={{ backgroundColor: card.deskBg }}
                >
                  <div
                    className="flex h-full flex-1 flex-col justify-between rounded-xl border border-black/10 p-2.5"
                    style={{
                      backgroundColor: card.paperBg,
                      color: card.inkColor,
                    }}
                  >
                    <div className="text-[11px] font-bold">Aa Ghi chú mẫu</div>
                    <div className="flex gap-1.5">
                      <span
                        className="h-2.5 w-10 rounded-full"
                        style={{ backgroundColor: card.accentBg }}
                      />
                      <span className="h-2.5 w-6 rounded-full bg-current opacity-20" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-[var(--bg-elevated)] p-4">
                  <div>
                    <div className="text-sm font-bold">{card.name}</div>
                    <div className="mt-0.5 text-xs text-[var(--ink-muted)]">
                      {card.desc}
                    </div>
                  </div>
                  {active && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
            Chất liệu giấy mặc định (4 loại ruột giấy)
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {PAPER_STYLE_META.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setDefaultPaper(p.id)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  defaultPaper === p.id
                    ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                    : "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                }`}
              >
                <div className="text-xs font-semibold">{p.label}</div>
                <div className="text-[10px] opacity-75">{p.hint}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
            Phông chữ nội dung
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {(
              [
                { id: "sans", label: "Be Vietnam Pro", sub: "Hiện đại" },
                { id: "serif", label: "Lora Serif", sub: "Tạp chí" },
              ] as Array<{ id: NoteFont; label: string; sub: string }>
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setNoteFont(f.id)}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  noteFont === f.id
                    ? "border-[var(--ink-primary)] bg-[var(--bg-paper)] ring-1 ring-[var(--ink-primary)]"
                    : "border-[var(--border-hairline)] bg-[var(--bg-elevated)]"
                }`}
              >
                <div
                  className={`text-sm font-semibold ${
                    f.id === "serif" ? "font-serif" : "font-sans"
                  }`}
                >
                  {f.label}
                </div>
                <div className="font-mono text-[10px] text-[var(--ink-muted)]">
                  {f.sub}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
          Gu Liên Minh Học Bá (Tư duy chủ đạo)
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {STUDY_PERSONA_META.map((item) => {
            const active = (user.studyPersona ?? "flow") === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setStudyPersona(item.id);
                  showToast(`Đã chọn ${item.name}`);
                }}
                className={`rounded-2xl border p-3.5 text-left transition ${
                  active
                    ? "border-[var(--ink-primary)] bg-[var(--bg-paper)] ring-2 ring-[var(--ink-primary)]/15"
                    : "border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--ink-muted)]"
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold sm:text-sm">
                  <span>{item.name}</span>
                  {active && <Check className="h-4 w-4" />}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
                  {item.tagline}
                </div>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  {item.desc}
                </p>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
