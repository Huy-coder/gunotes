"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  CheckCircle2,
  ListChecks,
  RotateCcw,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { HighlightText } from "@/components/ui/HighlightText";
import { FlashcardManagerModal } from "@/features/review/FlashcardManagerModal";
import { SEMANTIC_META } from "@/lib/semantic-styles";
import { computeNextSrs, isCardDueNow } from "@/lib/srs/sm2";
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
  const [managerOpen, setManagerOpen] = useState(false);
  const [swipeDx, setSwipeDx] = useState(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const deck = useMemo(() => {
    const now = Date.now();
    return flashcards.filter((fc) => {
      if (!isCardDueNow(fc, now)) return false;
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
    setSwipeDx(0);
    setCompletedCount((c) => c + 1);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (managerOpen) return;
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
  }, [currentCard, revealed, managerOpen, rateFlashcard]);

  const doneCount = Math.max(0, totalInFilter - deck.length);
  const progressPct =
    totalInFilter > 0 ? Math.round((doneCount / totalInFilter) * 100) : 100;

  const dynamicIntervals = useMemo(() => {
    if (!currentCard) return { 1: "10p", 2: "1 ngày", 3: "4 ngày", 4: "9 ngày" };
    return {
      1: "10p",
      2: `${computeNextSrs(currentCard, 2).intervalDays} ngày`,
      3: `${computeNextSrs(currentCard, 3).intervalDays} ngày`,
      4: `${computeNextSrs(currentCard, 4).intervalDays} ngày`,
    };
  }, [currentCard]);

  return (
    <AppShell>
      <div className="mx-auto flex min-h-[calc(100vh-80px)] max-w-3xl flex-col justify-between px-4 pt-5 pb-6 sm:px-6 sm:pt-7">
        {/* Top Progress Header */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
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

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setManagerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 font-mono text-[11px] font-medium hover:border-[var(--ink-primary)]"
              >
                <ListChecks className="h-3.5 w-3.5" />
                <span>Quản lý ({flashcards.length})</span>
              </button>

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
                <span className="hidden sm:inline">Chỉ ôn Bẫy hay sai</span>
                <span className="sm:hidden">Bẫy</span>
              </button>
            </div>
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

        {/* Central Index Card Stage (with Mobile Swipe support) */}
        <div className="my-auto py-8">
          {currentCard ? (
            <div className="relative mx-auto max-w-2xl">
              <div
                aria-hidden="true"
                className="absolute inset-x-4 -bottom-2.5 h-8 rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-paper)] opacity-70"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-2 -bottom-1.5 h-8 rounded-[18px] border border-[var(--border-hairline)] bg-[var(--bg-paper)] opacity-90"
              />

              <div
                onTouchStart={(e) => {
                  if (!revealed) return;
                  const t = e.touches[0];
                  touchStartRef.current = { x: t.clientX, y: t.clientY };
                }}
                onTouchMove={(e) => {
                  if (!revealed || !touchStartRef.current) return;
                  const t = e.touches[0];
                  const dx = t.clientX - touchStartRef.current.x;
                  const dy = Math.abs(t.clientY - touchStartRef.current.y);
                  if (dy > 45 && Math.abs(dx) < 25) return;
                  setSwipeDx(Math.max(-120, Math.min(120, dx)));
                }}
                onTouchEnd={() => {
                  if (revealed && Math.abs(swipeDx) > 75) {
                    handleRate(swipeDx < 0 ? 1 : 3);
                  } else {
                    setSwipeDx(0);
                  }
                  touchStartRef.current = null;
                }}
                style={{
                  transform:
                    swipeDx !== 0
                      ? `translateX(${swipeDx}px) rotate(${swipeDx * 0.04}deg)`
                      : undefined,
                }}
                className="paper-dot paper-shadow relative rounded-[20px] border border-[var(--border-hairline)] p-5 transition-transform duration-150 sm:p-8"
              >
                {swipeDx <= -40 && (
                  <div className="mb-3 rounded-full bg-[var(--sem-trap-bg)] px-3 py-1 text-center font-mono text-[11px] font-bold">
                    ← Thả ra: Quên rồi (Ôn lại ngay)
                  </div>
                )}
                {swipeDx >= 40 && (
                  <div className="mb-3 rounded-full bg-[var(--sem-ex-bg)] px-3 py-1 text-center font-mono text-[11px] font-bold">
                    Thả ra: Ổn áp →
                  </div>
                )}

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
                    <p className="text-center font-mono text-[10px] text-[var(--ink-muted)] sm:hidden">
                      Mẹo: Vuốt trái = Quên • Vuốt phải = Ổn áp
                    </p>
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
                {totalInFilter === 0
                  ? "Chưa có thẻ Flashcard nào"
                  : "Đã ôn xong toàn bộ thẻ đến hạn!"}
              </h2>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">
                {totalInFilter === 0
                  ? "Mở bất kỳ trang ghi chú nào và bấm 'Tạo bộ thẻ tự động' hoặc 'Thêm thẻ' để bắt đầu ôn tập SM-2."
                  : `Bạn vừa hoàn thành ${completedCount} lượt ôn tập. Thuật toán SM-2 đã hẹn lịch nhắc lại tối ưu.`}
              </p>
              <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
                {totalInFilter > 0 && (
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
                )}
                <button
                  type="button"
                  onClick={() => setManagerOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-semibold"
                >
                  <ListChecks className="h-3.5 w-3.5" />
                  <span>Quản lý thẻ</span>
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
                    next: dynamicIntervals[1],
                    bg: "var(--sem-trap-bg)",
                    border: "var(--sem-trap-border)",
                  },
                  {
                    rating: 2,
                    label: "Hơi khó",
                    next: dynamicIntervals[2],
                    bg: "var(--binder-sand-bg)",
                    border: "var(--binder-sand-border)",
                  },
                  {
                    rating: 3,
                    label: "Ổn áp",
                    next: dynamicIntervals[3],
                    bg: "var(--sem-def-bg)",
                    border: "var(--sem-def-border)",
                  },
                  {
                    rating: 4,
                    label: "Quá dễ",
                    next: dynamicIntervals[4],
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
              Nhấn Space để lật thẻ • Phím 1–4 để chấm mức độ nhớ (SM-2)
            </p>
          </footer>
        )}
      </div>

      <FlashcardManagerModal
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
      />
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
