"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { StickerArt } from "@/components/stickers/StickerArt";
import { PAPER_STYLE_META, STUDY_PERSONA_META } from "@/lib/semantic-styles";
import { useAppStore } from "@/store/useAppStore";
import type {
  BinderCoverTone,
  NoteFont,
  PaperStyle,
  StickerId,
  StudyPersona,
  ThemeId,
} from "@/types/study";

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const user = useAppStore((s) => s.user);
  const setTheme = useAppStore((s) => s.setTheme);

  const [step, setStep] = useState<1 | 2>(1);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [persona, setPersona] = useState<StudyPersona>(
    user.studyPersona ?? "flow"
  );
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("minimal-paper");
  const [paper, setPaper] = useState<PaperStyle>("dot");
  const [font, setFont] = useState<NoteFont>("sans");

  const [binderTitle, setBinderTitle] = useState("Kinh tế lượng");
  const [binderTone, setBinderTone] = useState<BinderCoverTone>("blue");
  const [binderSticker, setBinderSticker] = useState<StickerId>("sparkle");

  const handleFinish = () => {
    completeOnboarding({
      displayName,
      theme: selectedTheme,
      defaultPaper: paper,
      noteFont: font,
      studyPersona: persona,
      firstBinderTitle: binderTitle,
      firstBinderTone: binderTone,
      firstBinderSticker: binderSticker,
    });
    router.push("/workspace");
  };

  return (
    <div className="desk-dot flex min-h-screen items-center justify-center px-4 py-10 text-[var(--ink-primary)]">
      <div className="paper-shadow w-full max-w-xl rounded-[20px] border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-[var(--ink-muted)]">
            <Sparkles className="h-3.5 w-3.5" />
            BƯỚC {step} / 2
          </span>
          <span className="font-mono text-xs font-semibold">GuNotes.</span>
        </div>

        {step === 1 ? (
          <div className="mt-6 space-y-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Chọn gu không gian học
              </h1>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Bạn luôn có thể đổi lại giao diện hoặc kiểu giấy bất cứ lúc nào.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[11px] text-[var(--ink-muted)]">
                TÊN HIỂN THỊ TRÊN BÀN HỌC
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--ink-primary)]"
              />
            </div>

            <div>
              <div className="mb-2 font-mono text-[11px] text-[var(--ink-muted)]">
                BẠN THUỘC HỆ NÀO TRONG LIÊN MINH HỌC BÁ?
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {STUDY_PERSONA_META.map((item) => {
                  const active = persona === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setPersona(item.id);
                        setPaper(item.recommendedPaper);
                      }}
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-[var(--ink-primary)] bg-[var(--bg-paper)] ring-2 ring-[var(--ink-primary)]/15"
                          : "border-[var(--border-hairline)] hover:border-[var(--ink-muted)]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span>{item.name}</span>
                        {active && <Check className="h-3.5 w-3.5" />}
                      </div>
                      <p className="mt-0.5 text-[11px] text-[var(--ink-muted)]">
                        {item.tagline}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 font-mono text-[11px] text-[var(--ink-muted)]">
                CHỌN THEME CHỦ ĐẠO
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {(
                  [
                    {
                      id: "minimal-paper",
                      name: "Minimal Paper",
                      desc: "Giấy kem dịu mắt (Mặc định)",
                    },
                    {
                      id: "cyber-kit",
                      name: "Cyber-Kit Dark",
                      desc: "Tối sâu, viền hologram",
                    },
                    {
                      id: "blueprint",
                      name: "Blueprint Lab",
                      desc: "Xanh kỹ thuật sắc nét",
                    },
                    {
                      id: "cozy-lofi",
                      name: "Cozy Lo-fi",
                      desc: "Trầm ấm cho buổi tối",
                    },
                  ] as Array<{ id: ThemeId; name: string; desc: string }>
                ).map((item) => {
                  const active = selectedTheme === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedTheme(item.id);
                        setTheme(item.id);
                      }}
                      className={`rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-[var(--ink-primary)] bg-[var(--bg-paper)] ring-2 ring-[var(--ink-primary)]/15"
                          : "border-[var(--border-hairline)] hover:border-[var(--ink-muted)]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span>{item.name}</span>
                        {active && <Check className="h-4 w-4" />}
                      </div>
                      <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-2 font-mono text-[11px] text-[var(--ink-muted)]">
                  GIẤY MẶC ĐỊNH (4 LOẠI RUỘT)
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {PAPER_STYLE_META.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaper(p.id)}
                      className={`rounded-xl border py-2 text-xs font-medium ${
                        paper === p.id
                          ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                          : "border-[var(--border-hairline)]"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 font-mono text-[11px] text-[var(--ink-muted)]">
                  PHÔNG CHỮ GHI CHÚ
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFont("sans")}
                    className={`flex-1 rounded-xl border py-2 text-xs font-medium ${
                      font === "sans"
                        ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                        : "border-[var(--border-hairline)]"
                    }`}
                  >
                    Hiện đại
                  </button>
                  <button
                    type="button"
                    onClick={() => setFont("serif")}
                    className={`flex-1 rounded-xl border py-2 font-serif text-xs font-medium ${
                      font === "serif"
                        ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                        : "border-[var(--border-hairline)]"
                    }`}
                  >
                    Tạp chí
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-[var(--accent-primary-fg)]"
            >
              <span>Tiếp theo: Tạo cuốn sổ đầu tiên</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Độ cuốn sổ bìa còng đầu tiên
              </h1>
              <p className="mt-1 text-sm text-[var(--ink-muted)]">
                Đặt tên môn học bạn đang ôn và chọn một chiếc sticker mở màn.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block font-mono text-[11px] text-[var(--ink-muted)]">
                TÊN MÔN HỌC / CHỦ ĐỀ
              </label>
              <input
                value={binderTitle}
                onChange={(e) => setBinderTitle(e.target.value)}
                placeholder="VD: Giải tích 1, IELTS Writing, Tiếng Nhật N3..."
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--ink-primary)]"
              />
            </div>

            <div>
              <div className="mb-2 font-mono text-[11px] text-[var(--ink-muted)]">
                MÀU BÌA CÒNG
              </div>
              <div className="flex gap-2.5">
                {(
                  [
                    { id: "blue", var: "var(--binder-blue-bg)" },
                    { id: "sage", var: "var(--binder-sage-bg)" },
                    { id: "sand", var: "var(--binder-sand-bg)" },
                    { id: "lavender", var: "var(--binder-lavender-bg)" },
                    { id: "terracotta", var: "var(--binder-terracotta-bg)" },
                  ] as Array<{ id: BinderCoverTone; var: string }>
                ).map((tone) => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setBinderTone(tone.id)}
                    className={`flex h-11 flex-1 items-center justify-center rounded-xl border ${
                      binderTone === tone.id
                        ? "border-[var(--ink-primary)] ring-2 ring-[var(--ink-primary)]/20"
                        : "border-[var(--border-hairline)]"
                    }`}
                    style={{ backgroundColor: tone.var }}
                  >
                    {binderTone === tone.id && <Check className="h-4 w-4" />}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 font-mono text-[11px] text-[var(--ink-muted)]">
                CHỌN STICKER DÁN BÌA
              </div>
              <div className="flex gap-3">
                {(["sparkle", "coffee", "bookmark", "cat"] as StickerId[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setBinderSticker(st)}
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl border transition ${
                        binderSticker === st
                          ? "border-[var(--ink-primary)] bg-[var(--bg-paper)]"
                          : "border-[var(--border-hairline)]"
                      }`}
                    >
                      <StickerArt id={st} size={40} />
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-[var(--border-hairline)] px-5 py-3 text-sm font-medium"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={handleFinish}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-[var(--accent-primary-fg)]"
              >
                <span>Vào Giá sách ngay</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
