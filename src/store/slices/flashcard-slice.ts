"use client";

import {
  batchUpsertFlashcardsToCloud,
  deleteFlashcardFromCloud,
  generateUuid,
  upsertBinderToCloud,
  upsertFlashcardToCloud,
} from "@/lib/repository/supabase-sync";
import {
  computeBinderMastery,
  computeNextSrs,
  generateFlashcardsFromNote,
  isCardDueNow,
} from "@/lib/srs/sm2";
import { canCloudSync } from "@/store/slices/cloud-helpers";
import type {
  CloudSyncHelpers,
  FlashcardSlice,
  StoreGet,
  StoreSet,
} from "@/store/types";
import type { Flashcard } from "@/types/study";

export function createFlashcardSlice(
  set: StoreSet,
  get: StoreGet,
  helpers: CloudSyncHelpers
): FlashcardSlice {
  const { applyCloudResult } = helpers;

  const syncBinderMastery = (binderId: string) => {
    const cur = get();
    const mastery = computeBinderMastery(binderId, cur.flashcards);
    const binder = cur.binders.find((b) => b.id === binderId);
    if (!binder || binder.masteryPercent === mastery) return;
    set((state) => ({
      binders: state.binders.map((b) =>
        b.id === binderId ? { ...b, masteryPercent: mastery } : b
      ),
    }));
    const updated = get().binders.find((b) => b.id === binderId);
    if (updated && canCloudSync(get())) {
      void upsertBinderToCloud(get().cloudUserId!, updated).then(applyCloudResult);
    }
  };

  return {
    flashcards: [],

    addFlashcard: (card) => {
      const created: Flashcard = {
        ...card,
        id: generateUuid(),
        dueLabel: "Mới tạo từ Note",
        dueAtIso: new Date().toISOString(),
        easeFactor: 2.5,
        isDue: true,
        intervalDays: 0,
        reps: 0,
      };
      set((state) => ({
        flashcards: [created, ...state.flashcards],
      }));
      syncBinderMastery(created.binderId);
      const cur = get();
      if (canCloudSync(cur)) {
        set({ cloudSyncStatus: "syncing" });
        void upsertFlashcardToCloud(cur.cloudUserId, created).then(
          applyCloudResult
        );
      }
    },

    updateFlashcard: (id, patch) => {
      set((state) => ({
        flashcards: state.flashcards.map((fc) =>
          fc.id === id ? { ...fc, ...patch } : fc
        ),
      }));
      const cur = get();
      const updated = cur.flashcards.find((f) => f.id === id);
      if (updated && canCloudSync(cur)) {
        set({ cloudSyncStatus: "syncing" });
        void upsertFlashcardToCloud(cur.cloudUserId, updated).then(
          applyCloudResult
        );
      }
    },

    deleteFlashcard: (id) => {
      const target = get().flashcards.find((f) => f.id === id);
      set((state) => ({
        flashcards: state.flashcards.filter((f) => f.id !== id),
      }));
      if (target) syncBinderMastery(target.binderId);
      const cur = get();
      if (canCloudSync(cur)) {
        set({ cloudSyncStatus: "syncing" });
        void deleteFlashcardFromCloud(id).then(applyCloudResult);
      }
    },

    rateFlashcard: (id, rating) => {
      const target = get().flashcards.find((f) => f.id === id);
      if (!target) return;

      const nextSrs = computeNextSrs(target, rating);
      set((state) => ({
        flashcards: state.flashcards.map((fc) =>
          fc.id === id ? { ...fc, ...nextSrs } : fc
        ),
      }));
      syncBinderMastery(target.binderId);

      const cur = get();
      const updated = cur.flashcards.find((f) => f.id === id);
      if (updated && canCloudSync(cur)) {
        set({ cloudSyncStatus: "syncing" });
        void upsertFlashcardToCloud(cur.cloudUserId, updated).then(
          applyCloudResult
        );
      }
    },

    generateDeckFromNote: (noteId) => {
      const cur = get();
      const note = cur.notes.find((n) => n.id === noteId);
      if (!note) return 0;

      const drafts = generateFlashcardsFromNote(note, cur.flashcards);
      if (drafts.length === 0) return 0;

      const nowIso = new Date().toISOString();
      const created: Flashcard[] = drafts.map((d) => ({
        ...d,
        id: generateUuid(),
        dueLabel: "Mới tạo tự động",
        dueAtIso: nowIso,
        easeFactor: 2.5,
        isDue: true,
        intervalDays: 0,
        reps: 0,
      }));

      set((state) => ({
        flashcards: [...created, ...state.flashcards],
      }));
      syncBinderMastery(note.binderId);

      const after = get();
      if (canCloudSync(after)) {
        set({ cloudSyncStatus: "syncing" });
        void batchUpsertFlashcardsToCloud(after.cloudUserId, created).then(
          applyCloudResult
        );
      }
      return created.length;
    },

    refreshDueFlashcards: () => {
      const now = Date.now();
      set((state) => {
        let changed = false;
        const next = state.flashcards.map((fc) => {
          const due = isCardDueNow(fc, now);
          if (due === fc.isDue) return fc;
          changed = true;
          return {
            ...fc,
            isDue: due,
            dueLabel: due ? "Đến hạn hôm nay" : fc.dueLabel,
          };
        });
        return changed ? { flashcards: next } : state;
      });
    },

    resetReviewDeck: () => {
      const nowIso = new Date().toISOString();
      set((state) => ({
        flashcards: state.flashcards.map((fc) => ({
          ...fc,
          isDue: true,
          dueAtIso: nowIso,
          dueLabel: "Đến hạn hôm nay",
        })),
      }));
      const cur = get();
      if (canCloudSync(cur)) {
        set({ cloudSyncStatus: "syncing" });
        void batchUpsertFlashcardsToCloud(
          cur.cloudUserId,
          cur.flashcards
        ).then(applyCloudResult);
      }
    },
  };
}
