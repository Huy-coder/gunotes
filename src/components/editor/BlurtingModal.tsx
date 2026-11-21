"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  Brain,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { HighlightText } from "@/components/ui/HighlightText";
import { SEMANTIC_META } from "@/lib/semantic-styles";
import type { Note } from "@/types/study";

function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function BlurtingModal({
  open,
  note,
  onClose,
  onSaveGapToNote,
}: {
  open: boolean;
  note: Note;
  onClose: () => void;
  onSaveGapToNote: (gapText: string) => void;
}) {
  const [phase, setPhase] = useState<"dump" | "compare">("dump");
  const [dumpText, setDumpText] = useState("");
  const [redInkText, setRedInkText] = useState("");
  const [mobileTab, setMobileTab] = useState<"mine" | "source">("mine");
  const [secondsLeft, setSecondsLeft] = useState(5 * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPhase("dump");
    setDumpText("");
    setRedInkText("");
    setMobileTab("mine");
    setSecondsLeft(5 * 60);
    setRunning(false);
  }, [open, note.id]);

  useEffect(() => {
    if (!open || !running) return;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, running]);

  if (!open) return null;

  const wordCount = dumpText.trim()
    ? dumpText.trim().split(/\s+/).length
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="paper-shadow flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 py-3 sm:items-center sm:px-6">
          <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:items-center">
            <Brain className="mt-0.5 h-4 w-4 shrink-0 text-[var(--ink-primary)] sm:mt-0" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold">
                Xả não 5 phút (Blurting): {note.title}
              </h2>
              <p className="font-mono text-[10px] text-[var(--ink-muted)]">
                {phase === "dump"
                  ? "Bước 1: Đóng sổ gốc • Viết lại mọi thứ bạn còn nhớ"
                  : "Bước 2: Đối chiếu bản gốc • Dùng mực đỏ vá ngay chỗ quên"}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {phase === "dump" && (
              <div className="flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-xs tabular-nums">
                <span>{formatClock(secondsLeft)}</span>
                <button
                  type="button"
                  onClick={() => setRunning((r) => !r)}
                  className="rounded-full p-0.5 hover:bg-[var(--bg-desk)]"
                  title={running ? "Tạm dừng" : "Chạy 5 phút"}
                >
                  {running ? (
                    <Pause className="h-3 w-3" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRunning(false);
                    setSecondsLeft(5 * 60);
                  }}
                  className="rounded-full p-0.5 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
                  title="Đặt lại 5:00"
                >
                  <RotateCcw className="h-3 w-3" />
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Phase 1: Dump */}
        {phase === "dump" && (
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4 sm:p-6">
            <div className="paper-dot flex-1 rounded-2xl border border-[var(--border-hairline)] p-4 sm:p-5">
              <textarea
                autoFocus
                rows={10}
                value={dumpText}
                onChange={(e) => setDumpText(e.target.value)}
                placeholder="Gõ nhanh định nghĩa, công thức, điều kiện áp dụng và lỗi hay sai bạn nhớ được về bài này (đừng lo câu chữ chưa đẹp)..."
                className="h-full min-h-[240px] w-full resize-y bg-transparent text-sm leading-relaxed outline-none placeholder:text-[var(--ink-muted)]"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-xs text-[var(--ink-muted)]">
                Đã viết: <strong className="text-[var(--ink-primary)]">{wordCount} từ</strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setRunning(false);
                  setPhase("compare");
                }}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-5 py-2.5 text-xs font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90"
              >
                <span>Mở bản gốc để đối chiếu</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Phase 2: Compare & Red Ink Gap */}
        {phase === "compare" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Mobile Switcher */}
            <div className="border-b border-[var(--border-hairline)] px-4 py-2 lg:hidden">
              <div className="grid grid-cols-2 gap-1 rounded-full bg-[var(--bg-desk)] p-0.5">
                <button
                  type="button"
                  onClick={() => setMobileTab("mine")}
                  className={`rounded-full py-1.5 text-xs font-medium ${
                    mobileTab === "mine"
                      ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] shadow-2xs"
                      : "text-[var(--ink-muted)]"
                  }`}
                >
                  Bài xả não & Mực đỏ
                </button>
                <button
                  type="button"
                  onClick={() => setMobileTab("source")}
                  className={`rounded-full py-1.5 text-xs font-medium ${
                    mobileTab === "source"
                      ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] shadow-2xs"
                      : "text-[var(--ink-muted)]"
                  }`}
                >
                  Bản gốc đối chiếu
                </button>
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 sm:p-6 lg:grid-cols-2">
              {/* Left: Dump recap + Red ink fill */}
              <div
                className={`space-y-4 ${
                  mobileTab === "mine" ? "block" : "hidden lg:block"
                }`}
              >
                <div className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-4">
                  <div className="mb-1.5 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                    PHẦN BẠN ĐÃ NHỚ ĐƯỢC
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--ink-primary)]">
                    {dumpText.trim() ||
                      "(Bạn chưa gõ nội dung ở bước xả não — có thể xem bản gốc rồi ghi lại điểm yếu vào khung mực đỏ bên dưới.)"}
                  </p>
                </div>

                <div
                  className="rounded-2xl border p-4"
                  style={{
                    backgroundColor: "var(--sem-trap-bg)",
                    borderColor: "var(--sem-trap-border)",
                  }}
                >
                  <label className="mb-1.5 block font-mono text-[10px] font-bold tracking-wider uppercase">
                    BỔ SUNG CHỖ QUÊN / NHỚ SAI (MỰC ĐỎ)
                  </label>
                  <textarea
                    rows={5}
                    value={redInkText}
                    onChange={(e) => setRedInkText(e.target.value)}
                    placeholder="VD: Quên điều kiện g'(x) ≠ 0 ở lân cận a, và không được dùng quy tắc thương (f/g)'..."
                    className="w-full resize-y rounded-xl bg-[var(--bg-elevated)]/85 p-3 text-sm leading-relaxed outline-none placeholder:text-[var(--ink-muted)]"
                  />
                </div>
              </div>

              {/* Right: Source Note Blocks */}
              <div
                className={`space-y-3 ${
                  mobileTab === "source" ? "block" : "hidden lg:block"
                }`}
              >
                <div className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                  BẢN GỐC ĐỂ ĐỐI CHIẾU ({note.blocks.length} KHỐI)
                </div>
                {note.blocks.map((block) => {
                  const meta = SEMANTIC_META[block.type];
                  return (
                    <div
                      key={block.id}
                      className="rounded-xl border p-3.5"
                      style={{
                        backgroundColor: meta.bgVar,
                        borderColor: meta.borderVar,
                      }}
                    >
                      <div className="font-mono text-[10px] font-bold uppercase">
                        {block.title ?? meta.badge} • {block.cue}
                      </div>
                      <div className="mt-1.5 text-sm leading-relaxed">
                        <HighlightText text={block.content} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 py-3 sm:px-6">
              <button
                type="button"
                onClick={() => setPhase("dump")}
                className="rounded-full border border-[var(--border-hairline)] px-4 py-2 text-xs font-medium text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              >
                ← Viết thêm
              </button>

              <button
                type="button"
                disabled={!redInkText.trim()}
                onClick={() => {
                  if (!redInkText.trim()) return;
                  onSaveGapToNote(redInkText.trim());
                  onClose();
                }}
                className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-xs font-semibold transition ${
                  redInkText.trim()
                    ? "bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] hover:opacity-90"
                    : "cursor-not-allowed border border-[var(--border-hairline)] bg-[var(--bg-desk)] text-[var(--ink-muted)]"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Lưu lỗ hổng thành @trap + Flashcard</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
