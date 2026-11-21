"use client";

import React from "react";
import { BookmarkPlus, Eraser, Highlighter, Undo2, X } from "lucide-react";
import type { PendingBrushSelection } from "@/features/note-studio/hooks/useNoteHighlighting";
import type { SelectionPopupState } from "@/features/note-studio/utils/note-studio-helpers";
import { HIGHLIGHT_COLORS } from "@/lib/semantic-styles";
import type { CornellBlock, HighlightColor } from "@/types/study";

export function NoteSelectionMenus({
  selectionPopup,
  selectedBlock,
  pendingBrushSelection,
  brushMode,
  brushColor,
  highlightHistoryCount,
  onSetBrushColor,
  onApplyPendingBrush,
  onCloseBrushMode,
  onUndoHighlight,
  onApplyHighlight,
  onCreateFlashcard,
  onClosePopup,
}: {
  selectionPopup: SelectionPopupState | null;
  selectedBlock: CornellBlock | undefined;
  pendingBrushSelection: PendingBrushSelection | null;
  brushMode: boolean;
  brushColor: HighlightColor | "cloze" | "clear";
  highlightHistoryCount: number;
  onSetBrushColor: (color: HighlightColor | "cloze" | "clear") => void;
  onApplyPendingBrush: () => void;
  onCloseBrushMode: () => void;
  onUndoHighlight: () => void;
  onApplyHighlight: (
    block: CornellBlock,
    text: string,
    mode: HighlightColor | "cloze" | "clear"
  ) => void;
  onCreateFlashcard: (block: CornellBlock, snippet?: string) => void;
  onClosePopup: () => void;
}) {
  return (
    <>
      {selectionPopup && selectedBlock && !brushMode && (
        <div
          data-highlight-ui="true"
          className="no-print fixed z-40 hidden -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1.5 shadow-xl sm:flex"
          style={{
            left: selectionPopup.x,
            top: selectionPopup.y,
          }}
        >
          {HIGHLIGHT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              title={`Tô màu ${c.label}`}
              onClick={() =>
                onApplyHighlight(selectedBlock, selectionPopup.text, c.id)
              }
              className="h-5 w-5 rounded-full border border-black/15 transition hover:scale-115"
              style={{ backgroundColor: c.cssVar }}
            />
          ))}
          <div className="mx-0.5 h-4 w-[1px] bg-[var(--border-hairline)]" />
          <button
            type="button"
            onClick={() =>
              onApplyHighlight(selectedBlock, selectionPopup.text, "cloze")
            }
            className="rounded-full px-2 py-1 font-mono text-[11px] font-semibold hover:bg-[var(--bg-desk)]"
          >
            Che chữ
          </button>
          <button
            type="button"
            onClick={() =>
              onCreateFlashcard(selectedBlock, selectionPopup.text)
            }
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-[11px] font-semibold hover:bg-[var(--bg-desk)]"
          >
            <BookmarkPlus className="h-3 w-3" />
            <span>+ Thẻ</span>
          </button>
          <button
            type="button"
            title="Xóa tô màu"
            onClick={() =>
              onApplyHighlight(selectedBlock, selectionPopup.text, "clear")
            }
            className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
          >
            <Eraser className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClosePopup}
            className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {selectionPopup && selectedBlock && !brushMode && (
        <div
          data-highlight-ui="true"
          className="no-print fixed right-3 bottom-[74px] left-3 z-40 flex items-center justify-between gap-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2.5 shadow-xl sm:hidden"
        >
          <div className="flex items-center gap-2">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  onApplyHighlight(selectedBlock, selectionPopup.text, c.id)
                }
                className="h-8 w-8 rounded-full border border-black/15"
                style={{ backgroundColor: c.cssVar }}
                aria-label={`Tô màu ${c.label}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onApplyHighlight(selectedBlock, selectionPopup.text, "cloze")
              }
              className="min-h-[34px] rounded-full border border-[var(--border-hairline)] px-3 py-1 font-mono text-[11px] font-semibold"
            >
              Che chữ
            </button>
            <button
              type="button"
              onClick={() =>
                onCreateFlashcard(selectedBlock, selectionPopup.text)
              }
              className="min-h-[34px] rounded-full bg-[var(--accent-primary)] px-3 py-1 font-mono text-[11px] font-semibold text-[var(--accent-primary-fg)]"
            >
              + Thẻ
            </button>
            <button
              type="button"
              onClick={() =>
                onApplyHighlight(selectedBlock, selectionPopup.text, "clear")
              }
              className="inline-flex min-h-[34px] min-w-[34px] items-center justify-center rounded-full text-[var(--ink-muted)]"
              aria-label="Xóa tô"
            >
              <Eraser className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {brushMode && (
        <div
          data-highlight-ui="true"
          className="no-print pointer-events-none fixed right-0 bottom-[72px] left-0 z-30 flex flex-col items-center gap-2 px-3 lg:left-[232px]"
        >
          {pendingBrushSelection && (
            <button
              type="button"
              onClick={onApplyPendingBrush}
              className="paper-shadow pointer-events-auto inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-[var(--ink-primary)] bg-[var(--hl-yellow)] px-4 py-1.5 font-mono text-xs font-bold text-[var(--ink-primary)] transition hover:brightness-95"
            >
              <Highlighter className="h-3.5 w-3.5" />
              <span>Tô đoạn đang chọn</span>
            </button>
          )}

          <div className="paper-shadow pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/98 px-3.5 py-2.5 backdrop-blur-md">
            <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
              Bút nhớ đang bật:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSetBrushColor(c.id)}
                  className={`flex min-h-[36px] items-center gap-1 rounded-full border px-3 text-[11px] font-semibold transition sm:min-h-[28px] sm:px-2.5 sm:text-[10px] ${
                    brushColor === c.id
                      ? "border-[var(--ink-primary)] ring-2 ring-[var(--ink-primary)]/20"
                      : "border-black/10"
                  }`}
                  style={{ backgroundColor: c.cssVar }}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => onSetBrushColor("cloze")}
                className={`min-h-[36px] rounded-full border px-3 py-1 font-mono text-[11px] font-semibold sm:min-h-[28px] sm:px-2.5 sm:text-[10px] ${
                  brushColor === "cloze"
                    ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                    : "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                }`}
              >
                Che Cloze
              </button>
              <button
                type="button"
                onClick={() => onSetBrushColor("clear")}
                className={`inline-flex min-h-[36px] items-center gap-1 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold sm:min-h-[28px] sm:px-2.5 sm:text-[10px] ${
                  brushColor === "clear"
                    ? "border-[var(--ink-primary)] bg-[var(--sem-trap-bg)] text-[var(--ink-primary)]"
                    : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--ink-muted)]"
                }`}
              >
                <Eraser className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                <span>Xóa màu</span>
              </button>
              <button
                type="button"
                disabled={highlightHistoryCount === 0}
                onClick={onUndoHighlight}
                title="Hoàn tác thao tác tô vừa rồi (Ctrl/Cmd+Z)"
                className="inline-flex min-h-[36px] items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-1 font-mono text-[11px] font-semibold text-[var(--ink-primary)] transition hover:border-[var(--ink-primary)] disabled:cursor-not-allowed disabled:opacity-40 sm:min-h-[28px] sm:px-2.5 sm:text-[10px]"
              >
                <Undo2 className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
                <span>Hoàn tác</span>
                {highlightHistoryCount > 0 && (
                  <span className="rounded-full bg-[var(--bg-desk)] px-1.5 text-[10px]">
                    {highlightHistoryCount}
                  </span>
                )}
              </button>
            </div>
            <span className="font-mono text-[10px] text-[var(--ink-muted)]">
              • Chạm 1 từ để tô nhanh • Hoặc bôi đen đoạn
            </span>
            <button
              type="button"
              onClick={onCloseBrushMode}
              title="Tắt Bút nhớ"
              className="inline-flex min-h-[32px] min-w-[32px] items-center justify-center rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
