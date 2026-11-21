"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { HighlightText } from "@/components/ui/HighlightText";
import { SEMANTIC_META } from "@/lib/semantic-styles";
import { useAppStore } from "@/store/useAppStore";

function ReviewDeckInner() {
  const searchParams = useSearchParams();
  const initialBinder = searchParams.get("binder") ?? "all";

  const binders = useAppStore((s) => s.binders);
  const flashcards = useAppStore((s) => s.flashcards);
  const rateFlashcard = useAppStore((s) => s.rateFlashcard);
  const resetReviewDeck = useAppStore((s) => s.resetReviewDeck);
  const showToast = useAppStore((s) => s.showToast);

  const [selectedBinder, setSelectedBinder] = useState<string>(initialBinder);
  const [onlyTraps, setOnlyTraps] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  const deck = useMemo(() => {
    return flashcards.filter((fc) => {
      if (!fc.isDue) return false;
      if (selectedBinder !== "all" && fc.binderId !== selectedBinder) {
        return false;
      }
      if (onlyTraps && fc.type !== "trap") return false;
      return true;
    });
  }, [flashcards, selectedBinder, onlyTraps]);

  const currentCard = deck[0];
  const totalInFilter = useMemo(() => {
    return flashcards.filter((fc) => {
      if (selectedBinder !== "all" && fc.binderId !== selectedBinder) {
        return false;
      }
      if (onlyTraps && fc.type !== "trap") return false;
      return true;
    }).length;
  }, [flashcards, selectedBinder, onlyTraps]);

  const handleRate = (rating: 1 | 2 | 3 | 4) => {
    if (!currentCard) return;
    rateFlashcard(currentCard.id, rating);
    setRevealed(false);
    setCompletedCount((c) => c + 1);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (!currentCard) return;

      if (e.code === "Space") {
        e.preventDefault();
        setRevealed((v) => !v);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        const rating = Number(e.key) as 1 | 2 | 3 | 4;
        rateFlashcard(currentCard.id, rating);
        setRevealed(false);
        setCompletedCount((c) => c + 1);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentCard, revealed, rateFlashcard]);

  const doneCount = Math.max(0, totalInFilter - deck.length);
  const progressPct =
    totalInFilter > 0 ? Math.round((doneCount / totalInFilter) * 100) : 100;

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-3xl flex-col justify-between px-4 pt-5 pb-6 sm:px-6 sm:pt-7">
        {/* Top Progress Header */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link
                href="/workspace"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium hover:border-[var(--ink-muted)]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Giá sách</span>
              </Link>

              <select
                value={selectedBinder}
                onChange={(e) => {
                  setSelectedBinder(e.target.value);
                  setRevealed(false);
                }}
                className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs font-medium outline-none"
              >
                <option value="all">Tất cả môn học</option>
                {binders.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                setOnlyTraps((v) => !v);
                setRevealed(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] font-medium transition ${
                onlyTraps
                  ? "border-[var(--sem-trap-border)] bg-[var(--sem-trap-bg)] text-[var(--ink-primary)]"
                  : "border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-muted)]"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>Chỉ ôn Bẫy hay sai</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-hairline)]">
              <div
                className="h-full rounded-full bg-[var(--ink-primary)] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="font-mono text-xs text-[var(--ink-muted)] tabular-nums">
              Còn {deck.length} / {totalInFilter} thẻ
            </span>
          </div>
        </header>

        {/* Central Index Card Stage */}
        <div className="my-auto py-8">
          {currentCard ? (
            <div className="relative mx-auto max-w-2xl">
              {/* Peeking stacked cards underneath for tactile paper deck feel */}
              <div
                aria-hidden="true"
                className="absolute inset-x-4 -bottom-2.5 h-8 rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-paper)] opacity-70"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-2 -bottom-1.5 h-8 rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-paper)] opacity-90"
              />

              {/* Main Flashcard */}
              <div className="paper-dot paper-shadow relative rounded-[20px] border border-[var(--border-hairline)] p-5 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    className="rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold tracking-wider uppercase"
                    style={{
                      backgroundColor: SEMANTIC_META[currentCard.type].bgVar,
                      borderColor: SEMANTIC_META[currentCard.type].borderVar,
                    }}
                  >
                    {SEMANTIC_META[currentCard.type].badge} •{" "}
                    {binders.find((b) => b.id === currentCard.binderId)?.title}
                  </span>

                  <Link
                    href={`/binder/${currentCard.binderId}/note/${currentCard.noteId}`}
                    className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  >
                    <span>Mở trang note gốc</span>
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>

                {/* Front Question */}
                <div className="mt-6">
                  <div className="font-mono text-[10px] tracking-wider text-[var(--ink-muted)] uppercase">
                    CÂU HỎI GỢI NHỚ
                  </div>
                  <h2 className="mt-2 text-lg leading-snug font-bold sm:text-2xl">
                    <HighlightText text={currentCard.front} />
                  </h2>
                </div>

                {/* Divider & Answer */}
                <div className="my-6 border-t border-dashed border-[var(--border-hairline)]" />

                {!revealed ? (
                  <button
                    type="button"
                    onClick={() => setRevealed(true)}
                    className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-elevated)]/70 py-8 text-center transition hover:border-[var(--ink-muted)]"
                  >
                    <span className="rounded-full bg-[var(--accent-primary)] px-5 py-2 text-xs font-semibold text-[var(--accent-primary-fg)]">
                      Lật xem đáp án (Space)
                    </span>
                    <span className="mt-2 font-mono text-[11px] text-[var(--ink-muted)]">
                      Tự nhẩm câu trả lời trước khi mở nhé
                    </span>
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <div className="font-mono text-[10px] tracking-wider text-[var(--ink-muted)] uppercase">
                        ĐÁP ÁN CHUẨN
                      </div>
                      <div className="mt-1.5 text-sm leading-relaxed sm:text-base">
                        <HighlightText text={currentCard.back} />
                      </div>
                    </div>

                    {currentCard.tip && (
                      <div
                        className="rounded-xl border px-3.5 py-2.5 text-xs leading-relaxed"
                        style={{
                          backgroundColor: "var(--sem-trap-bg)",
                          borderColor: "var(--sem-trap-border)",
                        }}
                      >
                        <strong className="font-mono text-[10px] uppercase">
                          LƯU Ý:{" "}
                        </strong>
                        {currentCard.tip}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="paper-dot paper-shadow mx-auto max-w-md rounded-[20px] border border-[var(--border-hairline)] p-8 text-center">
              <div
                className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border"
                style={{
                  backgroundColor: "var(--sem-ex-bg)",
                  borderColor: "var(--sem-ex-border)",
                }}
              >
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold">
                Đã ôn xong toàn bộ thẻ!
              </h2>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                Bạn vừa hoàn thành {completedCount} lượt ôn tập trong phiên này.
                Kiến thức đã được lên lịch nhắc lại thông minh.
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={() => {
                    resetReviewDeck();
                    setCompletedCount(0);
                    showToast("Đã nạp lại toàn bộ bộ thẻ để ôn thêm.");
                  }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Ôn lại từ đầu</span>
                </button>
                <Link
                  href="/workspace"
                  className="inline-flex items-center justify-center rounded-full bg-[var(--accent-primary)] px-5 py-2 text-xs font-semibold text-[var(--accent-primary-fg)]"
                >
                  Về Giá sách
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Spaced Repetition Rating Bar */}
        {currentCard && (
          <footer className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(
                [
                  {
                    rating: 1,
                    label: "Quên rồi",
                    next: "10p",
                    bg: "var(--sem-trap-bg)",
                    border: "var(--sem-trap-border)",
                  },
                  {
                    rating: 2,
                    label: "Hơi khó",
                    next: "1 ngày",
                    bg: "var(--binder-sand-bg)",
                    border: "var(--binder-sand-border)",
                  },
                  {
                    rating: 3,
                    label: "Ổn áp",
                    next: "4 ngày",
                    bg: "var(--sem-def-bg)",
                    border: "var(--sem-def-border)",
                  },
                  {
                    rating: 4,
                    label: "Quá dễ",
                    next: "9 ngày",
                    bg: "var(--sem-ex-bg)",
                    border: "var(--sem-ex-border)",
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.rating}
                  type="button"
                  disabled={!revealed}
                  onClick={() => handleRate(item.rating)}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition ${
                    revealed
                      ? "hover:-translate-y-0.5"
                      : "cursor-not-allowed opacity-45"
                  }`}
                  style={{
                    backgroundColor: item.bg,
                    borderColor: item.border,
                  }}
                >
                  <span className="text-xs font-semibold">{item.label}</span>
                  <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                    [{item.rating}] {item.next}
                  </span>
                </button>
              ))}
            </div>
            <p className="hidden text-center font-mono text-[11px] text-[var(--ink-muted)] sm:block">
              Nhấn Space để lật thẻ • Phím 1–4 để chấm mức độ nhớ
            </p>
          </footer>
        )}
      </div>
    </AppShell>
  );
}

export default function ReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="desk-dot flex min-h-screen items-center justify-center font-mono text-xs text-[var(--ink-muted)]">
          Đang chuẩn bị bộ thẻ ôn tập...
        </div>
      }
    >
      <ReviewDeckInner />
    </Suspense>
  );
}
