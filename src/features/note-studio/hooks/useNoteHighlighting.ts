"use client";

import { useCallback, useEffect, useState } from "react";
import { applyTextHighlight } from "@/lib/highlight/highlight-markup";
import type {
  HighlightUndoEntry,
  SelectionPopupState,
} from "@/features/note-studio/utils/note-studio-helpers";
import type { CornellBlock, HighlightColor, Note } from "@/types/study";

export function useNoteHighlighting({
  note,
  editingBlockId,
  blurMode,
  updateBlock,
  showToast,
}: {
  note: Note | undefined;
  editingBlockId: string | null;
  blurMode: boolean;
  updateBlock: (
    noteId: string,
    blockId: string,
    patch: Partial<CornellBlock>
  ) => void;
  showToast: (msg: string) => void;
}) {
  const [brushMode, setBrushMode] = useState(false);
  const [brushColor, setBrushColor] = useState<
    HighlightColor | "cloze" | "clear"
  >("y");
  const [selectionPopup, setSelectionPopup] =
    useState<SelectionPopupState | null>(null);
  const [highlightHistory, setHighlightHistory] = useState<
    HighlightUndoEntry[]
  >([]);

  const noteId = note?.id;
  useEffect(() => {
    setHighlightHistory([]);
  }, [noteId]);

  const recordUndoEntry = useCallback(
    (blockId: string, prevContent: string) => {
      setHighlightHistory((prev) => [
        ...prev.slice(-29),
        { blockId, prevContent },
      ]);
    },
    []
  );

  const handleUndoHighlight = useCallback(() => {
    if (!note || highlightHistory.length === 0) return;
    const last = highlightHistory[highlightHistory.length - 1];
    setHighlightHistory((prev) => prev.slice(0, -1));
    updateBlock(note.id, last.blockId, { content: last.prevContent });
    showToast("Đã hoàn tác thao tác tô màu!");
  }, [note, highlightHistory, updateBlock, showToast]);

  const applyHighlightUpdate = useCallback(
    (
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
      setHighlightHistory((prev) => [
        ...prev.slice(-29),
        { blockId: block.id, prevContent: block.content },
      ]);
      updateBlock(targetNoteId, block.id, { content: updated });
      showToast(
        mode === "clear"
          ? "Đã xóa tô màu"
          : mode === "cloze"
          ? "Đã tạo ô che (Cloze)"
          : "Đã tô bút nhớ!"
      );
    },
    [updateBlock, showToast]
  );

  const applyHighlightAction = useCallback(
    (
      block: CornellBlock,
      selectedText: string,
      mode: HighlightColor | "cloze" | "clear"
    ) => {
      if (!note) return;
      applyHighlightUpdate(note.id, block, selectedText, mode);
      window.getSelection()?.removeAllRanges();
      setSelectionPopup(null);
    },
    [note, applyHighlightUpdate]
  );

  const handleTextareaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, block: CornellBlock) => {
      if (!note || !(e.metaKey || e.ctrlKey)) return;
      const key = e.key.toLowerCase();
      if (key !== "h" && !(e.shiftKey && key === "c")) return;

      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      if (start === end) return;

      e.preventDefault();
      const selected = block.content.slice(start, end);
      const wrapped = key === "h" ? `==y:${selected}==` : `{{${selected}}}`;
      const next =
        block.content.slice(0, start) + wrapped + block.content.slice(end);
      setHighlightHistory((prev) => [
        ...prev.slice(-29),
        { blockId: block.id, prevContent: block.content },
      ]);
      updateBlock(note.id, block.id, { content: next });
      showToast(key === "h" ? "Đã tô highlight (Ctrl+H)" : "Đã tạo Cloze");
    },
    [note, updateBlock, showToast]
  );

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
  }, [
    note,
    blurMode,
    editingBlockId,
    brushMode,
    brushColor,
    applyHighlightUpdate,
  ]);

  return {
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
    recordUndoEntry,
    handleTextareaKeyDown,
  };
}
