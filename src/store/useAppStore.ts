"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createAuthCloudSlice } from "@/store/slices/auth-cloud-slice";
import { createBinderSlice } from "@/store/slices/binder-slice";
import { createCloudHelpers } from "@/store/slices/cloud-helpers";
import { createFlashcardSlice } from "@/store/slices/flashcard-slice";
import { createFocusSlice } from "@/store/slices/focus-slice";
import { createNoteSlice } from "@/store/slices/note-slice";
import { createUiSlice } from "@/store/slices/ui-slice";
import type { AppState } from "@/store/types";

export type {
  CloudSyncStatus,
  CustomizeTarget,
  FocusModeDuration,
} from "@/store/types";

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const helpers = createCloudHelpers(set, get);
      return {
        ...createAuthCloudSlice(set, get, helpers),
        ...createBinderSlice(set, get, helpers),
        ...createNoteSlice(set, get, helpers),
        ...createFlashcardSlice(set, get, helpers),
        ...createFocusSlice(set, get, helpers),
        ...createUiSlice(set),
      };
    },
    {
      name: "gunotes-state-v7",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        authMode: state.authMode,
        cloudUserId: state.cloudUserId,
        user: state.user,
        theme: state.theme,
        defaultPaper: state.defaultPaper,
        noteFont: state.noteFont,
        binders: state.binders,
        notes: state.notes,
        flashcards: state.flashcards,
        focusTasks: state.focusTasks,
      }),
    }
  )
);
