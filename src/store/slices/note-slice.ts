"use client";

import {
  deleteNoteFromCloud,
  flushNoteToCloud,
  generateUuid,
} from "@/lib/repository/supabase-sync";
import { canCloudSync } from "@/store/slices/cloud-helpers";
import type {
  CloudSyncHelpers,
  NoteSlice,
  StoreGet,
  StoreSet,
} from "@/store/types";
import type { BlockType, CornellBlock, Note, NoteBlockLink } from "@/types/study";

const BLOCK_DEFAULT_TITLE: Record<BlockType, string> = {
  def: "ĐỊNH NGHĨA",
  formula: "CÔNG THỨC",
  example: "VÍ DỤ",
  trap: "BẪY HAY SAI",
  text: "GHI CHÚ",
  diagram: "SƠ ĐỒ TRỰC QUAN",
};

export function createNoteSlice(
  set: StoreSet,
  get: StoreGet,
  helpers: CloudSyncHelpers
): NoteSlice {
  const { applyCloudResult, pushNoteDebounced } = helpers;

  const patchNoteById = (noteId: string, updater: (note: Note) => Note) => {
    set((state) => ({
      notes: state.notes.map((n) => (n.id === noteId ? updater(n) : n)),
    }));
    pushNoteDebounced(noteId);
  };

  return {
    notes: [],
    blurMode: false,
    revealedBlockIds: [],

    addNote: (binderId, title, paperStyle, template) => {
      const state = get();
      const created: Note = {
        id: generateUuid(),
        binderId,
        title: title?.trim() || "Trang ghi chú mới",
        template: template ?? "freeform",
        paperStyle: paperStyle ?? state.defaultPaper,
        tags: [],
        headerStickerId: null,
        updatedAt: "Vừa xong",
        updatedMinutesAgo: 0,
        blocks: [
          {
            id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            cue: "",
            type: "text",
            title: "GHI CHÚ",
            content: "",
            blurrable: true,
          },
        ],
        summary: "",
      };
      set((s) => ({
        notes: [created, ...s.notes],
      }));
      const cur = get();
      if (canCloudSync(cur)) {
        set({ cloudSyncStatus: "syncing" });
        void flushNoteToCloud(cur.cloudUserId, created).then(applyCloudResult);
      }
      return created;
    },

    updateNote: (noteId, patch) => {
      patchNoteById(noteId, (n) => ({
        ...n,
        ...patch,
        updatedAt: "Vừa lưu",
        updatedMinutesAgo: 0,
      }));
    },

    deleteNote: (noteId) => {
      const s = get();
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== noteId),
        flashcards: state.flashcards.filter((f) => f.noteId !== noteId),
        customizeTarget:
          state.customizeTarget?.kind === "note" &&
          state.customizeTarget.id === noteId
            ? null
            : state.customizeTarget,
      }));
      if (canCloudSync(s)) {
        set({ cloudSyncStatus: "syncing" });
        void deleteNoteFromCloud(noteId).then(applyCloudResult);
      }
    },

    duplicateNote: (noteId) => {
      const original = get().notes.find((n) => n.id === noteId);
      if (!original) return null;
      const stamp = Date.now();
      const blockIdMap = new Map<string, string>();
      const duplicatedBlocks = original.blocks.map((b, idx) => {
        const nextId = `blk-${stamp}-${idx}`;
        blockIdMap.set(b.id, nextId);
        return {
          ...b,
          id: nextId,
          diagram: b.diagram
            ? JSON.parse(JSON.stringify(b.diagram))
            : undefined,
          canvasGraph: b.canvasGraph
            ? JSON.parse(JSON.stringify(b.canvasGraph))
            : undefined,
        };
      });
      const copy: Note = {
        ...original,
        id: generateUuid(),
        title: `${original.title} (Bản sao)`,
        updatedAt: "Vừa nhân bản",
        updatedMinutesAgo: 0,
        blocks: duplicatedBlocks,
        blockLinks: original.blockLinks
          ?.map((lnk, idx) => {
            const src = blockIdMap.get(lnk.sourceBlockId);
            const tgt = blockIdMap.get(lnk.targetBlockId);
            if (!src || !tgt) return null;
            return {
              ...lnk,
              id: `blnk-${stamp}-${idx}`,
              sourceBlockId: src,
              targetBlockId: tgt,
            };
          })
          .filter((x): x is NoteBlockLink => x !== null),
      };
      set((state) => ({
        notes: [copy, ...state.notes],
      }));
      const cur = get();
      if (canCloudSync(cur)) {
        set({ cloudSyncStatus: "syncing" });
        void flushNoteToCloud(cur.cloudUserId, copy).then(applyCloudResult);
      }
      return copy;
    },

    addBlockLink: (noteId, link) => {
      if (link.sourceBlockId === link.targetBlockId) return null;
      const targetNote = get().notes.find((n) => n.id === noteId);
      if (!targetNote) return null;
      const existing = targetNote.blockLinks ?? [];
      const duplicate = existing.some(
        (l) =>
          (l.sourceBlockId === link.sourceBlockId &&
            l.targetBlockId === link.targetBlockId) ||
          (l.sourceBlockId === link.targetBlockId &&
            l.targetBlockId === link.sourceBlockId)
      );
      if (duplicate) return null;

      const created: NoteBlockLink = {
        ...link,
        id: `blnk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      patchNoteById(noteId, (n) => ({
        ...n,
        blockLinks: [...(n.blockLinks ?? []), created],
        updatedAt: "Vừa lưu",
        updatedMinutesAgo: 0,
      }));
      return created;
    },

    updateBlockLinkLabel: (noteId, linkId, label) => {
      patchNoteById(noteId, (n) => ({
        ...n,
        blockLinks: (n.blockLinks ?? []).map((l) =>
          l.id === linkId ? { ...l, label } : l
        ),
        updatedAt: "Vừa lưu",
        updatedMinutesAgo: 0,
      }));
    },

    removeBlockLink: (noteId, linkId) => {
      patchNoteById(noteId, (n) => ({
        ...n,
        blockLinks: (n.blockLinks ?? []).filter((l) => l.id !== linkId),
        updatedAt: "Vừa lưu",
        updatedMinutesAgo: 0,
      }));
    },

    addTagToNote: (noteId, rawTag) => {
      const clean = rawTag.trim().replace(/\s+/g, "-");
      if (!clean) return;
      const normalized = clean.startsWith("#") ? clean : `#${clean}`;
      patchNoteById(noteId, (n) => {
        if (n.tags.includes(normalized)) return n;
        return {
          ...n,
          tags: [...n.tags, normalized],
          updatedAt: "Vừa lưu",
          updatedMinutesAgo: 0,
        };
      });
    },

    removeTagFromNote: (noteId, tag) => {
      patchNoteById(noteId, (n) => ({
        ...n,
        tags: n.tags.filter((t) => t !== tag),
        updatedAt: "Vừa lưu",
        updatedMinutesAgo: 0,
      }));
    },

    addBlockToNote: (noteId, block, insertAfterBlockId) => {
      const newBlock: CornellBlock = {
        ...block,
        id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: block.title ?? BLOCK_DEFAULT_TITLE[block.type],
        blurrable: true,
      };
      patchNoteById(noteId, (n) => {
        if (insertAfterBlockId) {
          const idx = n.blocks.findIndex((b) => b.id === insertAfterBlockId);
          if (idx !== -1) {
            const nextBlocks = [...n.blocks];
            nextBlocks.splice(idx + 1, 0, newBlock);
            return {
              ...n,
              blocks: nextBlocks,
              updatedAt: "Vừa lưu",
              updatedMinutesAgo: 0,
            };
          }
        }
        return {
          ...n,
          blocks: [...n.blocks, newBlock],
          updatedAt: "Vừa lưu",
          updatedMinutesAgo: 0,
        };
      });
      return newBlock;
    },

    restoreBlock: (noteId, block, index) => {
      patchNoteById(noteId, (n) => {
        if (n.blocks.some((b) => b.id === block.id)) return n;
        const clamped = Math.max(0, Math.min(index, n.blocks.length));
        const nextBlocks = [...n.blocks];
        nextBlocks.splice(clamped, 0, block);
        return {
          ...n,
          blocks: nextBlocks,
          updatedAt: "Vừa lưu",
          updatedMinutesAgo: 0,
        };
      });
    },

    updateBlock: (noteId, blockId, patch) => {
      patchNoteById(noteId, (n) => ({
        ...n,
        blocks: n.blocks.map((b) =>
          b.id === blockId ? { ...b, ...patch } : b
        ),
        updatedAt: "Vừa lưu",
        updatedMinutesAgo: 0,
      }));
    },

    moveBlock: (noteId, blockId, direction) => {
      patchNoteById(noteId, (n) => {
        const idx = n.blocks.findIndex((b) => b.id === blockId);
        if (idx === -1) return n;
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= n.blocks.length) return n;
        const nextBlocks = [...n.blocks];
        [nextBlocks[idx], nextBlocks[swapIdx]] = [
          nextBlocks[swapIdx],
          nextBlocks[idx],
        ];
        return {
          ...n,
          blocks: nextBlocks,
          updatedAt: "Vừa lưu",
          updatedMinutesAgo: 0,
        };
      });
    },

    deleteBlock: (noteId, blockId) => {
      patchNoteById(noteId, (n) => ({
        ...n,
        blocks: n.blocks.filter((b) => b.id !== blockId),
        blockLinks: (n.blockLinks ?? []).filter(
          (l) => l.sourceBlockId !== blockId && l.targetBlockId !== blockId
        ),
        updatedAt: "Vừa lưu",
        updatedMinutesAgo: 0,
      }));
    },

    toggleBlurMode: () =>
      set((state) => ({
        blurMode: !state.blurMode,
        revealedBlockIds: [],
      })),

    setBlurMode: (active) =>
      set({
        blurMode: active,
        revealedBlockIds: [],
      }),

    toggleRevealBlock: (blockId) =>
      set((state) => {
        const exists = state.revealedBlockIds.includes(blockId);
        return {
          revealedBlockIds: exists
            ? state.revealedBlockIds.filter((id) => id !== blockId)
            : [...state.revealedBlockIds, blockId],
        };
      }),

    resetReveals: () => set({ revealedBlockIds: [] }),
  };
}
