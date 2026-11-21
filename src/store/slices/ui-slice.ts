"use client";

import type { StoreSet, UiSlice } from "@/store/types";

export function createUiSlice(set: StoreSet): UiSlice {
  return {
    commandPaletteOpen: false,
    setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),
    customizeTarget: null,
    openCustomize: (customizeTarget) => set({ customizeTarget }),
    closeCustomize: () => set({ customizeTarget: null }),
    toastMessage: null,
    showToast: (toastMessage) => set({ toastMessage }),
    clearToast: () => set({ toastMessage: null }),
  };
}
