"use client";

import {
  deleteBinderFromCloud,
  generateUuid,
} from "@/lib/repository/supabase-sync";
import { canCloudSync } from "@/store/slices/cloud-helpers";
import type {
  BinderSlice,
  CloudSyncHelpers,
  StoreGet,
  StoreSet,
} from "@/store/types";
import type { Binder, PlacedSticker } from "@/types/study";

const STICKER_SLOTS: Array<{ xPct: number; yPct: number; rotation: number }> = [
  { xPct: 80, yPct: 28, rotation: 8 },
  { xPct: 30, yPct: 27, rotation: -7 },
  { xPct: 80, yPct: 75, rotation: 6 },
  { xPct: 32, yPct: 75, rotation: -6 },
];

export function createBinderSlice(
  set: StoreSet,
  get: StoreGet,
  helpers: CloudSyncHelpers
): BinderSlice {
  const { applyCloudResult, pushBinderImmediate } = helpers;

  return {
    binders: [],

    addBinder: (input) => {
      const newBinder: Binder = {
        id: generateUuid(),
        title: input.title.trim() || "Cuốn sổ mới",
        subtitle: input.subtitle.trim() || "Chuyên đề mới",
        subjectTag: input.subjectTag.trim() || "#hoc-tap",
        coverTone: input.coverTone,
        coverPattern: input.coverPattern ?? get().defaultPaper,
        stickers: input.starterSticker
          ? [
              {
                id: `st-${Date.now()}`,
                stickerId: input.starterSticker,
                xPct: 76,
                yPct: 16,
                rotation: 6,
              },
            ]
          : [],
        masteryPercent: 0,
        sortOrder: get().binders.length,
      };
      set((state) => ({
        binders: [newBinder, ...state.binders],
      }));
      pushBinderImmediate(newBinder.id);
      return newBinder;
    },

    updateBinderCover: (binderId, patch) => {
      set((state) => ({
        binders: state.binders.map((b) =>
          b.id === binderId ? { ...b, ...patch } : b
        ),
      }));
      pushBinderImmediate(binderId);
    },

    deleteBinder: (binderId) => {
      const s = get();
      set((state) => {
        const nextBinders = state.binders.filter((b) => b.id !== binderId);
        return {
          binders: nextBinders,
          notes: state.notes.filter((n) => n.binderId !== binderId),
          flashcards: state.flashcards.filter((f) => f.binderId !== binderId),
          activeBinderId:
            state.activeBinderId === binderId
              ? nextBinders[0]?.id ?? ""
              : state.activeBinderId,
          customizeTarget:
            state.customizeTarget?.kind === "binder" &&
            state.customizeTarget.id === binderId
              ? null
              : state.customizeTarget,
        };
      });
      if (canCloudSync(s)) {
        set({ cloudSyncStatus: "syncing" });
        void deleteBinderFromCloud(binderId).then(applyCloudResult);
      }
    },

    toggleBinderSticker: (binderId, stickerId) => {
      set((state) => ({
        binders: state.binders.map((b) => {
          if (b.id !== binderId) return b;
          const exists = b.stickers.some((s) => s.stickerId === stickerId);
          if (exists) {
            return {
              ...b,
              stickers: b.stickers.filter((s) => s.stickerId !== stickerId),
            };
          }
          const slot = STICKER_SLOTS[b.stickers.length % STICKER_SLOTS.length];
          const nextSticker: PlacedSticker = {
            id: `st-${Date.now()}-${stickerId}`,
            stickerId,
            xPct: slot.xPct,
            yPct: slot.yPct,
            rotation: slot.rotation,
          };
          return {
            ...b,
            stickers: [...b.stickers.slice(-3), nextSticker],
          };
        }),
      }));
      pushBinderImmediate(binderId);
    },
  };
}
