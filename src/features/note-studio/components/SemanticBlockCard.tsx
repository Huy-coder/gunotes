"use client";

import React from "react";
import { ArrowDown, ArrowUp, Link2, Sigma, Trash2, X } from "lucide-react";
import { HighlightText } from "@/components/ui/HighlightText";
import { DiagramBlockView } from "@/features/diagrams/DiagramBlockView";
import { extractFirstLatex } from "@/features/note-studio/utils/note-studio-helpers";
import { SEMANTIC_META } from "@/lib/semantic-styles";
import type { CornellBlock, HighlightColor, Note } from "@/types/study";

export function SemanticBlockCard({
  noteId,
  block,
  isFirst,
  isLast,
  blurMode,
  isRevealed,
  isEditing,
  brushMode,
  brushColor,
  linkableOtherNotes,
  linkPickerBlockId,
  setLinkPickerBlockId,
  setEditingBlockId,
  clearSelectionPopup,
  onOpenFormulaModal,
  onMoveBlock,
  onUpdateBlock,
  onDeleteBlock,
  onToggleRevealBlock,
  onBrushApply,
  onTextareaKeyDown,
  onWikiLinkInserted,
  compact,
  hideBadge,
}: {
  noteId: string;
  block: CornellBlock;
  isFirst: boolean;
  isLast: boolean;
  blurMode: boolean;
  isRevealed: boolean;
  isEditing: boolean;
  brushMode: boolean;
  brushColor: HighlightColor | "cloze" | "clear";
  linkableOtherNotes: Note[];
  linkPickerBlockId: string | null;
  setLinkPickerBlockId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingBlockId: (id: string | null) => void;
  clearSelectionPopup: () => void;
  onOpenFormulaModal: (blockId: string, initialLatex: string) => void;
  onMoveBlock: (noteId: string, blockId: string, dir: "up" | "down") => void;
  onUpdateBlock: (
    noteId: string,
    blockId: string,
    patch: Partial<CornellBlock>
  ) => void;
  onDeleteBlock: (noteId: string, blockId: string) => void;
  onToggleRevealBlock: (blockId: string) => void;
  onBrushApply: (
    noteId: string,
    block: CornellBlock,
    selected: string,
    mode: HighlightColor | "cloze" | "clear"
  ) => void;
  onTextareaKeyDown: (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    block: CornellBlock
  ) => void;
  onWikiLinkInserted: (targetTitle: string) => void;
  compact?: boolean;
  hideBadge?: boolean;
}) {
  const meta = SEMANTIC_META[block.type];
  const shouldBlur = blurMode && !isRevealed;

  return (
    <div
      data-block-id={block.id}
      onClick={() => {
        if (shouldBlur) onToggleRevealBlock(block.id);
      }}
      className={`relative rounded-xl border transition ${
        compact ? "p-3" : "p-3.5 sm:p-4"
      } ${shouldBlur ? "cursor-pointer" : ""} ${
        brushMode && !blurMode
          ? "cursor-text ring-1 ring-[var(--ink-primary)]/15"
          : ""
      }`}
      style={{
        backgroundColor: meta.bgVar,
        borderColor: meta.borderVar,
      }}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        {!hideBadge ? (
          <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
            {block.title ?? meta.badge}
          </span>
        ) : (
          <span />
        )}

        <div className="no-print flex items-center gap-0.5 opacity-100 transition lg:opacity-0 lg:group-hover:opacity-100">
          {!blurMode && (
            <>
              <button
                type="button"
                disabled={isFirst}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveBlock(noteId, block.id, "up");
                }}
                title="Di chuyển khối lên"
                className="rounded p-1 text-[var(--ink-muted)] hover:bg-black/10 hover:text-[var(--ink-primary)] disabled:opacity-30"
              >
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                disabled={isLast}
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveBlock(noteId, block.id, "down");
                }}
                title="Di chuyển khối xuống"
                className="rounded p-1 text-[var(--ink-muted)] hover:bg-black/10 hover:text-[var(--ink-primary)] disabled:opacity-30"
              >
                <ArrowDown className="h-3 w-3" />
              </button>
              {block.type !== "diagram" && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFormulaModal(
                        block.id,
                        extractFirstLatex(block.content)
                      );
                    }}
                    title="Chèn / Sửa công thức KaTeX"
                    className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-mono text-[10px] hover:bg-black/10"
                  >
                    <Sigma className="h-3 w-3" />
                    <span>fx</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBlockId(isEditing ? null : block.id);
                      clearSelectionPopup();
                    }}
                    className="rounded px-1.5 py-0.5 font-mono text-[10px] hover:bg-black/10"
                  >
                    {isEditing ? "Xong" : "Sửa"}
                  </button>
                </>
              )}
            </>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDeleteBlock(noteId, block.id);
            }}
            className="rounded p-1 text-[var(--ink-muted)] hover:bg-black/10 hover:text-[var(--ink-primary)]"
            title="Xóa khối"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {block.type === "diagram" && block.diagram ? (
        <div
          className={shouldBlur ? "blur-recall-mask" : "blur-recall-revealed"}
        >
          <DiagramBlockView
            diagram={block.diagram}
            canvasGraph={block.canvasGraph}
            viewMode={block.diagramViewMode}
            onPatch={(patch) => onUpdateBlock(noteId, block.id, patch)}
          />
        </div>
      ) : isEditing && !blurMode ? (
        <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            rows={3}
            autoFocus
            value={block.content}
            onKeyDown={(e) => onTextareaKeyDown(e, block)}
            onMouseUp={(e) => {
              if (!brushMode) return;
              const el = e.currentTarget;
              const start = el.selectionStart;
              const end = el.selectionEnd;
              if (start === end) return;
              const selected = block.content.slice(start, end);
              if (!selected.trim()) return;
              onBrushApply(noteId, block, selected, brushColor);
            }}
            onChange={(e) =>
              onUpdateBlock(noteId, block.id, { content: e.target.value })
            }
            className={`w-full resize-y rounded-lg bg-[var(--bg-elevated)]/80 p-2 text-sm leading-relaxed outline-none ${
              block.type === "formula" ? "font-mono text-[13px]" : ""
            }`}
          />
          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[var(--ink-muted)]">
            <span>
              Mẹo: Ctrl+H tô vàng • Ctrl+Shift+C ẩn chữ • $...$ toán • [[Trang]]
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setLinkPickerBlockId((cur) =>
                    cur === block.id ? null : block.id
                  )
                }
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-0.5 font-semibold text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
              >
                <Link2 className="h-3 w-3" />
                <span>+ [[Liên kết trang]]</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onOpenFormulaModal(block.id, extractFirstLatex(block.content))
                }
                className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-0.5 font-semibold text-[var(--ink-primary)]"
              >
                + Bàn phím toán fx
              </button>
            </div>
          </div>

          {linkPickerBlockId === block.id && (
            <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-2">
              <div className="mb-1 flex items-center justify-between px-1 font-mono text-[10px] font-bold text-[var(--ink-muted)] uppercase">
                <span>Chọn trang muốn liên kết tới [[...]]</span>
                <button
                  type="button"
                  onClick={() => setLinkPickerBlockId(null)}
                  className="rounded p-0.5 hover:bg-[var(--bg-desk)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="max-h-36 space-y-1 overflow-y-auto">
                {linkableOtherNotes.map((targetNote) => (
                  <button
                    key={targetNote.id}
                    type="button"
                    onClick={() => {
                      const sep =
                        block.content.trim().length > 0 &&
                        !/\s$/.test(block.content)
                          ? " "
                          : "";
                      onUpdateBlock(noteId, block.id, {
                        content: `${block.content}${sep}[[${targetNote.title}]]`,
                      });
                      setLinkPickerBlockId(null);
                      onWikiLinkInserted(targetNote.title);
                    }}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-xs hover:bg-[var(--bg-desk)]"
                  >
                    <span className="truncate font-semibold">
                      {targetNote.title}
                    </span>
                    <span className="shrink-0 font-mono text-[10px] text-[var(--ink-muted)]">
                      + Chèn
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onDoubleClick={() => {
            if (!blurMode && !brushMode) setEditingBlockId(block.id);
          }}
          className={`text-sm leading-relaxed ${
            shouldBlur ? "blur-recall-mask" : "blur-recall-revealed"
          }`}
        >
          <HighlightText text={block.content} blurMode={blurMode} />
        </div>
      )}

      {shouldBlur && (
        <div className="absolute inset-0 flex items-center justify-center rounded-xl">
          <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/95 px-3 py-1 font-mono text-[11px] font-semibold shadow-xs">
            Chạm để soi đáp án
          </span>
        </div>
      )}
    </div>
  );
}
