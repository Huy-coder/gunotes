"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyTextHighlight } from "@/lib/highlight/highlight-markup";
import { extractWordAtPoint } from "@/lib/highlight/word-at-point";
import type {
  HighlightUndoEntry,
  SelectionPopupState,
} from "@/features/note-studio/utils/note-studio-helpers";
import type { CornellBlock, HighlightColor, Note } from "@/types/study";

export interface PendingBrushSelection {
  blockId: string;
  text: string;
}

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
  const [pendingBrushSelection, setPendingBrushSelection] =
    useState<PendingBrushSelection | null>(null);
  const [highlightHistory, setHighlightHistory] = useState<
    HighlightUndoEntry[]
  >([]);

  const lastDragApplyAtRef = useRef<number>(0);

  const noteId = note?.id;
  useEffect(() => {
    setHighlightHistory([]);
    setPendingBrushSelection(null);
  }, [noteId]);

  useEffect(() => {
    if (!brushMode) {
      setPendingBrushSelection(null);
    }
  }, [brushMode]);

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
      setPendingBrushSelection(null);
    },
    [note, applyHighlightUpdate]
  );

  const applyPendingBrushSelection = useCallback(() => {
    if (!note || !pendingBrushSelection) return;
    const targetBlock = note.blocks.find(
      (b) => b.id === pendingBrushSelection.blockId
    );
    if (!targetBlock) {
      setPendingBrushSelection(null);
      return;
    }
    applyHighlightUpdate(note.id, targetBlock, pendingBrushSelection.text, brushColor);
    window.getSelection()?.removeAllRanges();
    setPendingBrushSelection(null);
  }, [note, pendingBrushSelection, brushColor, applyHighlightUpdate]);

  const handleBrushTapAtPoint = useCallback(
    (
      block: CornellBlock,
      clientX: number,
      clientY: number,
      containerEl: HTMLElement
    ) => {
      if (!note || !brushMode || blurMode) return;
      if (Date.now() - lastDragApplyAtRef.current < 350) return;

      const word = extractWordAtPoint(clientX, clientY, containerEl);
      if (!word) return;
      applyHighlightUpdate(note.id, block, word, brushColor);
      setPendingBrushSelection(null);
    },
    [note, brushMode, blurMode, brushColor, applyHighlightUpdate]
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

  // Capture desktop mouse drag + mobile native handle selectionchange cleanly
  useEffect(() => {
    let finishTimer: number | null = null;
    let selectionTimer: number | null = null;

    const inspectSelection = (trigger: "mouseup" | "touchend" | "selectionchange") => {
      if (!note || blurMode) return;
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setSelectionPopup(null);
        setPendingBrushSelection(null);
        return;
      }

      const text = sel.toString().trim();
      if (text.length < 1) {
        setSelectionPopup(null);
        setPendingBrushSelection(null);
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
        setPendingBrushSelection(null);
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

      const isCoarsePointer =
        typeof window !== "undefined" &&
        Boolean(window.matchMedia?.("(pointer: coarse)")?.matches);

      if (brushMode) {
        if (trigger === "mouseup" && !isCoarsePointer) {
          lastDragApplyAtRef.current = Date.now();
          applyHighlightUpdate(note.id, matchedBlock, text, brushColor);
          window.getSelection()?.removeAllRanges();
          setSelectionPopup(null);
          setPendingBrushSelection(null);
        } else {
          lastDragApplyAtRef.current = Date.now();
          setPendingBrushSelection({ blockId: matchedBlock.id, text });
          setSelectionPopup(null);
        }
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
    };

    const onPointerFinish = (ev: Event) => {
      const targetEl = ev.target as HTMLElement | null;
      if (targetEl?.closest?.('[data-highlight-ui="true"]')) return;
      const trigger = ev.type === "touchend" ? "touchend" : "mouseup";
      if (finishTimer !== null) window.clearTimeout(finishTimer);
      finishTimer = window.setTimeout(() => inspectSelection(trigger), 24);
    };

    const onSelectionChange = () => {
      if (selectionTimer !== null) window.clearTimeout(selectionTimer);
      selectionTimer = window.setTimeout(() => {
        inspectSelection("selectionchange");
      }, 180);
    };

    document.addEventListener("mouseup", onPointerFinish);
    document.addEventListener("touchend", onPointerFinish);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      if (finishTimer !== null) window.clearTimeout(finishTimer);
      if (selectionTimer !== null) window.clearTimeout(selectionTimer);
      document.removeEventListener("mouseup", onPointerFinish);
      document.removeEventListener("touchend", onPointerFinish);
      document.removeEventListener("selectionchange", onSelectionChange);
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
    pendingBrushSelection,
    applyPendingBrushSelection,
    handleBrushTapAtPoint,
    highlightHistory,
    applyHighlightUpdate,
    applyHighlightAction,
    handleUndoHighlight,
    recordUndoEntry,
    handleTextareaKeyDown,
  };
}
