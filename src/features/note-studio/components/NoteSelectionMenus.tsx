"use client";

import React from "react";
import { BookmarkPlus, Eraser, Undo2, X } from "lucide-react";
import type { SelectionPopupState } from "@/features/note-studio/utils/note-studio-helpers";
import { HIGHLIGHT_COLORS } from "@/lib/semantic-styles";
import type { CornellBlock, HighlightColor } from "@/types/study";

export function NoteSelectionMenus({
  selectionPopup,
  selectedBlock,
  brushMode,
  brushColor,
  highlightHistoryCount,
  onSetBrushColor,
  onCloseBrushMode,
  onUndoHighlight,
  onApplyHighlight,
  onCreateFlashcard,
  onClosePopup,
}: {
  selectionPopup: SelectionPopupState | null;
  selectedBlock: CornellBlock | undefined;
  brushMode: boolean;
  brushColor: HighlightColor | "cloze" | "clear";
  highlightHistoryCount: number;
  onSetBrushColor: (color: HighlightColor | "cloze" | "clear") => void;
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
          className="no-print fixed right-3 bottom-[70px] left-3 z-40 flex items-center justify-between gap-1.5 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2 shadow-xl sm:hidden"
        >
          <div className="flex items-center gap-1.5">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() =>
                  onApplyHighlight(selectedBlock, selectionPopup.text, c.id)
                }
                className="h-6 w-6 rounded-full border border-black/15"
                style={{ backgroundColor: c.cssVar }}
                aria-label={`Tô màu ${c.label}`}
              />
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                onApplyHighlight(selectedBlock, selectionPopup.text, "cloze")
              }
              className="rounded-full border border-[var(--border-hairline)] px-2.5 py-1 font-mono text-[10px] font-semibold"
            >
              Che chữ
            </button>
            <button
              type="button"
              onClick={() =>
                onCreateFlashcard(selectedBlock, selectionPopup.text)
              }
              className="rounded-full bg-[var(--accent-primary)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--accent-primary-fg)]"
            >
              + Thẻ
            </button>
            <button
              type="button"
              onClick={() =>
                onApplyHighlight(selectedBlock, selectionPopup.text, "clear")
              }
              className="p-1 text-[var(--ink-muted)]"
              aria-label="Xóa tô"
            >
              <Eraser className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {brushMode && (
        <div
          data-highlight-ui="true"
          className="no-print pointer-events-none fixed right-0 bottom-[66px] left-0 z-30 flex justify-center px-3 lg:left-[232px]"
        >
          <div className="paper-shadow pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/98 px-3.5 py-2 backdrop-blur-md">
            <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
              Bút nhớ đang bật:
            </span>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSetBrushColor(c.id)}
                  className={`flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-semibold transition ${
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
                className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
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
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                  brushColor === "clear"
                    ? "border-[var(--ink-primary)] bg-[var(--sem-trap-bg)] text-[var(--ink-primary)]"
                    : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--ink-muted)]"
                }`}
              >
                <Eraser className="h-3 w-3" />
                <span>Xóa màu</span>
              </button>
              <button
                type="button"
                disabled={highlightHistoryCount === 0}
                onClick={onUndoHighlight}
                title="Hoàn tác thao tác tô vừa rồi (Ctrl/Cmd+Z)"
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--ink-primary)] transition hover:border-[var(--ink-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Undo2 className="h-3 w-3" />
                <span>Hoàn tác</span>
                {highlightHistoryCount > 0 && (
                  <span className="rounded-full bg-[var(--bg-desk)] px-1 text-[9px]">
                    {highlightHistoryCount}
                  </span>
                )}
              </button>
            </div>
            <span className="hidden font-mono text-[10px] text-[var(--ink-muted)] sm:inline">
              • Bôi đen chữ bất kỳ để tô ngay
            </span>
            <button
              type="button"
              onClick={onCloseBrushMode}
              title="Tắt Bút nhớ"
              className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
