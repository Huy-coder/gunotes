"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, LayoutTemplate, Plus, Sparkles, Undo2, X } from "lucide-react";
import { BlurtingModal } from "@/components/editor/BlurtingModal";
import { FormulaComposerModal } from "@/components/editor/FormulaComposerModal";
import { NoteVisualizeModal } from "@/components/graph/NoteVisualizeModal";
import { AppShell } from "@/components/layout/AppShell";
import { StickerArt } from "@/components/stickers/StickerArt";
import { AutoResizeTextarea } from "@/components/ui/AutoResizeTextarea";
import { createDiagramPreset } from "@/features/diagrams/presets";
import { NoteBacklinksSection } from "@/features/note-studio/components/NoteBacklinksSection";
import { NoteBottomToolbar } from "@/features/note-studio/components/NoteBottomToolbar";
import { NoteSelectionMenus } from "@/features/note-studio/components/NoteSelectionMenus";
import { NoteStudioHeader } from "@/features/note-studio/components/NoteStudioHeader";
import { NoteStudioSidebar } from "@/features/note-studio/components/NoteStudioSidebar";
import { NoteTemplateLayouts } from "@/features/note-studio/components/NoteTemplateLayouts";
import { PaperInkLayer } from "@/features/note-studio/components/PaperInkLayer";
import { QuickQuizModal } from "@/features/note-studio/components/QuickQuizModal";
import { SemanticBlockCard } from "@/features/note-studio/components/SemanticBlockCard";
import { ShareExportModal } from "@/features/note-studio/components/ShareExportModal";
import { VoiceDictationBar } from "@/features/note-studio/components/VoiceDictationBar";
import { useNoteHighlighting } from "@/features/note-studio/hooks/useNoteHighlighting";
import { useVietnameseVoiceInput } from "@/features/note-studio/hooks/useVietnameseVoiceInput";
import {
  DIAGRAM_PRESET_META,
  getDefaultBlockPayload,
  type MobileTab,
} from "@/features/note-studio/utils/note-studio-helpers";
import { stripStudyMarkup } from "@/lib/highlight/highlight-markup";
import { uploadNoteImage } from "@/lib/media/image-upload";
import {
  getPaperClass,
  NOTE_TEMPLATE_META,
  SEMANTIC_META,
} from "@/lib/semantic-styles";
import { appendVietnameseTranscript } from "@/lib/speech/vietnamese-stt";
import { getBacklinks } from "@/lib/wiki-links";
import { useAppStore } from "@/store/useAppStore";
import type {
  BlockType,
  CornellBlock,
  DiagramData,
  NoteTemplate,
} from "@/types/study";

