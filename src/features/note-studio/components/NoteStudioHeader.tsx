"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Brain,
  ChevronRight,
  Eye,
  EyeOff,
  HelpCircle,
  Layers,
  MoreHorizontal,
  Network,
  Palette,
  PanelLeftOpen,
  Printer,
  RotateCcw,
  Share2,
  Timer,
} from "lucide-react";
import {
  formatTimer,
  type MobileTab,
} from "@/features/note-studio/utils/note-studio-helpers";
import { PAPER_STYLE_META } from "@/lib/semantic-styles";
import type { Binder, Note, NoteTemplate, PaperStyle } from "@/types/study";

export function NoteStudioHeader({
  sidebarOpen,
  onOpenSidebar,
  binder,
  note,
  activeTemplate,
  mobileTab,
  onChangeMobileTab,
  blurMode,
  revealedCount,
  totalBlocks,
  onToggleBlur,
  onResetReveals,
  onOpenVisualize,
  onOpenBlurting,
  onOpenQuiz,
  onGenerateDeck,
  onOpenShare,
  secondsLeft,
  isTimerRunning,
  onUpdatePaper,
  onOpenCustomize,
}: {
  sidebarOpen: boolean;
  onOpenSidebar: () => void;
  binder: Binder;
  note: Note;
  activeTemplate: NoteTemplate;
  mobileTab: MobileTab;
  onChangeMobileTab: (tab: MobileTab) => void;
  blurMode: boolean;
  revealedCount: number;
  totalBlocks: number;
  onToggleBlur: () => void;
  onResetReveals: () => void;
  onOpenVisualize: () => void;
  onOpenBlurting: () => void;
  onOpenQuiz: () => void;
  onGenerateDeck: () => void;
  onOpenShare: () => void;
  secondsLeft: number;
  isTimerRunning: boolean;
  onUpdatePaper: (paperStyle: PaperStyle) => void;
  onOpenCustomize: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const handleOutside = (e: Event) => {
      const target = e.target as Node | null;
      if (moreContainerRef.current && target && moreContainerRef.current.contains(target)) {
        return;
      }
      setMoreOpen(false);
    };
    document.addEventListener("pointerdown", handleOutside, true);
    return () => document.removeEventListener("pointerdown", handleOutside, true);
  }, [moreOpen]);

  return (
    <header className="no-print sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          {!sidebarOpen && (
            <button
              type="button"
              onClick={onOpenSidebar}
              className="hidden rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] xl:inline-flex"
              title="Mở mục lục sổ"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}

          <Link
            href={`/binder/${binder.id}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-1 text-xs font-medium whitespace-nowrap text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)] sm:px-2"
          >
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="max-w-[110px] truncate sm:max-w-[180px]">
              {binder.title}
            </span>
          </Link>

          {!sidebarOpen && (
            <>
              <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-[var(--ink-muted)] sm:inline" />
              <span className="hidden max-w-[180px] truncate text-xs font-semibold sm:inline">
                {note.title}
              </span>
            </>
          )}
          <span className="hidden shrink-0 rounded-full bg-[var(--bg-desk)] px-2 py-0.5 font-mono text-[10px] whitespace-nowrap text-[var(--ink-muted)] 2xl:inline">
            {note.updatedAt}
          </span>
        </div>

        <div className="relative flex shrink-0 items-center gap-1.5">
          <div className="hidden items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-desk)] p-0.5 2xl:flex">
            {PAPER_STYLE_META.map((ps) => (
              <button
                key={ps.id}
                type="button"
                title={ps.hint}
                onClick={() => onUpdatePaper(ps.id)}
                className={`rounded-full px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap transition ${
                  note.paperStyle === ps.id
                    ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] shadow-2xs"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                {ps.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onOpenVisualize}
            title="Trực quan hóa toàn bộ liên kết ý tưởng của trang (Zoom / Pan / Cross-link)"
            className="inline-flex items-center gap-1 rounded-full border border-[var(--ink-primary)] bg-[var(--hl-yellow)] px-2.5 py-1.5 font-mono text-[11px] font-bold whitespace-nowrap text-[var(--ink-primary)] shadow-2xs transition hover:brightness-95"
          >
            <Network className="h-3.5 w-3.5 shrink-0" />
            <span>Visualize</span>
          </button>

          <button
            type="button"
            onClick={onToggleBlur}
            title="Che để nhớ (phím R)"
            className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 font-mono text-[11px] font-semibold whitespace-nowrap transition ${
              blurMode
                ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                : "border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] hover:border-[var(--ink-muted)]"
            }`}
          >
            {blurMode ? (
              <EyeOff className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <Eye className="h-3.5 w-3.5 shrink-0" />
            )}
            <span className="xl:hidden">
              {blurMode ? `${revealedCount}/${totalBlocks}` : "Che"}
            </span>
            <span className="hidden xl:inline">
              {blurMode
                ? `Đang che (${revealedCount}/${totalBlocks})`
                : "Che để nhớ (R)"}
            </span>
          </button>

          {blurMode && revealedCount > 0 && (
            <button
              type="button"
              onClick={onResetReveals}
              title="Che lại tất cả"
              className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Primary desktop actions visible comfortably at 1280px+ */}
          <button
            type="button"
            onClick={onOpenBlurting}
            title="Xả não 5 phút & đối chiếu bản gốc (Blurting)"
            className="hidden items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap text-[var(--ink-primary)] transition hover:border-[var(--ink-muted)] lg:flex"
          >
            <Brain className="h-3.5 w-3.5 shrink-0" />
            <span>Xả não</span>
          </button>

          <button
            type="button"
            onClick={onOpenQuiz}
            title="Trắc nghiệm nhanh từ nội dung trang"
            className="hidden items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap text-[var(--ink-primary)] transition hover:border-[var(--ink-muted)] xl:flex"
          >
            <HelpCircle className="h-3.5 w-3.5 shrink-0" />
            <span>Quiz</span>
          </button>

          <button
            type="button"
            onClick={onGenerateDeck}
            title="Tạo bộ Flashcard tự động từ highlight & Cloze trong trang"
            className="hidden items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap text-[var(--ink-primary)] transition hover:border-[var(--ink-muted)] xl:flex"
          >
            <Layers className="h-3.5 w-3.5 shrink-0" />
            <span>Tạo thẻ</span>
          </button>

          {/* Extra inline actions only on very wide 2xl screens so 1280px never clips */}
          <button
            type="button"
            onClick={onOpenShare}
            title="Chia sẻ link & Xuất thẻ ảnh Studygram (.png)"
            className="hidden items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap text-[var(--ink-primary)] transition hover:border-[var(--ink-muted)] 2xl:flex"
          >
            <Share2 className="h-3.5 w-3.5 shrink-0" />
            <span>Chia sẻ</span>
          </button>

          <Link
            href="/focus"
            className="hidden items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1.5 font-mono text-[11px] font-medium tabular-nums 2xl:flex"
            title={`Mở Phòng Tập trung (${formatTimer(secondsLeft)})`}
          >
            <Timer
              className={`h-3.5 w-3.5 ${
                isTimerRunning
                  ? "text-[var(--accent-ring)]"
                  : "text-[var(--ink-muted)]"
              }`}
            />
            <span>{formatTimer(secondsLeft)}</span>
          </Link>

          <button
            type="button"
            onClick={() => window.print()}
            title="Xuất PDF / In khổ giấy"
            className="hidden rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] 2xl:inline-flex"
          >
            <Printer className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onOpenCustomize}
            title="Độ trang & Sticker"
            className="hidden items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1.5 text-[11px] font-medium hover:border-[var(--ink-muted)] 2xl:flex"
          >
            <Palette className="h-3.5 w-3.5" />
            <span>Độ trang</span>
          </button>

          {/* Overflow Menu for Mobile, Tablet & 1280px Laptops */}
          <div ref={moreContainerRef} className="relative 2xl:hidden">
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-label="Thêm công cụ"
              className="inline-flex items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-1.5 text-[var(--ink-primary)]"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {moreOpen && (
              <div className="paper-shadow absolute top-11 right-0 z-50 w-64 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-2">
                <div className="px-2 py-1 font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                  Kiểu mặt giấy
                </div>
                <div className="mb-2 grid grid-cols-2 gap-1 px-1">
                  {PAPER_STYLE_META.map((ps) => (
                    <button
                      key={ps.id}
                      type="button"
                      onClick={() => {
                        onUpdatePaper(ps.id);
                        setMoreOpen(false);
                      }}
                      className={`rounded-lg border px-2 py-1.5 text-left text-xs font-medium ${
                        note.paperStyle === ps.id
                          ? "border-[var(--ink-primary)] bg-[var(--bg-paper)] text-[var(--ink-primary)]"
                          : "border-[var(--border-hairline)] text-[var(--ink-muted)]"
                      }`}
                    >
                      {ps.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-[var(--border-hairline)] pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onOpenBlurting();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium hover:bg-[var(--bg-desk)]"
                  >
                    <Brain className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    <span>Xả não 5 phút (Blurting)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onOpenQuiz();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium hover:bg-[var(--bg-desk)]"
                  >
                    <HelpCircle className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    <span>Trắc nghiệm nhanh (Quiz)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onGenerateDeck();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium hover:bg-[var(--bg-desk)]"
                  >
                    <Layers className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    <span>Tạo bộ thẻ Flashcard</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onOpenShare();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium hover:bg-[var(--bg-desk)]"
                  >
                    <Share2 className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    <span>Chia sẻ & Xuất ảnh (.png)</span>
                  </button>
                  <Link
                    href="/focus"
                    onClick={() => setMoreOpen(false)}
                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium hover:bg-[var(--bg-desk)]"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Timer className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                      <span>Phòng Tập trung</span>
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-[var(--ink-muted)]">
                      {formatTimer(secondsLeft)}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      onOpenCustomize();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium hover:bg-[var(--bg-desk)]"
                  >
                    <Palette className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    <span>Độ trang & Sticker</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false);
                      window.print();
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium hover:bg-[var(--bg-desk)]"
                  >
                    <Printer className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
                    <span>Xuất PDF / In khổ giấy</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {activeTemplate === "cornell" && (
        <div className="flex border-t border-[var(--border-hairline)] px-3 py-1.5 lg:hidden">
          <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-1 rounded-full bg-[var(--bg-desk)] p-0.5">
            {(
              [
                { id: "all", label: "Tất cả (Cornell)" },
                { id: "cues", label: "Chỉ Từ khóa" },
                { id: "summary", label: "Tóm tắt" },
              ] as Array<{ id: MobileTab; label: string }>
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onChangeMobileTab(t.id)}
                className={`rounded-full py-1 text-[11px] font-medium transition ${
                  mobileTab === t.id
                    ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] shadow-2xs"
                    : "text-[var(--ink-muted)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
