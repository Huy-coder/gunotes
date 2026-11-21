"use client";

import {
  batchUpsertFlashcardsToCloud,
  generateUuid,
  upsertFlashcardToCloud,
} from "@/lib/repository/supabase-sync";
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

  return {
    flashcards: [],

    addFlashcard: (card) => {
      const created: Flashcard = {
        ...card,
        id: generateUuid(),
        dueLabel: "Mới tạo từ Note",
        isDue: true,
        intervalDays: 1,
        reps: 0,
      };
      set((state) => ({
        flashcards: [created, ...state.flashcards],
      }));
      const cur = get();
      if (canCloudSync(cur)) {
        set({ cloudSyncStatus: "syncing" });
        void upsertFlashcardToCloud(cur.cloudUserId, created).then(
          applyCloudResult
        );
      }
    },

    rateFlashcard: (id, rating) => {
      const intervalMap: Record<1 | 2 | 3 | 4, { days: number; label: string }> =
        {
          1: { days: 0, label: "Ôn lại sau 10 phút" },
          2: { days: 1, label: "Ngày mai" },
          3: { days: 4, label: "4 ngày nữa" },
          4: { days: 9, label: "9 ngày nữa" },
        };
      const chosen = intervalMap[rating];
      set((state) => ({
        flashcards: state.flashcards.map((fc) =>
          fc.id === id
            ? {
                ...fc,
                isDue: rating === 1,
                intervalDays: chosen.days,
                dueLabel: chosen.label,
                reps: fc.reps + 1,
              }
            : fc
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

    resetReviewDeck: () => {
      set((state) => ({
        flashcards: state.flashcards.map((fc) => ({
          ...fc,
          isDue: true,
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
