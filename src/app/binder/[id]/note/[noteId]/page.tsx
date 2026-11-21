"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookmarkPlus,
  Brain,
  ChevronRight,
  Eraser,
  Eye,
  EyeOff,
  FilePlus2,
  GitBranch,
  Highlighter,
  Link2,
  Network,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Printer,
  RotateCcw,
  Sigma,
  Sparkles,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { BlurtingModal } from "@/components/editor/BlurtingModal";
import {
  createDiagramPreset,
  DiagramBlockView,
} from "@/components/editor/DiagramBlockView";
import { FormulaComposerModal } from "@/components/editor/FormulaComposerModal";
import { NoteVisualizeModal } from "@/components/graph/NoteVisualizeModal";
import { AppShell } from "@/components/layout/AppShell";
import { StickerArt } from "@/components/stickers/StickerArt";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import {
  applyTextHighlight,
  HighlightText,
  stripStudyMarkup,
} from "@/components/ui/HighlightText";
import {
  getPaperClass,
  HIGHLIGHT_COLORS,
  NOTE_TEMPLATE_META,
  PAPER_STYLE_META,
  SEMANTIC_META,
} from "@/lib/semantic-styles";
import { getBacklinks } from "@/lib/wiki-links";
import { useAppStore } from "@/store/useAppStore";
import type {
  BlockType,
  CornellBlock,
  DiagramData,
  HighlightColor,
  NoteTemplate,
} from "@/types/study";

type MobileTab = "all" | "cues" | "summary";

interface SelectionPopupState {
  blockId: string;
  text: string;
  x: number;
  y: number;
}