export default function NoteStudioPage() {
  const params = useParams<{ id: string; noteId: string }>();
  const router = useRouter();
  const binderId = params?.id ?? "";
  const noteId = params?.noteId ?? "";

  const authMode = useAppStore((s) => s.authMode);
  const cloudUserId = useAppStore((s) => s.cloudUserId);
  const binders = useAppStore((s) => s.binders);
  const notes = useAppStore((s) => s.notes);
  const noteFont = useAppStore((s) => s.noteFont);
  const blurMode = useAppStore((s) => s.blurMode);
  const revealedBlockIds = useAppStore((s) => s.revealedBlockIds);
  const secondsLeft = useAppStore((s) => s.secondsLeft);
  const isTimerRunning = useAppStore((s) => s.isTimerRunning);

  const toggleBlurMode = useAppStore((s) => s.toggleBlurMode);
  const toggleRevealBlock = useAppStore((s) => s.toggleRevealBlock);
  const resetReveals = useAppStore((s) => s.resetReveals);
  const updateNote = useAppStore((s) => s.updateNote);
  const addNote = useAppStore((s) => s.addNote);
  const addTagToNote = useAppStore((s) => s.addTagToNote);
  const removeTagFromNote = useAppStore((s) => s.removeTagFromNote);
  const addBlockToNote = useAppStore((s) => s.addBlockToNote);
  const restoreBlock = useAppStore((s) => s.restoreBlock);
  const updateBlock = useAppStore((s) => s.updateBlock);
  const moveBlock = useAppStore((s) => s.moveBlock);
  const reorderBlock = useAppStore((s) => s.reorderBlock);
  const deleteBlock = useAppStore((s) => s.deleteBlock);
  const addFlashcard = useAppStore((s) => s.addFlashcard);
  const generateDeckFromNote = useAppStore((s) => s.generateDeckFromNote);
  const openCustomize = useAppStore((s) => s.openCustomize);
  const showToast = useAppStore((s) => s.showToast);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileTab, setMobileTab] = useState<MobileTab>("all");
  const [slashOpen, setSlashOpen] = useState(false);
  const [diagramPickerOpen, setDiagramPickerOpen] = useState(false);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [editingState, setEditingState] = useState<{
    blockId: string | null;
    caret: "start" | "end";
  }>({ blockId: null, caret: "end" });
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(
    null
  );
  const [inkMode, setInkMode] = useState(false);
  const [tagInputOpen, setTagInputOpen] = useState(false);
  const [newTagText, setNewTagText] = useState("");
  const [blurtingOpen, setBlurtingOpen] = useState(false);
  const [visualizeOpen, setVisualizeOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [linkPickerBlockId, setLinkPickerBlockId] = useState<string | null>(
    null
  );
  const [deletedBlockUndo, setDeletedBlockUndo] = useState<{
    block: CornellBlock;
    index: number;
  } | null>(null);
  const [formulaModal, setFormulaModal] = useState<{
    blockId: string | null;
    initialLatex: string;
  } | null>(null);

  const autoFocusedNoteRef = useRef<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const pendingImageAfterIdRef = useRef<string | undefined>(undefined);

  const editingBlockId = editingState.blockId;
  const setEditingBlockId = useCallback(
    (id: string | null, caret: "start" | "end" = "end") => {
      setEditingState({ blockId: id, caret });
    },
    []
  );

  const binder = binders.find((b) => b.id === binderId);
  const binderNotes = notes.filter((n) => n.binderId === binderId);
  const note = notes.find((n) => n.id === noteId);

  const {
    brushMode,
    setBrushMode,
    brushColor,
    setBrushColor,
    selectionPopup,
    setSelectionPopup,
    pendingBrushSelection,
    applyPendingBrushSelection,
    handleBrushTapAtPoint,
    highlightHistory,
    applyHighlightUpdate,
    applyHighlightAction,
    handleUndoHighlight,
    recordUndoEntry,
    handleTextareaKeyDown,
  } = useNoteHighlighting({
    note,
    editingBlockId,
    blurMode,
    updateBlock,
    showToast,
  });

  const {
    isListening,
    isTranscribing,
    voiceBlockId,
    interimTranscript,
    startForBlock,
    stopListening,
  } = useVietnameseVoiceInput({
    noteId,
    onFinalTranscript: (targetBlockId, chunk) => {
      const latestNote = useAppStore
        .getState()
        .notes.find((n) => n.id === noteId);
      const blk = latestNote?.blocks.find((b) => b.id === targetBlockId);
      if (!blk) return;
      const nextContent = appendVietnameseTranscript(blk.content, chunk);
      updateBlock(noteId, targetBlockId, { content: nextContent });
    },
    onToast: showToast,
  });

  const handleToggleVoice = useCallback(
    (preferredBlockId?: string) => {
      if (!note) return;
      if (
        (isListening || isTranscribing) &&
        (!preferredBlockId || voiceBlockId === preferredBlockId)
      ) {
        stopListening();
        return;
      }
      if (blurMode) toggleBlurMode();
      setBrushMode(false);
      setInkMode(false);
      setSlashOpen(false);
      setDiagramPickerOpen(false);
      setSelectionPopup(null);

      let targetId = preferredBlockId ?? editingBlockId;
      if (!targetId) {
        const last = note.blocks[note.blocks.length - 1];
        if (
          last &&
          last.type !== "diagram" &&
          last.type !== "image" &&
          last.content.trim() === ""
        ) {
          targetId = last.id;
        } else {
          const created = addBlockToNote(note.id, {
            type: "text",
            cue: "",
            content: "",
          });
          targetId = created.id;
        }
      }
      setEditingBlockId(targetId, "end");
      startForBlock(targetId);
    },
    [
      note,
      isListening,
      isTranscribing,
      voiceBlockId,
      stopListening,
      blurMode,
      toggleBlurMode,
      setBrushMode,
      setSelectionPopup,
      editingBlockId,
      addBlockToNote,
      setEditingBlockId,
      startForBlock,
    ]
  );

  // Reset per-note UI only when navigating to a different note
  useEffect(() => {
    setDeletedBlockUndo(null);
    setTemplateMenuOpen(false);
    setInkMode(false);
  }, [noteId]);

  // Support deep link ?block=blk-... from CommandPalette search hits
  useEffect(() => {
    if (typeof window === "undefined") return;
    const blockParam = new URLSearchParams(window.location.search).get("block");
    if (!blockParam) return;
    setHighlightedBlockId(blockParam);
    const el = document.querySelector(`[data-block-id="${blockParam}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    const timer = window.setTimeout(() => setHighlightedBlockId(null), 3200);
    return () => window.clearTimeout(timer);
  }, [noteId]);

  // Auto-focus fresh blank page once on first mount of that note
  useEffect(() => {
    if (!note) return;
    if (autoFocusedNoteRef.current === note.id) return;
    autoFocusedNoteRef.current = note.id;
    if (
      note.blocks.length === 1 &&
      note.blocks[0].type === "text" &&
      note.blocks[0].content === ""
    ) {
      setEditingBlockId(note.blocks[0].id, "start");
    } else {
      setEditingBlockId(null);
    }
  }, [note, setEditingBlockId]);

  // Auto-clear block delete undo bar after 7s
  useEffect(() => {
    if (!deletedBlockUndo) return;
    const timer = window.setTimeout(() => setDeletedBlockUndo(null), 7000);
    return () => window.clearTimeout(timer);
  }, [deletedBlockUndo]);

  const handleRestoreDeletedBlock = useCallback(() => {
    if (!note || !deletedBlockUndo) return;
    restoreBlock(note.id, deletedBlockUndo.block, deletedBlockUndo.index);
    setEditingBlockId(deletedBlockUndo.block.id, "end");
    setDeletedBlockUndo(null);
    showToast("Đã khôi phục khối vừa xóa!");
  }, [note, deletedBlockUndo, restoreBlock, setEditingBlockId, showToast]);

  const handleUploadImageFile = useCallback(
    async (file: File, insertAfterBlockId?: string) => {
      if (!note) return;
      showToast("Đang xử lý & chèn ảnh vào trang...");
      try {
        const url = await uploadNoteImage(file, cloudUserId);
        addBlockToNote(
          note.id,
          {
            type: "image",
            title: "HÌNH ẢNH",
            cue: "Ảnh minh họa / Chụp bảng",
            content: "Hình ảnh ghi chú",
            imageUrl: url,
            imageCaption: "",
            imageStrokes: [],
          },
          insertAfterBlockId
        );
        setEditingBlockId(null);
        showToast("Đã chèn hình ảnh vào trang ghi chú!");
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Không thể tải ảnh lên trang."
        );
      }
    },
    [note, cloudUserId, addBlockToNote, setEditingBlockId, showToast]
  );

  // Paste image directly from clipboard (Ctrl+V / Cmd+V)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!note || blurMode) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleUploadImageFile(file, editingBlockId ?? undefined);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [note, blurMode, editingBlockId, handleUploadImageFile]);

  // Global keyboard shortcuts ('R' blur, '/' slash, 'Ctrl/Cmd+Z' undo, 'Esc' dismiss)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSlashOpen(false);
        setDiagramPickerOpen(false);
        setTemplateMenuOpen(false);
        setSelectionPopup(null);
        setLinkPickerBlockId(null);
        setInkMode(false);
        return;
      }
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "z" &&
        !e.shiftKey
      ) {
        if (deletedBlockUndo) {
          e.preventDefault();
          handleRestoreDeletedBlock();
          return;
        }
        if (highlightHistory.length > 0) {
          e.preventDefault();
          handleUndoHighlight();
        }
        return;
      }
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
  }, [
    toggleBlurMode,
    highlightHistory.length,
    handleUndoHighlight,
    deletedBlockUndo,
    handleRestoreDeletedBlock,
    setSelectionPopup,
  ]);

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

  const handleInsertBlock = (type: BlockType, insertAfterBlockId?: string) => {
    if (type === "image") {
      pendingImageAfterIdRef.current = insertAfterBlockId;
      imageInputRef.current?.click();
      return;
    }
    const payload = getDefaultBlockPayload(type);
    const created = addBlockToNote(
      note.id,
      {
        type,
        cue: payload.cue,
        content: payload.content,
        diagram: type === "diagram" ? createDiagramPreset("flowchart") : undefined,
      },
      insertAfterBlockId
    );
    setSlashOpen(false);
    setEditingBlockId(created.id, "start");
  };

  const handleInsertDiagram = (
    kind: DiagramData["kind"],
    insertAfterBlockId?: string
  ) => {
    const info = DIAGRAM_PRESET_META[kind];
    addBlockToNote(
      note.id,
      {
        type: "diagram",
        title: info.title,
        cue: info.cue,
        content: info.title,
        diagram: createDiagramPreset(kind),
      },
      insertAfterBlockId
    );
    setDiagramPickerOpen(false);
    setEditingBlockId(null);
    showToast(info.toast);
  };

  const handleDeleteBlockWithUndo = (targetNoteId: string, blockId: string) => {
    const idx = note.blocks.findIndex((b) => b.id === blockId);
    const target = idx !== -1 ? note.blocks[idx] : undefined;
    if (editingBlockId === blockId) setEditingBlockId(null);
    deleteBlock(targetNoteId, blockId);
    if (target) {
      setDeletedBlockUndo({ block: target, index: idx });
    }
  };

  const handleFocusAdjacent = (blockId: string, dir: "prev" | "next") => {
    const idx = note.blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    const step = dir === "prev" ? -1 : 1;
    for (let i = idx + step; i >= 0 && i < note.blocks.length; i += step) {
      if (note.blocks[i].type !== "diagram" && note.blocks[i].type !== "image") {
        setEditingBlockId(note.blocks[i].id, dir === "prev" ? "end" : "start");
        return;
      }
    }
  };

  const handleDeleteEmptyAndFocusPrev = (blockId: string) => {
    const idx = note.blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return;
    let prevTextBlockId: string | null = null;
    for (let i = idx - 1; i >= 0; i--) {
      if (note.blocks[i].type !== "diagram" && note.blocks[i].type !== "image") {
        prevTextBlockId = note.blocks[i].id;
        break;
      }
    }
    deleteBlock(note.id, blockId);
    setEditingBlockId(prevTextBlockId, "end");
  };

  const handleClickPaperTail = () => {
    if (blurMode || brushMode || inkMode) return;
    const last = note.blocks[note.blocks.length - 1];
    if (
      last &&
      last.type !== "diagram" &&
      last.type !== "image" &&
      last.content.trim() === ""
    ) {
      setEditingBlockId(last.id, "end");
      return;
    }
    handleInsertBlock("text");
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
        block.type === "text" ||
        block.type === "diagram" ||
        block.type === "image"
          ? "def"
          : block.type,
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
            : target.content.trim().length > 0
            ? `${target.content.trim()}\n${formatted}`
            : formatted;
        updateBlock(note.id, target.id, { content: nextContent });
        showToast("Đã cập nhật công thức KaTeX!");
        return;
      }
    }

    const created = addBlockToNote(note.id, {
      type: "formula",
      cue: "Công thức / Biểu thức quan trọng?",
      content: formatted,
    });
    setEditingBlockId(created.id, "end");
    showToast("Đã chèn khối công thức mới!");
  };

  const totalBlocks = note.blocks.length;
  const revealedCount = revealedBlockIds.filter((id) =>
    note.blocks.some((b) => b.id === id)
  ).length;
  const activeTemplate: NoteTemplate = note.template ?? "freeform";
  const activeTemplateMeta =
    NOTE_TEMPLATE_META.find((t) => t.id === activeTemplate) ??
    NOTE_TEMPLATE_META[0];
  const selectedBlock = selectionPopup
    ? note.blocks.find((b) => b.id === selectionPopup.blockId)
    : undefined;
  const backlinks = getBacklinks(note, notes);
  const linkableOtherNotes = notes.filter((n) => n.id !== note.id);

  return (
    <AppShell hideMobileBottomBar>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) {
            void handleUploadImageFile(file, pendingImageAfterIdRef.current);
          }
          pendingImageAfterIdRef.current = undefined;
        }}
      />

      <div className="flex min-h-screen bg-[var(--bg-desk)]">
        {sidebarOpen && (
          <NoteStudioSidebar
            binder={binder}
            binderNotes={binderNotes}
            activeNoteId={note.id}
            onClose={() => setSidebarOpen(false)}
            onCreateNote={() => {
              const created = addNote(
                binder.id,
                undefined,
                undefined,
                activeTemplate
              );
              router.push(`/binder/${binder.id}/note/${created.id}`);
            }}
          />
        )}

        <div className="relative flex min-w-0 flex-1 flex-col">
          <NoteStudioHeader
            sidebarOpen={sidebarOpen}
            onOpenSidebar={() => setSidebarOpen(true)}
            binder={binder}
            note={note}
            activeTemplate={activeTemplate}
            mobileTab={mobileTab}
            onChangeMobileTab={setMobileTab}
            blurMode={blurMode}
            revealedCount={revealedCount}
            totalBlocks={totalBlocks}
            onToggleBlur={toggleBlurMode}
            onResetReveals={resetReveals}
            onOpenVisualize={() => setVisualizeOpen(true)}
            onOpenBlurting={() => setBlurtingOpen(true)}
            onOpenQuiz={() => setQuizOpen(true)}
            onGenerateDeck={() => {
              const count = generateDeckFromNote(note.id);
              showToast(
                count > 0
                  ? `Đã tạo ${count} thẻ Flashcard mới vào /review!`
                  : "Trang này chưa có từ khóa mới hoặc đã tạo thẻ hết rồi."
              );
            }}
            onOpenShare={() => setShareOpen(true)}
            secondsLeft={secondsLeft}
            isTimerRunning={isTimerRunning}
            onUpdatePaper={(paperStyle) => updateNote(note.id, { paperStyle })}
            onOpenCustomize={() => openCustomize({ kind: "note", id: note.id })}
          />

          <div className="flex-1 px-0 pt-0 pb-36 sm:px-6 sm:pt-6">
            <article
              className={`${getPaperClass(
                note.paperStyle
              )} print-sheet paper-shadow relative mx-auto max-w-[920px] border-[var(--border-hairline)] p-4 sm:rounded-[20px] sm:border sm:p-8 sm:pl-14 ${
                noteFont === "serif" ? "font-serif" : "font-sans"
              }`}
            >
              <PaperInkLayer
                inkMode={inkMode}
                strokes={note.inkStrokes ?? []}
                onChangeStrokes={(next) =>
                  updateNote(note.id, { inkStrokes: next })
                }
                onCloseInkMode={() => setInkMode(false)}
              />

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

              {/* Note Title, Compact Template Selector, Tags & Corner Sticker */}
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
                    {/* Compact Template Dropdown Pill */}
                    <div className="no-print relative">
                      <button
                        type="button"
                        onClick={() => setTemplateMenuOpen((v) => !v)}
                        title={activeTemplateMeta.shortDesc}
                        className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-0.5 font-semibold text-[var(--ink-primary)] transition hover:border-[var(--ink-primary)]"
                      >
                        <LayoutTemplate className="h-3 w-3 text-[var(--ink-muted)]" />
                        <span>{activeTemplateMeta.label}</span>
                        <ChevronDown className="h-3 w-3 text-[var(--ink-muted)]" />
                      </button>

                      {templateMenuOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-20"
                            onClick={() => setTemplateMenuOpen(false)}
                          />
                          <div className="paper-shadow absolute top-8 left-0 z-30 w-72 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-1.5">
                            <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-[var(--ink-muted)] uppercase">
                              Chọn bố cục trang giấy
                            </div>
                            {NOTE_TEMPLATE_META.map((tpl) => {
                              const active = activeTemplate === tpl.id;
                              return (
                                <button
                                  key={tpl.id}
                                  type="button"
                                  onClick={() => {
                                    updateNote(note.id, { template: tpl.id });
                                    setTemplateMenuOpen(false);
                                    showToast(`Đã đổi sang ${tpl.label}`);
                                  }}
                                  className={`block w-full rounded-xl px-2.5 py-2 text-left font-sans transition ${
                                    active
                                      ? "bg-[var(--bg-desk)] text-[var(--ink-primary)]"
                                      : "hover:bg-[var(--bg-desk)]/60"
                                  }`}
                                >
                                  <div className="flex items-center justify-between text-xs font-semibold">
                                    <span>{tpl.label}</span>
                                    {active && (
                                      <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                                        Đang dùng
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[11px] text-[var(--ink-muted)]">
                                    {tpl.shortDesc}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

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
                      {note.blocks.length} khối
                    </span>
                  </div>
                </div>

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

              <NoteTemplateLayouts
                noteId={note.id}
                activeTemplate={activeTemplate}
                mobileTab={mobileTab}
                blocks={note.blocks}
                blurMode={blurMode}
                brushMode={brushMode}
                onClickPaperTail={handleClickPaperTail}
                onUpdateBlock={updateBlock}
                renderCard={(block, options) => (
                  <SemanticBlockCard
                    noteId={note.id}
                    block={block}
                    isFirst={note.blocks[0]?.id === block.id}
                    isLast={note.blocks[note.blocks.length - 1]?.id === block.id}
                    isOnlyBlock={note.blocks.length <= 1}
                    blurMode={blurMode}
                    isRevealed={revealedBlockIds.includes(block.id)}
                    isEditing={editingBlockId === block.id}
                    highlighted={highlightedBlockId === block.id}
                    voiceActiveForBlock={
                      (isListening || isTranscribing) &&
                      voiceBlockId === block.id
                    }
                    voiceInterimText={
                      voiceBlockId === block.id ? interimTranscript : ""
                    }
                    focusCaret={editingState.caret}
                    brushMode={brushMode}
                    brushColor={brushColor}
                    linkableOtherNotes={linkableOtherNotes}
                    linkPickerBlockId={linkPickerBlockId}
                    setLinkPickerBlockId={setLinkPickerBlockId}
                    setEditingBlockId={setEditingBlockId}
                    clearSelectionPopup={() => setSelectionPopup(null)}
                    onOpenFormulaModal={(blockId, initialLatex) =>
                      setFormulaModal({ blockId, initialLatex })
                    }
                    onOpenImagePicker={(afterId) => {
                      pendingImageAfterIdRef.current = afterId;
                      imageInputRef.current?.click();
                    }}
                    onMoveBlock={moveBlock}
                    onReorderBlock={reorderBlock}
                    onUpdateBlock={updateBlock}
                    onDeleteBlock={handleDeleteBlockWithUndo}
                    onInsertBlockAfter={(afterBlockId, type = "text") =>
                      handleInsertBlock(type, afterBlockId)
                    }
                    onInsertDiagramAfter={(afterBlockId, kind) =>
                      handleInsertDiagram(kind, afterBlockId)
                    }
                    onFocusAdjacent={handleFocusAdjacent}
                    onDeleteEmptyAndFocusPrev={handleDeleteEmptyAndFocusPrev}
                    onToggleRevealBlock={toggleRevealBlock}
                    onBrushApply={applyHighlightUpdate}
                    onBrushTapWord={handleBrushTapAtPoint}
                    onToggleVoiceForBlock={() => handleToggleVoice(block.id)}
                    onRecordUndo={recordUndoEntry}
                    onTextareaKeyDown={handleTextareaKeyDown}
                    onWikiLinkInserted={(targetTitle) =>
                      showToast(`Đã chèn liên kết [[${targetTitle}]]`)
                    }
                    compact={options?.compact}
                    hideBadge={options?.hideBadge}
                  />
                )}
              />

              <NoteBacklinksSection
                note={note}
                activeTemplate={activeTemplate}
                mobileTab={mobileTab}
                backlinks={backlinks}
                onUpdateSummary={(summary) => updateNote(note.id, { summary })}
                onOpenVisualize={() => setVisualizeOpen(true)}
              />
            </article>
          </div>

          <NoteSelectionMenus
            selectionPopup={selectionPopup}
            selectedBlock={selectedBlock}
            pendingBrushSelection={pendingBrushSelection}
            brushMode={brushMode}
            brushColor={brushColor}
            highlightHistoryCount={highlightHistory.length}
            onSetBrushColor={setBrushColor}
            onApplyPendingBrush={applyPendingBrushSelection}
            onCloseBrushMode={() => setBrushMode(false)}
            onUndoHighlight={handleUndoHighlight}
            onApplyHighlight={applyHighlightAction}
            onCreateFlashcard={handleCreateFlashcardFromBlock}
            onClosePopup={() => setSelectionPopup(null)}
          />

          {/* 1-tap Block Delete Undo Pill */}
          {deletedBlockUndo && (
            <div className="no-print pointer-events-none fixed right-0 bottom-20 left-0 z-40 flex justify-center px-3 lg:left-[232px]">
              <div className="paper-shadow pointer-events-auto flex items-center gap-3 rounded-full border border-[var(--ink-primary)] bg-[var(--bg-elevated)] px-3.5 py-1.5 text-xs">
                <span className="text-[var(--ink-muted)]">
                  Đã xóa khối{" "}
                  <strong className="text-[var(--ink-primary)]">
                    {deletedBlockUndo.block.title ??
                      SEMANTIC_META[deletedBlockUndo.block.type].badge}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={handleRestoreDeletedBlock}
                  className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-primary)] px-2.5 py-1 font-mono text-[11px] font-semibold text-[var(--accent-primary-fg)]"
                >
                  <Undo2 className="h-3 w-3" />
                  <span>Hoàn tác</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeletedBlockUndo(null)}
                  className="rounded-full p-0.5 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                  aria-label="Đóng"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          <VoiceDictationBar
            isListening={isListening}
            isTranscribing={isTranscribing}
            interimTranscript={interimTranscript}
            onInsertNewline={() => {
              if (!voiceBlockId) return;
              const latestNote = useAppStore
                .getState()
                .notes.find((n) => n.id === note.id);
              const blk = latestNote?.blocks.find((b) => b.id === voiceBlockId);
              if (!blk) return;
              updateBlock(note.id, voiceBlockId, {
                content: blk.content.endsWith("\n")
                  ? blk.content
                  : `${blk.content}\n`,
              });
            }}
            onStop={stopListening}
          />

          <NoteBottomToolbar
            isEditingAny={editingBlockId !== null}
            slashOpen={slashOpen}
            setSlashOpen={setSlashOpen}
            diagramPickerOpen={diagramPickerOpen}
            setDiagramPickerOpen={setDiagramPickerOpen}
            brushMode={brushMode}
            onToggleBrushMode={() => {
              const next = !brushMode;
              setBrushMode(next);
              setInkMode(false);
              setSelectionPopup(null);
              setEditingBlockId(null);
              setDiagramPickerOpen(false);
              setSlashOpen(false);
              if (next) {
                if (blurMode) toggleBlurMode();
                showToast(
                  "Đã bật Bút nhớ — Chạm 1 từ hoặc bôi đen đoạn để tô màu!"
                );
              }
            }}
            inkMode={inkMode}
            onToggleInkMode={() => {
              const next = !inkMode;
              setInkMode(next);
              setBrushMode(false);
              setEditingBlockId(null);
              setDiagramPickerOpen(false);
              setSlashOpen(false);
              if (next) {
                if (blurMode) toggleBlurMode();
                showToast("Đã bật Bút vẽ tự do trên giấy!");
              }
            }}
            voiceActive={isListening || isTranscribing}
            onToggleVoice={() => handleToggleVoice()}
            highlightHistoryCount={highlightHistory.length}
            onUndoHighlight={handleUndoHighlight}
            onQuickWrite={handleClickPaperTail}
            onTriggerImageUpload={() => {
              pendingImageAfterIdRef.current = editingBlockId ?? undefined;
              imageInputRef.current?.click();
            }}
            onInsertBlock={(t) => handleInsertBlock(t)}
            onInsertDiagram={(kind) => handleInsertDiagram(kind)}
            onOpenNewFormula={() =>
              setFormulaModal({
                blockId: null,
                initialLatex: "\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1",
              })
            }
            onOpenCustomize={() => openCustomize({ kind: "note", id: note.id })}
          />
        </div>
      </div>

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

      <QuickQuizModal
        open={quizOpen}
        note={note}
        onClose={() => setQuizOpen(false)}
        onSaveWrongToFlashcard={(q) => {
          addFlashcard({
            binderId: binder.id,
            noteId: note.id,
            noteTitle: note.title,
            type: "trap",
            front: q.question,
            back: q.options[q.correctIndex] ?? q.explanation,
            tip: q.explanation,
          });
          showToast("Đã lưu câu trắc nghiệm vào /review!");
        }}
      />

      <ShareExportModal
        open={shareOpen}
        note={note}
        authMode={authMode}
        onTogglePublic={(nextPublic) =>
          updateNote(note.id, { isPublic: nextPublic })
        }
        onClose={() => setShareOpen(false)}
        onToast={showToast}
      />
    </AppShell>
  );
}
