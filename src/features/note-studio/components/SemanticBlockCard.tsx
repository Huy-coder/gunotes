"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  Link2,
  Sigma,
  Trash2,
  X,
} from "lucide-react";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { HighlightText } from "@/components/ui/HighlightText";
import { createDiagramPreset } from "@/features/diagrams/presets";
import { DiagramBlockView } from "@/features/diagrams/DiagramBlockView";
import { BlockFormattingBar } from "@/features/note-studio/components/BlockFormattingBar";
import { ImageBlockView } from "@/features/note-studio/components/ImageBlockView";
import { InlineSlashMenu } from "@/features/note-studio/components/InlineSlashMenu";
import {
  DIAGRAM_PRESET_META,
  extractFirstLatex,
  getBlockPlaceholder,
  SLASH_COMMANDS,
  type SlashCommandItem,
} from "@/features/note-studio/utils/note-studio-helpers";
import { SEMANTIC_META } from "@/lib/semantic-styles";
import type {
  BlockType,
  CornellBlock,
  DiagramData,
  HighlightColor,
  Note,
} from "@/types/study";

export function SemanticBlockCard({
  noteId,
  block,
  isFirst,
  isLast,
  isOnlyBlock,
  blurMode,
  isRevealed,
  isEditing,
  highlighted = false,
  focusCaret = "end",
  brushMode,
  brushColor,
  linkableOtherNotes,
  linkPickerBlockId,
  setLinkPickerBlockId,
  setEditingBlockId,
  clearSelectionPopup,
  onOpenFormulaModal,
  onOpenImagePicker,
  onMoveBlock,
  onReorderBlock,
  onUpdateBlock,
  onDeleteBlock,
  onInsertBlockAfter,
  onInsertDiagramAfter,
  onFocusAdjacent,
  onDeleteEmptyAndFocusPrev,
  onToggleRevealBlock,
  onBrushApply,
  onBrushTapWord,
  onRecordUndo,
  onTextareaKeyDown,
  onWikiLinkInserted,
  compact,
  hideBadge,
}: {
  noteId: string;
  block: CornellBlock;
  isFirst: boolean;
  isLast: boolean;
  isOnlyBlock: boolean;
  blurMode: boolean;
  isRevealed: boolean;
  isEditing: boolean;
  highlighted?: boolean;
  focusCaret?: "start" | "end";
  brushMode: boolean;
  brushColor: HighlightColor | "cloze" | "clear";
  linkableOtherNotes: Note[];
  linkPickerBlockId: string | null;
  setLinkPickerBlockId: React.Dispatch<React.SetStateAction<string | null>>;
  setEditingBlockId: (id: string | null, caret?: "start" | "end") => void;
  clearSelectionPopup: () => void;
  onOpenFormulaModal: (blockId: string, initialLatex: string) => void;
  onOpenImagePicker: (afterBlockId: string) => void;
  onMoveBlock: (noteId: string, blockId: string, dir: "up" | "down") => void;
  onReorderBlock: (
    noteId: string,
    fromBlockId: string,
    toBlockId: string
  ) => void;
  onUpdateBlock: (
    noteId: string,
    blockId: string,
    patch: Partial<CornellBlock>
  ) => void;
  onDeleteBlock: (noteId: string, blockId: string) => void;
  onInsertBlockAfter: (afterBlockId: string, type?: BlockType) => void;
  onInsertDiagramAfter: (
    afterBlockId: string,
    kind: DiagramData["kind"]
  ) => void;
  onFocusAdjacent: (blockId: string, dir: "prev" | "next") => void;
  onDeleteEmptyAndFocusPrev: (blockId: string) => void;
  onToggleRevealBlock: (blockId: string) => void;
  onBrushApply: (
    noteId: string,
    block: CornellBlock,
    selected: string,
    mode: HighlightColor | "cloze" | "clear"
  ) => void;
  onBrushTapWord: (
    block: CornellBlock,
    clientX: number,
    clientY: number,
    containerEl: HTMLElement
  ) => void;
  onRecordUndo: (blockId: string, prevContent: string) => void;
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
  const isFramelessText = block.type === "text";

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [slashState, setSlashState] = useState<{
    query: string;
    start: number;
    end: number;
  } | null>(null);
  const [slashIndex, setSlashIndex] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // Focus & position caret cleanly when entering edit mode
  useEffect(() => {
    if (!isEditing) {
      setSlashState(null);
      return;
    }
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const pos = focusCaret === "start" ? 0 : el.value.length;
    el.setSelectionRange(pos, pos);
  }, [isEditing, focusCaret]);

  const filteredSlashCommands = useMemo(() => {
    if (!slashState) return [];
    const q = slashState.query.trim().toLowerCase();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.keywords.some((kw) => kw.includes(q))
    );
  }, [slashState]);

  const updateSlashTrigger = (val: string, caret: number) => {
    const lineStart = val.lastIndexOf("\n", Math.max(0, caret - 1)) + 1;
    const beforeCaretOnLine = val.slice(lineStart, caret);
    const match = /^\/([^\s]*)$/.exec(beforeCaretOnLine);
    if (match) {
      setSlashState({
        query: match[1].toLowerCase(),
        start: lineStart,
        end: caret,
      });
      setSlashIndex(0);
    } else {
      setSlashState(null);
    }
  };

  const executeSlashCommand = (item: SlashCommandItem) => {
    let cleaned = block.content;
    if (slashState) {
      cleaned = (
        block.content.slice(0, slashState.start) +
        block.content.slice(slashState.end)
      ).replace(/\n+$/, "");
    }
    setSlashState(null);

    if (item.action.kind === "formula") {
      if (cleaned !== block.content) {
        onUpdateBlock(noteId, block.id, { content: cleaned });
      }
      onOpenFormulaModal(block.id, extractFirstLatex(cleaned));
      return;
    }

    if (item.action.kind === "image") {
      if (cleaned !== block.content) {
        onUpdateBlock(noteId, block.id, { content: cleaned });
      }
      onOpenImagePicker(block.id);
      return;
    }

    if (item.action.kind === "diagram") {
      if (!cleaned.trim()) {
        const info = DIAGRAM_PRESET_META[item.action.diagramKind];
        onUpdateBlock(noteId, block.id, {
          type: "diagram",
          title: info.title,
          cue: block.cue || info.cue,
          content: info.title,
          diagram: createDiagramPreset(item.action.diagramKind),
        });
        setEditingBlockId(null);
      } else {
        onUpdateBlock(noteId, block.id, { content: cleaned });
        onInsertDiagramAfter(block.id, item.action.diagramKind);
      }
      return;
    }

    // item.action.kind === "block"
    const nextType = item.action.blockType;
    if (!cleaned.trim()) {
      onUpdateBlock(noteId, block.id, {
        type: nextType,
        title: SEMANTIC_META[nextType].badge,
        content: "",
      });
      requestAnimationFrame(() => textareaRef.current?.focus());
    } else {
      onUpdateBlock(noteId, block.id, { content: cleaned });
      onInsertBlockAfter(block.id, nextType);
    }
  };

  const handleWrapSelection = (mode: HighlightColor | "cloze") => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    onRecordUndo(block.id, block.content);

    if (start !== end) {
      const selected = block.content.slice(start, end);
      const wrapped =
        mode === "cloze" ? `{{${selected}}}` : `==${mode}:${selected}==`;
      const next =
        block.content.slice(0, start) + wrapped + block.content.slice(end);
      onUpdateBlock(noteId, block.id, { content: next });
      const nextCaret = start + wrapped.length;
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(nextCaret, nextCaret);
      });
      return;
    }

    const token = "từ khóa";
    const snippet =
      mode === "cloze" ? `{{${token}}}` : `==${mode}:${token}==`;
    const prefixLen = mode === "cloze" ? 2 : 5;
    const next =
      block.content.slice(0, start) + snippet + block.content.slice(end);
    onUpdateBlock(noteId, block.id, { content: next });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefixLen, start + prefixLen + token.length);
    });
  };

  const handleChangeBlockType = (nextType: BlockType) => {
    onUpdateBlock(noteId, block.id, {
      type: nextType,
      title: SEMANTIC_META[nextType].badge,
    });
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 1. Inline slash menu navigation
    if (slashState && filteredSlashCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIndex((i) => (i + 1) % filteredSlashCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIndex(
          (i) =>
            (i - 1 + filteredSlashCommands.length) %
            filteredSlashCommands.length
        );
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const chosen =
          filteredSlashCommands[slashIndex] ?? filteredSlashCommands[0];
        if (chosen) executeSlashCommand(chosen);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setSlashState(null);
        return;
      }
    }

    // 2. Quick new block right below: Ctrl/Cmd + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      onInsertBlockAfter(block.id, "text");
      return;
    }

    // 3. Backspace on empty block deletes & returns cursor to previous block
    if (e.key === "Backspace" && block.content === "" && !isOnlyBlock) {
      e.preventDefault();
      onDeleteEmptyAndFocusPrev(block.id);
      return;
    }

    // 4. ArrowUp/ArrowDown across adjacent blocks at boundaries
    const el = e.currentTarget;
    if (
      e.key === "ArrowUp" &&
      el.selectionStart === 0 &&
      el.selectionEnd === 0 &&
      !isFirst
    ) {
      e.preventDefault();
      onFocusAdjacent(block.id, "prev");
      return;
    }
    if (
      e.key === "ArrowDown" &&
      el.selectionStart === el.value.length &&
      el.selectionEnd === el.value.length &&
      !isLast
    ) {
      e.preventDefault();
      onFocusAdjacent(block.id, "next");
      return;
    }

    // 5. Escape exits editing cleanly
    if (e.key === "Escape") {
      e.preventDefault();
      setEditingBlockId(null);
      setLinkPickerBlockId(null);
      return;
    }

    onTextareaKeyDown(e, block);
  };

  // Wrapper styling: frameless for plain paper text, callout tint for semantic blocks
  const containerClass = isFramelessText
    ? `relative rounded-xl transition ${
        isEditing && !blurMode
          ? "bg-[var(--bg-elevated)]/65 px-2.5 py-2 ring-1 ring-[var(--border-hairline)]"
          : compact
          ? "px-1.5 py-1 hover:bg-[var(--ink-primary)]/[0.03]"
          : "px-2 py-1.5 hover:bg-[var(--ink-primary)]/[0.03]"
      }`
    : `relative rounded-xl border border-l-[3px] transition ${
        compact ? "p-3" : "p-3.5 sm:p-4"
      }`;

  const containerStyle = isFramelessText
    ? undefined
    : {
        backgroundColor: meta.bgVar,
        borderColor: meta.borderVar,
      };

  const hasRichMarkup =
    /(==[\s\S]+?==|\{\{[\s\S]+?\}\}|\$[^$\n]+?\$|\[\[[^\]]+?\]\])/.test(
      block.content
    );

  return (
    <div
      data-block-id={block.id}
      onDragOver={(e) => {
        if (blurMode || isEditing) return;
        if (e.dataTransfer.types.includes("text/gunotes-block")) {
          e.preventDefault();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        const draggedId = e.dataTransfer.getData("text/gunotes-block");
        if (draggedId && draggedId !== block.id) {
          e.preventDefault();
          onReorderBlock(noteId, draggedId, block.id);
        }
      }}
      onClick={() => {
        if (shouldBlur) onToggleRevealBlock(block.id);
      }}
      className={`${containerClass} ${shouldBlur ? "cursor-pointer" : ""} ${
        brushMode && !blurMode
          ? "cursor-text ring-1 ring-[var(--ink-primary)]/15"
          : ""
      } ${dragOver ? "ring-2 ring-[var(--accent-ring)]" : ""} ${
        highlighted ? "ring-2 ring-[var(--ink-primary)]" : ""
      }`}
      style={containerStyle}
    >
      {/* Subtle Desktop Drag Handle */}
      {!blurMode && !isEditing && (
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/gunotes-block", block.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          title="Kéo để sắp xếp lại vị trí khối"
          className="no-print absolute top-2 -left-4 hidden cursor-grab text-[var(--ink-muted)]/50 opacity-0 transition group-hover:opacity-100 hover:text-[var(--ink-primary)] active:cursor-grabbing lg:flex"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </div>
      )}

      {/* Header row shown for semantic, diagram or image cards */}
      {(!isFramelessText || block.type === "diagram" || block.type === "image") && (
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {!hideBadge ? (
            <span className="font-mono text-[10px] font-bold tracking-wider uppercase">
              {block.title ?? meta.badge}
            </span>
          ) : (
            <span />
          )}

          {(block.type === "diagram" || block.type === "image") && (
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
                </>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteBlock(noteId, block.id);
                }}
                className="rounded p-1 text-[var(--ink-muted)] hover:bg-black/10 hover:text-[var(--ink-primary)]"
                title={block.type === "image" ? "Xóa ảnh" : "Xóa sơ đồ"}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}

          {!isFramelessText &&
            block.type !== "diagram" &&
            block.type !== "image" &&
            !isEditing &&
            !blurMode && (
            <div className="no-print flex items-center gap-0.5 opacity-80 transition lg:opacity-0 lg:group-hover:opacity-100">
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
                  onDeleteBlock(noteId, block.id);
                }}
                className="rounded p-1 text-[var(--ink-muted)] hover:bg-black/10 hover:text-[var(--ink-primary)]"
                title="Xóa khối"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      )}

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
      ) : block.type === "image" ? (
        <div
          className={shouldBlur ? "blur-recall-mask" : "blur-recall-revealed"}
        >
          <ImageBlockView
            imageUrl={block.imageUrl}
            caption={block.imageCaption}
            strokes={block.imageStrokes}
            onPatch={(patch) => onUpdateBlock(noteId, block.id, patch)}
          />
        </div>
      ) : isEditing && !blurMode ? (
        <div
          className="space-y-2"
          onClick={(e) => e.stopPropagation()}
          onBlur={(e) => {
            const nextFocused = e.relatedTarget as Node | null;
            if (nextFocused && e.currentTarget.contains(nextFocused)) return;
            setSlashState(null);
            setLinkPickerBlockId(null);
            setEditingBlockId(null);
          }}
        >
          <AutoResizeTextarea
            ref={textareaRef}
            value={block.content}
            placeholder={getBlockPlaceholder(block.type)}
            onKeyDown={handleEditorKeyDown}
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
            onChange={(e) => {
              let nextVal = e.target.value;
              let nextCaret = e.target.selectionStart;
              const lineStart =
                nextVal.lastIndexOf("\n", Math.max(0, nextCaret - 1)) + 1;
              const linePrefix = nextVal.slice(lineStart, nextCaret);
              const prevLineRemainder = block.content.slice(lineStart);
              const nextLineRemainder = nextVal.slice(lineStart);
              if (
                linePrefix === "- " ||
                linePrefix === "* " ||
                ((nextLineRemainder.startsWith("- ") ||
                  nextLineRemainder.startsWith("* ")) &&
                  !prevLineRemainder.startsWith("- ") &&
                  !prevLineRemainder.startsWith("* "))
              ) {
                nextVal =
                  nextVal.slice(0, lineStart) +
                  "• " +
                  nextLineRemainder.slice(2);
                const el = e.currentTarget;
                requestAnimationFrame(() => {
                  el.setSelectionRange(nextCaret, nextCaret);
                });
              }

              onUpdateBlock(noteId, block.id, { content: nextVal });
              updateSlashTrigger(nextVal, nextCaret);

              if (nextVal.slice(0, nextCaret).endsWith("[[")) {
                setLinkPickerBlockId(block.id);
              }
            }}
            className={`w-full bg-transparent text-[16px] leading-7 text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-muted)]/60 sm:text-[15px] ${
              block.type === "formula" ? "font-mono" : ""
            }`}
          />

          {slashState && filteredSlashCommands.length > 0 && (
            <InlineSlashMenu
              items={filteredSlashCommands}
              activeIndex={slashIndex}
              onSelect={executeSlashCommand}
            />
          )}

          {hasRichMarkup && (
            <div className="no-print rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-paper)]/85 px-3 py-2">
              <div className="mb-1 font-mono text-[9.5px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                Xem trước trực tiếp
              </div>
              <div className="text-sm leading-relaxed">
                <HighlightText text={block.content} disableWikiNavigation />
              </div>
            </div>
          )}

          <BlockFormattingBar
            currentType={block.type}
            isFirst={isFirst}
            isLast={isLast}
            onWrapSelection={handleWrapSelection}
            onOpenFormula={() =>
              onOpenFormulaModal(block.id, extractFirstLatex(block.content))
            }
            onToggleLinkPicker={() =>
              setLinkPickerBlockId((cur) =>
                cur === block.id ? null : block.id
              )
            }
            onChangeBlockType={handleChangeBlockType}
            onInsertBelow={() => onInsertBlockAfter(block.id, "text")}
            onMove={(dir) => onMoveBlock(noteId, block.id, dir)}
            onDelete={() => {
              setEditingBlockId(null);
              onDeleteBlock(noteId, block.id);
            }}
            onDone={() => {
              setLinkPickerBlockId(null);
              setEditingBlockId(null);
            }}
          />

          {linkPickerBlockId === block.id && (
            <div
              data-highlight-ui="true"
              className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-2 shadow-md"
            >
              <div className="mb-1 flex items-center justify-between px-1 font-mono text-[10px] font-bold text-[var(--ink-muted)] uppercase">
                <span>Chọn trang muốn liên kết tới [[...]]</span>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setLinkPickerBlockId(null)}
                  className="rounded p-0.5 hover:bg-[var(--bg-desk)]"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="max-h-36 space-y-1 overflow-y-auto">
                {linkableOtherNotes.length === 0 ? (
                  <p className="px-2 py-2 text-xs text-[var(--ink-muted)]">
                    Chưa có trang ghi chú khác để liên kết.
                  </p>
                ) : (
                  linkableOtherNotes.map((targetNote) => (
                    <button
                      key={targetNote.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const base = block.content.endsWith("[[")
                          ? block.content.slice(0, -2)
                          : block.content;
                        const sep =
                          base.trim().length > 0 && !/[\s\[]$/.test(base)
                            ? " "
                            : "";
                        onUpdateBlock(noteId, block.id, {
                          content: `${base}${sep}[[${targetNote.title}]]`,
                        });
                        setLinkPickerBlockId(null);
                        onWikiLinkInserted(targetNote.title);
                      }}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-xs hover:bg-[var(--bg-desk)]"
                    >
                      <span className="inline-flex items-center gap-1 truncate font-semibold">
                        <Link2 className="h-3 w-3 shrink-0 text-[var(--ink-muted)]" />
                        <span className="truncate">{targetNote.title}</span>
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[var(--ink-muted)]">
                        + Chèn
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={(e) => {
            if (blurMode) return;
            const target = e.target as HTMLElement | null;
            if (target?.closest("button, a")) return;
            const sel = window.getSelection();
            const selected = sel?.toString().trim() ?? "";
            if (selected.length > 0) return;
            if (brushMode) {
              onBrushTapWord(block, e.clientX, e.clientY, e.currentTarget);
              return;
            }
            setEditingBlockId(block.id, "end");
            clearSelectionPopup();
          }}
          className={`min-h-[1.75rem] text-[15px] leading-7 ${
            !blurMode ? "cursor-text" : ""
          } ${shouldBlur ? "blur-recall-mask" : "blur-recall-revealed"}`}
        >
          {block.content.trim().length === 0 ? (
            <span className="text-[var(--ink-muted)]/60 italic select-none">
              {getBlockPlaceholder(block.type)}
            </span>
          ) : (
            <HighlightText text={block.content} blurMode={blurMode} />
          )}
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