function formatTimer(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function extractFirstLatex(content: string): string {
  const display = /\$\$([\s\S]+?)\$\$/.exec(content);
  if (display) return display[1].trim();
  const inline = /\$([^$\n]+?)\$/.exec(content);
  if (inline) return inline[1].trim();
  return "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1";
}

export default function NoteStudioPage() {
  const params = useParams<{ id: string; noteId: string }>();
  const router = useRouter();
  const binderId = params?.id ?? "";
  const noteId = params?.noteId ?? "";

  const binders = useAppStore((s) => s.binders);
  const notes = useAppStore((s) => s.notes);
  const noteFont = useAppStore((s) => s.noteFont);
  const blurMode = useAppStore((s) => s.blurMode);
  const revealedBlockIds = useAppStore((s) => s.revealedBlockIds);
  const secondsLeft = useAppStore((s) => s.secondsLeft);
  const isTimerRunning = useAppStore((s) => s.isTimerRunning);

  const addNote = useAppStore((s) => s.addNote);
  const updateNote = useAppStore((s) => s.updateNote);
  const addBlockToNote = useAppStore((s) => s.addBlockToNote);
  const updateBlock = useAppStore((s) => s.updateBlock);
  const moveBlock = useAppStore((s) => s.moveBlock);
  const deleteBlock = useAppStore((s) => s.deleteBlock);
  const addTagToNote = useAppStore((s) => s.addTagToNote);
  const removeTagFromNote = useAppStore((s) => s.removeTagFromNote);
  const addFlashcard = useAppStore((s) => s.addFlashcard);
  const toggleBlurMode = useAppStore((s) => s.toggleBlurMode);
  const toggleRevealBlock = useAppStore((s) => s.toggleRevealBlock);
  const resetReveals = useAppStore((s) => s.resetReveals);
  const openCustomize = useAppStore((s) => s.openCustomize);
  const showToast = useAppStore((s) => s.showToast);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>("all");
  const [slashOpen, setSlashOpen] = useState(false);
  const [diagramPickerOpen, setDiagramPickerOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [newTagText, setNewTagText] = useState("");
  const [blurtingOpen, setBlurtingOpen] = useState(false);
  const [visualizeOpen, setVisualizeOpen] = useState(false);
  const [linkPickerBlockId, setLinkPickerBlockId] = useState<string | null>(
    null
  );

  // Highlight UX state
  const [brushMode, setBrushMode] = useState(false);
  const [brushColor, setBrushColor] = useState<HighlightColor | "cloze" | "clear">("y");
  const [selectionPopup, setSelectionPopup] =
    useState<SelectionPopupState | null>(null);

  // Visual Formula Composer state
  const [formulaModal, setFormulaModal] = useState<{
    blockId: string | null;
    initialLatex: string;
  } | null>(null);

  const binder = binders.find((b) => b.id === binderId);
  const binderNotes = notes.filter((n) => n.binderId === binderId);
  const note = notes.find((n) => n.id === noteId);

  // Keyboard shortcuts ('R' for Blur Recall, '/' for Slash Menu, 'Esc' to dismiss)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSlashOpen(false);
        setDiagramPickerOpen(false);
        setSelectionPopup(null);
        setLinkPickerBlockId(null);
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key.toLowerCase() === "r" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        toggleBlurMode();
      } else if (e.key === "/") {
        e.preventDefault();
        setSlashOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleBlurMode]);

  const applyHighlightUpdate = (
    targetNoteId: string,
    block: CornellBlock,
    selectedText: string,
    mode: HighlightColor | "cloze" | "clear"
  ) => {
    const updated = applyTextHighlight(block.content, selectedText, mode);
    if (updated === block.content) {
      showToast("Hãy chọn cụm từ nằm liền mạch trong khối để tô màu.");
      return;
    }
    updateBlock(targetNoteId, block.id, { content: updated });
    showToast(
      mode === "clear"
        ? "Đã xóa tô màu"
        : mode === "cloze"
        ? "Đã tạo ô che (Cloze)"
        : "Đã tô bút nhớ!"
    );
  };

  // Document-level selection capture so mouseup/touchend outside card bounds never drops highlights
  useEffect(() => {
    let timer: number | null = null;

    const onSelectionFinish = (ev: Event) => {
      const targetEl = ev.target as HTMLElement | null;
      if (targetEl?.closest?.('[data-highlight-ui="true"]')) return;

      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (!note || blurMode) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
          setSelectionPopup(null);
          return;
        }
        const text = sel.toString().trim();
        if (text.length < 1) {
          setSelectionPopup(null);
          return;
        }

        const range = sel.getRangeAt(0);
        const startNode = range.commonAncestorContainer;
        const startEl =
          startNode.nodeType === Node.TEXT_NODE
            ? startNode.parentElement
            : (startNode as HTMLElement | null);
        let blockEl = startEl?.closest?.("[data-block-id]") as HTMLElement | null;

        if (!blockEl && sel.anchorNode) {
          const anchorEl =
            sel.anchorNode.nodeType === Node.TEXT_NODE
              ? sel.anchorNode.parentElement
              : (sel.anchorNode as HTMLElement | null);
          blockEl = anchorEl?.closest?.("[data-block-id]") as HTMLElement | null;
        }

        const blockId = blockEl?.getAttribute("data-block-id");
        if (!blockId) {
          setSelectionPopup(null);
          return;
        }

        const matchedBlock = note.blocks.find((b) => b.id === blockId);
        if (
          !matchedBlock ||
          matchedBlock.type === "diagram" ||
          editingBlockId === matchedBlock.id
        ) {
          return;
        }

        if (brushMode) {
          applyHighlightUpdate(note.id, matchedBlock, text, brushColor);
          window.getSelection()?.removeAllRanges();
          setSelectionPopup(null);
          return;
        }

        const rect = range.getBoundingClientRect();
        const clampedX = Math.max(
          150,
          Math.min(window.innerWidth - 150, rect.left + rect.width / 2)
        );
        const clampedY = Math.max(76, rect.top - 10);
        setSelectionPopup({
          blockId: matchedBlock.id,
          text,
          x: clampedX,
          y: clampedY,
        });
      }, 16);
    };

    document.addEventListener("mouseup", onSelectionFinish);
    document.addEventListener("touchend", onSelectionFinish);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("mouseup", onSelectionFinish);
      document.removeEventListener("touchend", onSelectionFinish);
    };
  }, [note, blurMode, editingBlockId, brushMode, brushColor, updateBlock, showToast]);

  if (!note || !binder) {
    return (
      <AppShell hideMobileBottomBar>
        <div className="p-8 text-center">
          <p className="text-sm text-[var(--ink-muted)]">
            Không tìm thấy trang ghi chú này.
          </p>
          <Link
            href="/workspace"
            className="mt-4 inline-block rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)]"
          >
            Quay về Giá sách
          </Link>
        </div>
      </AppShell>
    );
  }

  const handleInsertBlock = (type: BlockType) => {
    const defaults: Record<BlockType, { cue: string; content: string }> = {
      def: {
        cue: "Khái niệm / Bản chất cốt lõi là gì?",
        content:
          "Nhập định nghĩa ngắn gọn bằng ==y:từ khóa chính== (bôi đen để tô thêm màu).",
      },
      formula: {
        cue: "Công thức hoặc quy tắc ghi nhớ?",
        content: "$$f(x) = \\frac{a}{b}$$",
      },
      example: {
        cue: "Ví dụ minh họa thực tế?",
        content: "Tình huống áp dụng nhanh...",
      },
      trap: {
        cue: "Bẫy hay mất điểm khi làm bài?",
        content: "Cảnh báo ==p:lỗi sai thường gặp==...",
      },
      text: {
        cue: "Ý bổ sung",
        content: "Ghi chú thêm tại đây...",
      },
      diagram: {
        cue: "Sơ đồ trực quan minh họa?",
        content: "Sơ đồ luồng từng bước",
      },
    };
    addBlockToNote(note.id, {
      type,
      cue: defaults[type].cue,
      content: defaults[type].content,
      diagram: type === "diagram" ? createDiagramPreset("flowchart") : undefined,
    });
    setSlashOpen(false);
    showToast(`Đã thêm khối ${SEMANTIC_META[type].badge}`);
  };

  const handleInsertDiagram = (kind: DiagramData["kind"]) => {
    const metaMap: Record<
      DiagramData["kind"],
      { title: string; cue: string; toast: string }
    > = {
      graph: {
        title: "BẢN ĐỒ NHÁNH ĐA TẦNG",
        cue: "Sơ đồ nhánh đa tầng & liên kết chéo?",
        toast: "Đã chèn Canvas Sơ đồ Đa tầng (Zoom / Chẻ nhánh / Nối chéo)",
      },
      flowchart: {
        title: "SƠ ĐỒ LUỒNG",
        cue: "Quy trình / Chuỗi diễn biến từng bước?",
        toast: "Đã chèn Sơ đồ Luồng (Flowchart)",
      },
      venn: {
        title: "BIỂU ĐỒ VENN",
        cue: "So sánh điểm giống & khác nhau?",
        toast: "Đã chèn Biểu đồ Venn (So sánh Logic)",
      },
      tree: {
        title: "SƠ ĐỒ CÂY",
        cue: "Phân loại nhánh hoặc tổng quan chương?",
        toast: "Đã chèn Sơ đồ Cây (Tree Diagram)",
      },
      spider: {
        title: "SƠ ĐỒ MẠNG NHỆN",
        cue: "Mổ xẻ từ khóa trọng tâm đối tượng?",
        toast: "Đã chèn Sơ đồ Mạng Nhện (Spider Map)",
      },
    };
    const info = metaMap[kind];
    addBlockToNote(note.id, {
      type: "diagram",
      title: info.title,
      cue: info.cue,
      content: info.title,
      diagram: createDiagramPreset(kind),
    });
    setDiagramPickerOpen(false);
    showToast(info.toast);
  };

  const applyHighlightAction = (
    block: CornellBlock,
    selectedText: string,
    mode: HighlightColor | "cloze" | "clear"
  ) => {
    applyHighlightUpdate(note.id, block, selectedText, mode);
    window.getSelection()?.removeAllRanges();
    setSelectionPopup(null);
  };

  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    block: CornellBlock
  ) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const key = e.key.toLowerCase();
    if (key !== "h" && !(e.shiftKey && key === "c")) return;

    const el = e.currentTarget;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (start === end) return;

    e.preventDefault();
    const selected = block.content.slice(start, end);
    const wrapped =
      key === "h" ? `==y:${selected}==` : `{{${selected}}}`;
    const next =
      block.content.slice(0, start) + wrapped + block.content.slice(end);
    updateBlock(note.id, block.id, { content: next });
    showToast(key === "h" ? "Đã tô highlight (Ctrl+H)" : "Đã tạo Cloze");
  };

  const handleCreateFlashcardFromBlock = (
    block: CornellBlock,
    snippet?: string
  ) => {
    const cleanContent = stripStudyMarkup(block.content);
    addFlashcard({
      binderId: binder.id,
      noteId: note.id,
      noteTitle: note.title,
      type:
        block.type === "text" || block.type === "diagram" ? "def" : block.type,
      front: block.cue || `Từ khóa trong ${note.title}`,
      back: snippet
        ? `${cleanContent}\n(Trọng tâm: ==y:${snippet}==)`
        : block.content,
    });
    window.getSelection()?.removeAllRanges();
    setSelectionPopup(null);
    showToast("Đã thêm vào bộ ôn tập /review!");
  };

  const handleInsertFormulaFromModal = (
    latex: string,
    asDisplayBlock: boolean
  ) => {
    const formatted = asDisplayBlock ? `$$${latex}$$` : `$${latex}$`;
    if (formulaModal?.blockId) {
      const target = note.blocks.find((b) => b.id === formulaModal.blockId);
      if (target) {
        const hasDisplay = /\$\$[\s\S]+?\$\$/.test(target.content);
        const nextContent =
          hasDisplay && asDisplayBlock
            ? target.content.replace(/\$\$[\s\S]+?\$\$/, formatted)
            : `${target.content.trim()}\n${formatted}`;
        updateBlock(note.id, target.id, { content: nextContent });
        showToast("Đã cập nhật công thức KaTeX!");
        return;
      }
    }

    addBlockToNote(note.id, {
      type: "formula",
      cue: "Công thức / Biểu thức quan trọng?",
      content: formatted,
    });
    showToast("Đã chèn khối công thức mới!");
  };

  const totalBlocks = note.blocks.length;
  const revealedCount = revealedBlockIds.filter((id) =>
    note.blocks.some((b) => b.id === id)
  ).length;
  const activeTemplate: NoteTemplate = note.template ?? "cornell";
  const selectedBlock = selectionPopup
    ? note.blocks.find((b) => b.id === selectionPopup.blockId)
    : undefined;
  const backlinks = getBacklinks(note, notes);
  const linkableOtherNotes = notes.filter((n) => n.id !== note.id);

  const renderSemanticCard = (
    block: CornellBlock,
    options?: { compact?: boolean; hideBadge?: boolean }
  ) => {
    const meta = SEMANTIC_META[block.type];
    const isRevealed = revealedBlockIds.includes(block.id);
    const shouldBlur = blurMode && !isRevealed;
    const isEditing = editingBlockId === block.id;

    return (
      <div
        data-block-id={block.id}
        onClick={() => {
          if (shouldBlur) toggleRevealBlock(block.id);
        }}
        className={`relative rounded-xl border transition ${
          options?.compact ? "p-3" : "p-3.5 sm:p-4"
        } ${shouldBlur ? "cursor-pointer" : ""} ${
          brushMode && !blurMode ? "cursor-text ring-1 ring-[var(--ink-primary)]/15" : ""
        }`}
        style={{
          backgroundColor: meta.bgVar,
          borderColor: meta.borderVar,
        }}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {!options?.hideBadge ? (
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
                  disabled={note.blocks[0]?.id === block.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBlock(note.id, block.id, "up");
                  }}
                  title="Di chuyển khối lên"
                  className="rounded p-1 text-[var(--ink-muted)] hover:bg-black/10 hover:text-[var(--ink-primary)] disabled:opacity-30"
                >
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  disabled={note.blocks[note.blocks.length - 1]?.id === block.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    moveBlock(note.id, block.id, "down");
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
                        setFormulaModal({
                          blockId: block.id,
                          initialLatex: extractFirstLatex(block.content),
                        });
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
                        setSelectionPopup(null);
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
                deleteBlock(note.id, block.id);
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
            className={
              shouldBlur ? "blur-recall-mask" : "blur-recall-revealed"
            }
          >
            <DiagramBlockView
              diagram={block.diagram}
              canvasGraph={block.canvasGraph}
              viewMode={block.diagramViewMode}
              onPatch={(patch) => updateBlock(note.id, block.id, patch)}
            />
          </div>
        ) : isEditing && !blurMode ? (
          <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
            <textarea
              rows={3}
              autoFocus
              value={block.content}
              onKeyDown={(e) => handleTextareaKeyDown(e, block)}
              onMouseUp={(e) => {
                if (!brushMode) return;
                const el = e.currentTarget;
                const start = el.selectionStart;
                const end = el.selectionEnd;
                if (start === end) return;
                const selected = block.content.slice(start, end);
                if (!selected.trim()) return;
                applyHighlightUpdate(note.id, block, selected, brushColor);
              }}
              onChange={(e) =>
                updateBlock(note.id, block.id, {
                  content: e.target.value,
                })
              }
              className={`w-full resize-y rounded-lg bg-[var(--bg-elevated)]/80 p-2 text-sm leading-relaxed outline-none ${
                block.type === "formula" ? "font-mono text-[13px]" : ""
              }`}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-[var(--ink-muted)]">
              <span>Mẹo: Ctrl+H tô vàng • Ctrl+Shift+C ẩn chữ • $...$ toán • [[Trang]]</span>
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
                    setFormulaModal({
                      blockId: block.id,
                      initialLatex: extractFirstLatex(block.content),
                    })
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
                        updateBlock(note.id, block.id, {
                          content: `${block.content}${sep}[[${targetNote.title}]]`,
                        });
                        setLinkPickerBlockId(null);
                        showToast(`Đã chèn liên kết [[${targetNote.title}]]`);
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
  };

  return (
    <AppShell hideMobileBottomBar>
      <div className="flex min-h-screen bg-[var(--bg-desk)]">
        {/* Desktop Collapsible Binder Pages Sidebar */}
        {sidebarOpen && (
          <aside className="no-print sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-[var(--border-hairline)] bg-[var(--bg-desk)]/70 p-4 xl:flex">
            <div className="flex items-center justify-between">
              <Link
                href={`/binder/${binder.id}`}
                className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-primary)] hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="truncate">{binder.title}</span>
              </Link>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-paper)]"
                title="Thu gọn mục lục sổ"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                Trang trong sổ ({binderNotes.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  const created = addNote(
                    binder.id,
                    undefined,
                    undefined,
                    activeTemplate
                  );
                  router.push(`/binder/${binder.id}/note/${created.id}`);
                }}
                className="rounded-md p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--ink-primary)]"
                title="Trang mới"
              >
                <FilePlus2 className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
              {binderNotes.map((n) => {
                const active = n.id === note.id;
                return (
                  <Link
                    key={n.id}
                    href={`/binder/${binder.id}/note/${n.id}`}
                    className={`block rounded-xl px-3 py-2 text-xs transition ${
                      active
                        ? "border border-[var(--border-hairline)] bg-[var(--bg-elevated)] font-semibold text-[var(--ink-primary)] shadow-2xs"
                        : "text-[var(--ink-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    <div className="line-clamp-2">{n.title}</div>
                    <div className="mt-0.5 font-mono text-[10px] opacity-75">
                      {n.updatedAt}
                    </div>
                  </Link>
                );
              })}
            </div>
          </aside>
        )}

        {/* Main Studio Workspace */}
        <div className="relative flex min-w-0 flex-1 flex-col">
          {/* Top Studio Header Bar */}
          <header className="no-print sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)]/90 backdrop-blur-md">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3 py-2.5 sm:px-6">
              {/* Left: Back / Breadcrumb */}
              <div className="flex min-w-0 items-center gap-2">
                {!sidebarOpen && (
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
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
                  <span className="max-w-[74px] truncate sm:max-w-[180px]">
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

              {/* Right: Visualize, Blurting, Blur Recall, Timer, Customize */}
              <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                {/* Paper Style Segmented Pill (Desktop - 4 stationery paper types) */}
                <div className="hidden items-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-desk)] p-0.5 lg:flex">
                  {PAPER_STYLE_META.map((ps) => (
                    <button
                      key={ps.id}
                      type="button"
                      title={ps.hint}
                      onClick={() =>
                        updateNote(note.id, { paperStyle: ps.id })
                      }
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

                {/* Advanced Feature: Interactive Visualize Knowledge Map */}
                <button
                  type="button"
                  onClick={() => setVisualizeOpen(true)}
                  title="Trực quan hóa toàn bộ liên kết ý tưởng của trang (Zoom / Pan / Cross-link)"
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--ink-primary)] bg-[var(--hl-yellow)] px-2.5 py-1.5 font-mono text-[11px] font-bold whitespace-nowrap text-[var(--ink-primary)] shadow-2xs transition hover:brightness-95"
                >
                  <Network className="h-3.5 w-3.5 shrink-0" />
                  <span>Visualize</span>
                </button>

                {/* Blurting Mode ("Xả não 5 phút") */}
                <button
                  type="button"
                  onClick={() => setBlurtingOpen(true)}
                  title="Xả não 5 phút & đối chiếu bản gốc (Blurting)"
                  className="flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1.5 font-mono text-[11px] font-medium whitespace-nowrap text-[var(--ink-primary)] transition hover:border-[var(--ink-muted)]"
                >
                  <Brain className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">Xả não</span>
                </button>

                {/* Blur Recall Toggle */}
                <button
                  type="button"
                  onClick={toggleBlurMode}
                  title="Che để nhớ (phím R)"
                  className={`flex items-center gap-1 rounded-full border px-2 py-1.5 font-mono text-[11px] font-semibold whitespace-nowrap transition sm:px-2.5 ${
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
                    onClick={resetReveals}
                    title="Che lại tất cả"
                    className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Mini Pomodoro Pill */}
                <Link
                  href="/focus"
                  className="flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1.5 font-mono text-[11px] font-medium tabular-nums sm:gap-1.5 sm:px-2.5"
                  title={`Mở Phòng Tập trung (${formatTimer(secondsLeft)})`}
                >
                  <Timer
                    className={`h-3.5 w-3.5 ${
                      isTimerRunning
                        ? "text-[var(--accent-ring)]"
                        : "text-[var(--ink-muted)]"
                    }`}
                  />
                  <span className="hidden sm:inline">
                    {formatTimer(secondsLeft)}
                  </span>
                </Link>

                {/* Print / PDF */}
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Xuất PDF / In khổ giấy"
                  className="hidden rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-1.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)] sm:inline-flex"
                >
                  <Printer className="h-3.5 w-3.5" />
                </button>

                {/* Customize Drawer Trigger */}
                <button
                  type="button"
                  onClick={() => openCustomize({ kind: "note", id: note.id })}
                  title="Độ trang & Sticker"
                  className="flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1.5 text-[11px] font-medium hover:border-[var(--ink-muted)] sm:px-2.5"
                >
                  <Palette className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Độ trang</span>
                </button>
              </div>
            </div>

            {/* Mobile Cornell Section Switcher (only shown for Cornell template) */}
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
                      onClick={() => setMobileTab(t.id)}
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

          {/* Centered Paper Sheet Canvas */}
          <div className="flex-1 px-0 pt-0 pb-36 sm:px-6 sm:pt-6">
            <article
              className={`${getPaperClass(
                note.paperStyle
              )} print-sheet paper-shadow relative mx-auto max-w-[920px] border-[var(--border-hairline)] p-4 sm:rounded-[20px] sm:border sm:p-8 sm:pl-14 ${
                noteFont === "serif" ? "font-serif" : "font-sans"
              }`}
            >
              {/* Tactile Loose-leaf Binder Punch Holes (Desktop) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 bottom-0 left-3.5 hidden flex-col justify-evenly sm:flex"
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="h-3.5 w-3.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-desk)] shadow-inner"
                  />
                ))}
              </div>

              {/* Note Header */}
              <div className="flex items-start justify-between gap-3 border-b border-[var(--border-hairline)] pb-4">
                <div className="min-w-0 flex-1">
                  <AutoResizeTextarea
                    value={note.title}
                    onChange={(e) =>
                      updateNote(note.id, { title: e.target.value })
                    }
                    className="w-full bg-transparent font-sans text-xl leading-snug font-bold tracking-tight outline-none sm:text-2xl"
                    placeholder="Tiêu đề trang ghi chú..."
                  />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/80 px-2 py-0.5 whitespace-nowrap"
                      >
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTagFromNote(note.id, tag)}
                          className="no-print rounded-full p-0.5 hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
                          aria-label={`Xóa ${tag}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}

                    {tagInputOpen ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (newTagText.trim()) {
                            addTagToNote(note.id, newTagText);
                          }
                          setNewTagText("");
                          setTagInputOpen(false);
                        }}
                        className="no-print inline-flex items-center"
                      >
                        <input
                          autoFocus
                          value={newTagText}
                          onChange={(e) => setNewTagText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") {
                              setNewTagText("");
                              setTagInputOpen(false);
                            }
                          }}
                          onBlur={() => {
                            if (newTagText.trim()) {
                              addTagToNote(note.id, newTagText);
                            }
                            setNewTagText("");
                            setTagInputOpen(false);
                          }}
                          placeholder="#nhap-tag"
                          className="w-24 rounded-full border border-[var(--ink-primary)] bg-[var(--bg-elevated)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--ink-primary)] outline-none"
                        />
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setTagInputOpen(true)}
                        className="no-print inline-flex items-center gap-0.5 rounded-full border border-dashed border-[var(--border-hairline)] px-2 py-0.5 whitespace-nowrap hover:border-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        <span>Tag</span>
                      </button>
                    )}

                    <span className="rounded-full bg-[var(--bg-desk)] px-2 py-0.5 whitespace-nowrap">
                      {note.blocks.length} khối kiến thức
                    </span>
                  </div>
                </div>

                {/* Responsive Corner Sticker Slot */}
                <button
                  type="button"
                  onClick={() => openCustomize({ kind: "note", id: note.id })}
                  title="Đổi sticker góc trang"
                  className="shrink-0"
                >
                  {note.headerStickerId ? (
                    <StickerArt id={note.headerStickerId} size={46} />
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border-hairline)] px-2.5 py-1 font-mono text-[10px] text-[var(--ink-muted)]">
                      <Sparkles className="h-3 w-3" />
                      Sticker
                    </span>
                  )}
                </button>
              </div>

              {/* Multi-Method Study Template Switcher Strip */}
              <div className="no-print mt-4 flex flex-wrap items-center justify-between gap-2 border-b border-dashed border-[var(--border-hairline)] pb-3.5">
                <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                  Phương pháp trình bày:
                </span>
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {NOTE_TEMPLATE_META.map((tpl) => {
                    const active = activeTemplate === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        title={tpl.shortDesc}
                        onClick={() => {
                          updateNote(note.id, { template: tpl.id });
                          showToast(`Đã đổi sang bố cục ${tpl.label}`);
                        }}
                        className={`shrink-0 rounded-full border px-3 py-1 font-mono text-[11px] font-medium transition ${
                          active
                            ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                            : "border-[var(--border-hairline)] bg-[var(--bg-elevated)]/70 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                        }`}
                      >
                        {tpl.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ==================== TEMPLATE 1: CORNELL ==================== */}
              {activeTemplate === "cornell" && (
                <>
                  {/* DESKTOP: Classic 2-Column Cornell Layout */}
                  <div className="mt-6 hidden lg:block">
                    <div className="mb-3 grid grid-cols-12 gap-6 border-b border-dashed border-[var(--border-hairline)] pb-2 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                      <div className="col-span-4 border-r border-[var(--border-hairline)] pr-4">
                        TỪ KHÓA & CÂU HỎI GỢI NHỚ (28%)
                      </div>
                      <div className="col-span-8">
                        NỘI DUNG CHÍNH & MÃ HÓA MÀU (72%)
                      </div>
                    </div>

                    <div className="space-y-4">
                      {note.blocks.map((block) => (
                        <div
                          key={block.id}
                          className="group grid grid-cols-12 gap-6"
                        >
                          <div className="col-span-4 border-r border-[var(--border-hairline)] pr-4">
                            <AutoResizeTextarea
                              value={block.cue}
                              onChange={(e) =>
                                updateBlock(note.id, block.id, {
                                  cue: e.target.value,
                                })
                              }
                              className="w-full bg-transparent font-sans text-sm leading-relaxed font-medium text-[var(--ink-primary)] outline-none placeholder:text-[var(--ink-muted)]"
                              placeholder="Câu hỏi / Từ khóa..."
                            />
                          </div>
                          <div className="col-span-8">
                            {renderSemanticCard(block)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* MOBILE: Stacked Responsive Cornell Cards */}
                  <div className="mt-5 space-y-3.5 lg:hidden">
                    {mobileTab !== "summary" &&
                      note.blocks.map((block) => (
                        <div
                          key={block.id}
                          className="overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-desk)]/70 px-3.5 py-2.5">
                            <div className="min-w-0 flex-1">
                              <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                                TỪ KHÓA / CÂU HỎI
                              </span>
                              <AutoResizeTextarea
                                value={block.cue}
                                onChange={(e) =>
                                  updateBlock(note.id, block.id, {
                                    cue: e.target.value,
                                  })
                                }
                                className="mt-0.5 w-full bg-transparent text-sm font-medium text-[var(--ink-primary)] outline-none"
                              />
                            </div>
                          </div>
                          {mobileTab === "all" && renderSemanticCard(block)}
                        </div>
                      ))}
                  </div>
                </>
              )}

              {/* ==================== TEMPLATE 2: OUTLINE ==================== */}
              {activeTemplate === "outline" && (
                <div className="mt-6 space-y-4">
                  <div className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                    DÀN Ý PHÂN CẤP (OUTLINE METHOD)
                  </div>
                  <div className="space-y-4 border-l-2 border-[var(--border-hairline)] pl-4 sm:pl-5">
                    {note.blocks.map((block, idx) => (
                      <div key={block.id} className="group relative space-y-1.5">
                        <span
                          aria-hidden="true"
                          className="absolute top-2 -left-[22px] h-2.5 w-2.5 rounded-full border border-[var(--ink-primary)] bg-[var(--bg-paper)] sm:-left-[26px]"
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-[var(--ink-muted)]">
                            {idx + 1}.
                          </span>
                          <AutoResizeTextarea
                            value={block.cue}
                            onChange={(e) =>
                              updateBlock(note.id, block.id, {
                                cue: e.target.value,
                              })
                            }
                            className="w-full bg-transparent font-sans text-sm font-bold text-[var(--ink-primary)] outline-none"
                          />
                        </div>
                        <div className="pl-4 sm:pl-5">
                          {renderSemanticCard(block, { compact: true })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================== TEMPLATE 3: BOXING ==================== */}
              {activeTemplate === "boxing" && (
                <div className="mt-6 space-y-3">
                  <div className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                    ĐÓNG HỘP KHỐI KIẾN THỨC (BOXING METHOD)
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {note.blocks.map((block) => (
                      <div
                        key={block.id}
                        className="group flex flex-col justify-between rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/75 p-3.5"
                      >
                        <div className="mb-2.5 border-b border-dashed border-[var(--border-hairline)] pb-2">
                          <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                            CHỦ ĐỀ HỘP
                          </span>
                          <AutoResizeTextarea
                            value={block.cue}
                            onChange={(e) =>
                              updateBlock(note.id, block.id, {
                                cue: e.target.value,
                              })
                            }
                            className="mt-0.5 w-full bg-transparent font-sans text-sm font-bold outline-none"
                          />
                        </div>
                        {renderSemanticCard(block, { compact: true })}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================== TEMPLATE 4: CHARTING (SO SÁNH) ==================== */}
              {activeTemplate === "charting" && (
                <div className="mt-6 space-y-3">
                  <div className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                    BẢNG HỆ THỐNG ĐỐI CHIẾU (CHARTING METHOD)
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden overflow-x-auto rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/80 md:block">
                    <table className="w-full border-collapse text-left text-sm">
                      <thead>
                        <tr className="border-b border-[var(--border-hairline)] bg-[var(--bg-desk)]/80 font-mono text-[10px] text-[var(--ink-muted)] uppercase">
                          <th className="w-[30%] p-3">Tiêu chí / Câu hỏi</th>
                          <th className="w-[16%] p-3">Phân loại</th>
                          <th className="w-[54%] p-3">Nội dung & Công thức</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-hairline)]">
                        {note.blocks.map((block) => {
                          const meta = SEMANTIC_META[block.type];
                          return (
                            <tr key={block.id} className="group align-top">
                              <td className="p-3 font-medium">
                                <AutoResizeTextarea
                                  value={block.cue}
                                  onChange={(e) =>
                                    updateBlock(note.id, block.id, {
                                      cue: e.target.value,
                                    })
                                  }
                                  className="w-full bg-transparent text-xs leading-relaxed font-semibold outline-none sm:text-sm"
                                />
                              </td>
                              <td className="p-3">
                                <span
                                  className="inline-block rounded-full border px-2 py-0.5 font-mono text-[10px] font-bold whitespace-nowrap"
                                  style={{
                                    backgroundColor: meta.bgVar,
                                    borderColor: meta.borderVar,
                                  }}
                                >
                                  {meta.badge}
                                </span>
                              </td>
                              <td className="p-2.5">
                                {renderSemanticCard(block, {
                                  compact: true,
                                  hideBadge: true,
                                })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Responsive Matrix Cards */}
                  <div className="divide-y divide-[var(--border-hairline)] overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/85 md:hidden">
                    {note.blocks.map((block) => {
                      const meta = SEMANTIC_META[block.type];
                      return (
                        <div key={block.id} className="space-y-2 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <AutoResizeTextarea
                              value={block.cue}
                              onChange={(e) =>
                                updateBlock(note.id, block.id, {
                                  cue: e.target.value,
                                })
                              }
                              className="min-w-0 flex-1 bg-transparent text-xs leading-snug font-bold outline-none"
                            />
                            <span
                              className="shrink-0 rounded-full border px-2 py-0.5 font-mono text-[9px] font-bold"
                              style={{
                                backgroundColor: meta.bgVar,
                                borderColor: meta.borderVar,
                              }}
                            >
                              {meta.badge}
                            </span>
                          </div>
                          {renderSemanticCard(block, {
                            compact: true,
                            hideBadge: true,
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ==================== TEMPLATE 5: FEYNMAN ==================== */}
              {activeTemplate === "feynman" && (
                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-elevated)]/70 px-3.5 py-2.5 text-xs text-[var(--ink-muted)]">
                    <strong className="font-mono text-[var(--ink-primary)]">
                      NGUYÊN TẮC FEYNMAN:
                    </strong>{" "}
                    Nếu chưa giải thích được thật đơn giản cho người mới nghe, tức
                    là ta còn lỗ hổng. Chạm vào từng bước để tự kiểm tra.
                  </div>

                  {note.blocks.map((block, idx) => (
                    <div
                      key={block.id}
                      className="group rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/65 p-4"
                    >
                      <div className="mb-2 flex items-center gap-2.5">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-primary)] font-mono text-[11px] font-bold text-[var(--accent-primary-fg)]">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <AutoResizeTextarea
                          value={block.cue}
                          onChange={(e) =>
                            updateBlock(note.id, block.id, {
                              cue: e.target.value,
                            })
                          }
                          className="w-full bg-transparent font-sans text-sm font-bold outline-none"
                        />
                      </div>
                      <div className="pl-0 sm:pl-8">
                        {renderSemanticCard(block)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ==================== TEMPLATE 6: SPLIT 50/50 ==================== */}
              {activeTemplate === "split" && (
                <div className="mt-6 space-y-4">
                  <div className="hidden grid-cols-2 gap-6 border-b border-dashed border-[var(--border-hairline)] pb-2 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase lg:grid">
                    <div className="border-r border-[var(--border-hairline)] pr-4">
                      NỬA TRÁI: BẢN GỐC / ĐỀ BÀI / TỪ VỰNG (50%)
                    </div>
                    <div>
                      NỬA PHẢI: GIẢI NGHĨA / LỜI GIẢI / GHI CHÚ (50%)
                    </div>
                  </div>

                  {/* Desktop 50/50 Split */}
                  <div className="hidden space-y-4 lg:block">
                    {note.blocks.map((block) => (
                      <div
                        key={block.id}
                        className="group grid grid-cols-2 gap-6"
                      >
                        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/70 p-3.5">
                          <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                            Đề bài / Bản gốc
                          </span>
                          <AutoResizeTextarea
                            value={block.cue}
                            onChange={(e) =>
                              updateBlock(note.id, block.id, {
                                cue: e.target.value,
                              })
                            }
                            className="mt-1 w-full bg-transparent text-sm leading-relaxed font-medium outline-none"
                          />
                        </div>
                        <div>{renderSemanticCard(block)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile Stacked Split */}
                  <div className="space-y-3 lg:hidden">
                    {note.blocks.map((block) => (
                      <div
                        key={block.id}
                        className="overflow-hidden rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]"
                      >
                        <div className="border-b border-[var(--border-hairline)] bg-[var(--bg-desk)]/65 p-3">
                          <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                            Đề bài / Bản gốc
                          </span>
                          <AutoResizeTextarea
                            value={block.cue}
                            onChange={(e) =>
                              updateBlock(note.id, block.id, {
                                cue: e.target.value,
                              })
                            }
                            className="mt-0.5 w-full bg-transparent text-sm font-medium outline-none"
                          />
                        </div>
                        <div className="p-2">{renderSemanticCard(block)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================== TEMPLATE 7: TODAI 3-CỘT ==================== */}
              {activeTemplate === "todai" && (
                <div className="mt-6 space-y-4">
                  <div className="hidden grid-cols-12 gap-4 border-b border-dashed border-[var(--border-hairline)] pb-2 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase lg:grid">
                    <div className="col-span-5">01. FACT (KIẾN THỨC GỐC)</div>
                    <div className="col-span-4">02. INSIGHT (SUY LUẬN)</div>
                    <div className="col-span-3">03. ACTION (ÁP DỤNG)</div>
                  </div>

                  {/* Desktop 3-Column Tokyo University Grid */}
                  <div className="hidden space-y-4 lg:block">
                    {note.blocks.map((block) => (
                      <div
                        key={block.id}
                        className="group grid grid-cols-12 items-start gap-4"
                      >
                        <div className="col-span-5 min-w-0">
                          {renderSemanticCard(block, { compact: true })}
                        </div>
                        <div className="col-span-4 min-w-0 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/70 p-3">
                          <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                            Suy luận / Câu hỏi
                          </span>
                          <AutoResizeTextarea
                            value={block.cue}
                            onChange={(e) =>
                              updateBlock(note.id, block.id, {
                                cue: e.target.value,
                              })
                            }
                            className="mt-1 w-full bg-transparent text-xs leading-relaxed font-medium outline-none sm:text-sm"
                          />
                        </div>
                        <div
                          className="col-span-3 min-w-0 rounded-xl border p-3"
                          style={{
                            backgroundColor: "var(--sem-ex-bg)",
                            borderColor: "var(--sem-ex-border)",
                          }}
                        >
                          <span className="font-mono text-[10px] font-bold uppercase">
                            Hành động / Bài tập
                          </span>
                          <AutoResizeTextarea
                            value={block.action ?? ""}
                            onChange={(e) =>
                              updateBlock(note.id, block.id, {
                                action: e.target.value,
                              })
                            }
                            placeholder="Ghi bài tập áp dụng..."
                            className="mt-1 w-full bg-transparent text-xs leading-relaxed outline-none placeholder:text-[var(--ink-muted)]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mobile 3-Strip Todai Cards */}
                  <div className="space-y-3.5 lg:hidden">
                    {note.blocks.map((block) => (
                      <div
                        key={block.id}
                        className="space-y-2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/85 p-3"
                      >
                        <div>
                          <div className="mb-1 font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                            01. FACT • KIẾN THỨC GỐC
                          </div>
                          {renderSemanticCard(block, { compact: true })}
                        </div>

                        <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-2.5">
                          <span className="font-mono text-[10px] font-semibold text-[var(--ink-muted)] uppercase">
                            02. INSIGHT • SUY LUẬN
                          </span>
                          <AutoResizeTextarea
                            value={block.cue}
                            onChange={(e) =>
                              updateBlock(note.id, block.id, {
                                cue: e.target.value,
                              })
                            }
                            className="mt-0.5 w-full bg-transparent text-xs font-medium outline-none"
                          />
                        </div>

                        <div
                          className="rounded-xl border p-2.5"
                          style={{
                            backgroundColor: "var(--sem-ex-bg)",
                            borderColor: "var(--sem-ex-border)",
                          }}
                        >
                          <span className="font-mono text-[10px] font-bold uppercase">
                            03. ACTION • ÁP DỤNG
                          </span>
                          <AutoResizeTextarea
                            value={block.action ?? ""}
                            onChange={(e) =>
                              updateBlock(note.id, block.id, {
                                action: e.target.value,
                              })
                            }
                            placeholder="Ghi bài tập áp dụng..."
                            className="mt-0.5 w-full bg-transparent text-xs outline-none placeholder:text-[var(--ink-muted)]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Summary Strip (All templates except Mobile Cues-only) */}
              {(activeTemplate !== "cornell" ||
                mobileTab === "all" ||
                mobileTab === "summary") && (
                <div className="mt-7 border-t border-[var(--border-hairline)] pt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                      {activeTemplate === "feynman"
                        ? "GIẢI THÍCH ĐỜI THƯỜNG NHƯ DẠY NGƯỜI MỚI"
                        : "TÓM TẮT 3 DÒNG CUỐI TRANG"}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                      Tự diễn đạt lại
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={note.summary}
                    onChange={(e) =>
                      updateNote(note.id, { summary: e.target.value })
                    }
                    className="w-full resize-none rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/65 p-3 text-sm leading-relaxed outline-none focus:border-[var(--ink-primary)]"
                  />
                </div>
              )}

              {/* Bi-directional Backlinks Panel */}
              {backlinks.length > 0 && (
                <div className="no-print mt-6 rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-elevated)]/60 p-4">
                  <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-[var(--ink-muted)] uppercase">
                      <Link2 className="h-3.5 w-3.5" />
                      <span>
                        LIÊN KẾT NGƯỢC (BACKLINKS • {backlinks.length} TRANG NHẮC TỚI)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisualizeOpen(true)}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-0.5 font-mono text-[10px] font-semibold hover:border-[var(--ink-primary)]"
                    >
                      <Network className="h-3 w-3" />
                      <span>Xem trên bản đồ Visualize</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {backlinks.map(({ note: refNote, excerpt }) => (
                      <Link
                        key={refNote.id}
                        href={`/binder/${refNote.binderId}/note/${refNote.id}`}
                        className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3 transition hover:border-[var(--ink-primary)]"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Link2 className="h-3 w-3 shrink-0 text-[var(--ink-muted)]" />
                          <span className="truncate">{refNote.title}</span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--ink-muted)]">
                          {excerpt}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </article>
          </div>

          {/* DESKTOP Floating Selection Bubble Menu */}
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
                    applyHighlightAction(
                      selectedBlock,
                      selectionPopup.text,
                      c.id
                    )
                  }
                  className="h-5 w-5 rounded-full border border-black/15 transition hover:scale-115"
                  style={{ backgroundColor: c.cssVar }}
                />
              ))}
              <div className="mx-0.5 h-4 w-[1px] bg-[var(--border-hairline)]" />
              <button
                type="button"
                onClick={() =>
                  applyHighlightAction(
                    selectedBlock,
                    selectionPopup.text,
                    "cloze"
                  )
                }
                className="rounded-full px-2 py-1 font-mono text-[11px] font-semibold hover:bg-[var(--bg-desk)]"
              >
                Che chữ
              </button>
              <button
                type="button"
                onClick={() =>
                  handleCreateFlashcardFromBlock(
                    selectedBlock,
                    selectionPopup.text
                  )
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
                  applyHighlightAction(
                    selectedBlock,
                    selectionPopup.text,
                    "clear"
                  )
                }
                className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
              >
                <Eraser className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setSelectionPopup(null)}
                className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* MOBILE Selection Action Dock (sits cleanly above bottom pill bar so OS Copy menu doesn't block) */}
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
                      applyHighlightAction(
                        selectedBlock,
                        selectionPopup.text,
                        c.id
                      )
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
                    applyHighlightAction(
                      selectedBlock,
                      selectionPopup.text,
                      "cloze"
                    )
                  }
                  className="rounded-full border border-[var(--border-hairline)] px-2.5 py-1 font-mono text-[10px] font-semibold"
                >
                  Che chữ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleCreateFlashcardFromBlock(
                      selectedBlock,
                      selectionPopup.text
                    )
                  }
                  className="rounded-full bg-[var(--accent-primary)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--accent-primary-fg)]"
                >
                  + Thẻ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    applyHighlightAction(
                      selectedBlock,
                      selectionPopup.text,
                      "clear"
                    )
                  }
                  className="p-1 text-[var(--ink-muted)]"
                  aria-label="Xóa tô"
                >
                  <Eraser className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Highlighter Brush Mode Palette Bar */}
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
                      onClick={() => setBrushColor(c.id)}
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
                    onClick={() => setBrushColor("cloze")}
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
                    onClick={() => setBrushColor("clear")}
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
                      brushColor === "clear"
                        ? "border-[var(--ink-primary)] bg-[var(--sem-trap-bg)] text-[var(--ink-primary)]"
                        : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--ink-muted)]"
                    }`}
                  >
                    <Eraser className="h-3 w-3" />
                    <span>Xóa màu</span>
                  </button>
                </div>
                <span className="hidden font-mono text-[10px] text-[var(--ink-muted)] sm:inline">
                  • Bôi đen chữ bất kỳ để tô ngay
                </span>
                <button
                  type="button"
                  onClick={() => setBrushMode(false)}
                  title="Tắt Bút nhớ"
                  className="rounded-full p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Slash Command / Block Picker Popover */}
          {slashOpen && (
            <div className="no-print fixed bottom-20 left-1/2 z-40 w-[92vw] max-w-sm -translate-x-1/2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-2 shadow-xl">
              <div className="px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                Chèn khối kiến thức mới (/)
              </div>
              {(["def", "formula", "example", "trap", "text"] as BlockType[]).map(
                (t) => {
                  const meta = SEMANTIC_META[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleInsertBlock(t)}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-desk)]"
                    >
                      <span className="flex items-center gap-2.5">
                        <span
                          className="h-3.5 w-3.5 rounded-full border"
                          style={{
                            backgroundColor: meta.bgVar,
                            borderColor: meta.borderVar,
                          }}
                        />
                        <span>
                          <strong className="font-semibold">
                            {meta.badge}
                          </strong>
                          <span className="ml-2 text-[var(--ink-muted)]">
                            {meta.description}
                          </span>
                        </span>
                      </span>
                      <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                        {meta.shortcut}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          )}

          {/* Diagram Preset Picker Popover */}
          {diagramPickerOpen && (
            <div className="no-print fixed bottom-20 left-1/2 z-40 w-[92vw] max-w-sm -translate-x-1/2 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-2 shadow-xl">
              <div className="px-3 py-1.5 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                Chèn 1 chạm: Thước khuôn Sơ đồ
              </div>
              {(
                [
                  {
                    kind: "graph",
                    title: "Sơ đồ Nhánh Đa Tầng (Canvas Zoom)",
                    sub: "Nâng cao: Zoom/Pan, chẻ nhánh vô hạn tầng & nối chéo",
                  },
                  {
                    kind: "flowchart",
                    title: "Sơ đồ Luồng (Flowchart)",
                    sub: "Hợp quy trình, bước giải Toán/Lý/Sử",
                  },
                  {
                    kind: "venn",
                    title: "Biểu đồ Venn (So sánh)",
                    sub: "2 vòng tròn giao nhau: Giống & Khác",
                  },
                  {
                    kind: "tree",
                    title: "Sơ đồ Cây (Tree Diagram)",
                    sub: "Phân loại nhánh hoặc tóm tắt cả chương",
                  },
                  {
                    kind: "spider",
                    title: "Sơ đồ Mạng Nhện (Spider)",
                    sub: "Tâm chủ đề tỏa các thẻ từ khóa",
                  },
                ] as const
              ).map((item) => (
                <button
                  key={item.kind}
                  type="button"
                  onClick={() => handleInsertDiagram(item.kind)}
                  className="block w-full rounded-xl px-3 py-2 text-left text-xs transition hover:bg-[var(--bg-desk)]"
                >
                  <div className="font-semibold">{item.title}</div>
                  <div className="text-[11px] text-[var(--ink-muted)]">
                    {item.sub}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Floating Bottom Pill Toolbar (Desktop) & Sticky Quick-Format Bar (Mobile) */}
          <div className="no-print pointer-events-none fixed right-0 bottom-4 left-0 z-30 flex justify-center px-3 lg:left-[232px]">
            <div className="paper-shadow pointer-events-auto flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/95 px-2.5 py-1.5 backdrop-blur-md sm:gap-2 sm:px-3.5">
              <button
                type="button"
                onClick={() => {
                  setSlashOpen((v) => !v);
                  setDiagramPickerOpen(false);
                }}
                className="flex items-center gap-1 rounded-full bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Khối</span>
              </button>

              <div className="mx-0.5 h-4 w-[1px] bg-[var(--border-hairline)]" />

              {/* 4 One-Tap Semantic Color Dots */}
              {(["def", "formula", "example", "trap"] as BlockType[]).map(
                (t) => {
                  const meta = SEMANTIC_META[t];
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleInsertBlock(t)}
                      title={`Thêm khối ${meta.badge}`}
                      className="flex h-7 w-7 items-center justify-center rounded-full border transition hover:scale-110"
                      style={{
                        backgroundColor: meta.bgVar,
                        borderColor: meta.borderVar,
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: meta.borderVar }}
                      />
                    </button>
                  );
                }
              )}

              <div className="mx-0.5 h-4 w-[1px] bg-[var(--border-hairline)]" />

              {/* Highlighter Brush Mode Toggle */}
              <button
                type="button"
                data-highlight-ui="true"
                onClick={() => {
                  const next = !brushMode;
                  setBrushMode(next);
                  setSelectionPopup(null);
                  setEditingBlockId(null);
                  setDiagramPickerOpen(false);
                  setSlashOpen(false);
                  if (next) {
                    if (blurMode) toggleBlurMode();
                    showToast("Đã bật Bút nhớ — Bôi đen chữ để tô màu ngay!");
                  }
                }}
                title="Chế độ Bút nhớ (tô màu trực tiếp)"
                className={`flex items-center gap-1 rounded-full border px-2 py-1.5 text-xs font-medium transition sm:px-2.5 ${
                  brushMode
                    ? "border-[var(--ink-primary)] bg-[var(--hl-yellow)] text-[var(--ink-primary)]"
                    : "border-transparent text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
                }`}
              >
                <Highlighter className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Bút nhớ</span>
              </button>

              {/* Visual Diagram Trigger ("Sơ đồ") */}
              <button
                type="button"
                onClick={() => {
                  setDiagramPickerOpen((v) => !v);
                  setSlashOpen(false);
                }}
                title="Chèn Sơ đồ trực quan (Luồng, Venn, Cây, Mạng nhện)"
                className={`flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium transition sm:px-2.5 ${
                  diagramPickerOpen
                    ? "bg-[var(--bg-desk)] text-[var(--ink-primary)]"
                    : "text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
                }`}
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sơ đồ</span>
              </button>

              {/* Visual Formula Composer Trigger */}
              <button
                type="button"
                onClick={() =>
                  setFormulaModal({
                    blockId: null,
                    initialLatex:
                      "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1",
                  })
                }
                title="Soạn công thức Toán / Lý / Hóa (fx)"
                className="flex items-center gap-1 rounded-full px-2 py-1.5 font-mono text-xs font-semibold text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)] sm:px-2.5"
              >
                <Sigma className="h-3.5 w-3.5" />
                <span>fx</span>
              </button>

              <button
                type="button"
                onClick={() => openCustomize({ kind: "note", id: note.id })}
                className="flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-medium text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
                title="Đổi sticker & giấy"
              >
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Formula Composer Modal */}
      {formulaModal && (
        <FormulaComposerModal
          open={true}
          initialLatex={formulaModal.initialLatex}
          modeLabel={
            formulaModal.blockId
              ? "Chèn / Sửa công thức vào khối"
              : "Tạo khối Công thức mới"
          }
          onClose={() => setFormulaModal(null)}
          onInsert={handleInsertFormulaFromModal}
        />
      )}

      {/* Interactive Visualize Graph Modal */}
      <NoteVisualizeModal
        open={visualizeOpen}
        note={note}
        allNotes={notes}
        onClose={() => setVisualizeOpen(false)}
        onSelectBlockForEdit={(blockId) => {
          setVisualizeOpen(false);
          setEditingBlockId(blockId);
        }}
      />

      {/* Blurting Mode ("Xả não 5 phút") Modal */}
      <BlurtingModal
        open={blurtingOpen}
        note={note}
        onClose={() => setBlurtingOpen(false)}
        onSaveGapToNote={(gapText) => {
          addBlockToNote(note.id, {
            type: "trap",
            cue: "Lỗ hổng phát hiện từ phiên Xả não",
            content: gapText,
          });
          addFlashcard({
            binderId: binder.id,
            noteId: note.id,
            noteTitle: note.title,
            type: "trap",
            front: `Phần bạn hay quên trong "${note.title}"?`,
            back: gapText,
            tip: "Được lưu trực tiếp từ phiên Xả não 5 phút (Blurting).",
          });
          showToast("Đã lưu lỗ hổng thành khối @trap & thêm vào /review!");
        }}
      />
    </AppShell>
  );
}
