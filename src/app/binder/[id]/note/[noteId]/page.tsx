"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, Sparkles, X } from "lucide-react";
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
import { SemanticBlockCard } from "@/features/note-studio/components/SemanticBlockCard";
import { useNoteHighlighting } from "@/features/note-studio/hooks/useNoteHighlighting";
import {
  DIAGRAM_PRESET_META,
  getDefaultBlockPayload,
  type MobileTab,
} from "@/features/note-studio/utils/note-studio-helpers";
import { stripStudyMarkup } from "@/lib/highlight/highlight-markup";
import {
  getPaperClass,
  NOTE_TEMPLATE_META,
  SEMANTIC_META,
} from "@/lib/semantic-styles";
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
  const updateBlock = useAppStore((s) => s.updateBlock);
  const moveBlock = useAppStore((s) => s.moveBlock);
  const deleteBlock = useAppStore((s) => s.deleteBlock);
  const addFlashcard = useAppStore((s) => s.addFlashcard);
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
  const [formulaModal, setFormulaModal] = useState<{
    blockId: string | null;
    initialLatex: string;
  } | null>(null);

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
    highlightHistory,
    applyHighlightUpdate,
    applyHighlightAction,
    handleUndoHighlight,
    handleTextareaKeyDown,
  } = useNoteHighlighting({
    note,
    editingBlockId,
    blurMode,
    updateBlock,
    showToast,
  });

  // Global keyboard shortcuts ('R' blur, '/' slash, 'Ctrl/Cmd+Z' highlight undo, 'Esc' dismiss)
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
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "z" &&
        !e.shiftKey
      ) {
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
  }, [toggleBlurMode, highlightHistory.length, handleUndoHighlight, setSelectionPopup]);

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
    const payload = getDefaultBlockPayload(type);
    addBlockToNote(note.id, {
      type,
      cue: payload.cue,
      content: payload.content,
      diagram: type === "diagram" ? createDiagramPreset("flowchart") : undefined,
    });
    setSlashOpen(false);
    showToast(`Đã thêm khối ${SEMANTIC_META[type].badge}`);
  };

  const handleInsertDiagram = (kind: DiagramData["kind"]) => {
    const info = DIAGRAM_PRESET_META[kind];
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

  return (
    <AppShell hideMobileBottomBar>
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

              {/* Note Title, Tags & Corner Sticker */}
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

              {/* Template Switcher Strip */}
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

              <NoteTemplateLayouts
                noteId={note.id}
                activeTemplate={activeTemplate}
                mobileTab={mobileTab}
                blocks={note.blocks}
                onUpdateBlock={updateBlock}
                renderCard={(block, options) => (
                  <SemanticBlockCard
                    noteId={note.id}
                    block={block}
                    isFirst={note.blocks[0]?.id === block.id}
                    isLast={note.blocks[note.blocks.length - 1]?.id === block.id}
                    blurMode={blurMode}
                    isRevealed={revealedBlockIds.includes(block.id)}
                    isEditing={editingBlockId === block.id}
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
                    onMoveBlock={moveBlock}
                    onUpdateBlock={updateBlock}
                    onDeleteBlock={deleteBlock}
                    onToggleRevealBlock={toggleRevealBlock}
                    onBrushApply={applyHighlightUpdate}
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
            brushMode={brushMode}
            brushColor={brushColor}
            highlightHistoryCount={highlightHistory.length}
            onSetBrushColor={setBrushColor}
            onCloseBrushMode={() => setBrushMode(false)}
            onUndoHighlight={handleUndoHighlight}
            onApplyHighlight={applyHighlightAction}
            onCreateFlashcard={handleCreateFlashcardFromBlock}
            onClosePopup={() => setSelectionPopup(null)}
          />

          <NoteBottomToolbar
            slashOpen={slashOpen}
            setSlashOpen={setSlashOpen}
            diagramPickerOpen={diagramPickerOpen}
            setDiagramPickerOpen={setDiagramPickerOpen}
            brushMode={brushMode}
            onToggleBrushMode={() => {
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
            highlightHistoryCount={highlightHistory.length}
            onUndoHighlight={handleUndoHighlight}
            onInsertBlock={handleInsertBlock}
            onInsertDiagram={handleInsertDiagram}
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
    </AppShell>
  );
}
