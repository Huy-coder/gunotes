"use client";

import { logStudySessionToCloud } from "@/lib/repository/supabase-sync";
import { canCloudSync } from "@/store/slices/cloud-helpers";
import type {
  CloudSyncHelpers,
  FocusSlice,
  StoreGet,
  StoreSet,
} from "@/store/types";

export function createFocusSlice(
  set: StoreSet,
  get: StoreGet,
  helpers: CloudSyncHelpers
): FocusSlice {
  const { applyCloudResult, pushProfilePatch } = helpers;

  return {
    focusMode: 25,
    secondsLeft: 25 * 60,
    isTimerRunning: false,
    activeBinderId: "",
    focusTasks: [],
    ambientVolumes: {
      rain: 35,
      cafe: 0,
      keys: 0,
    },

    setFocusMode: (mode) =>
      set({
        focusMode: mode,
        secondsLeft: mode * 60,
        isTimerRunning: false,
      }),

    setActiveBinderId: (activeBinderId) => set({ activeBinderId }),

    toggleTimer: () =>
      set((state) => ({ isTimerRunning: !state.isTimerRunning })),

    resetTimer: () =>
      set((state) => ({
        isTimerRunning: false,
        secondsLeft: state.focusMode * 60,
      })),

    tickTimer: () => {
      const prev = get();
      if (!prev.isTimerRunning) return;
      if (prev.secondsLeft <= 1) {
        const nextToday = prev.user.todayFocusMinutes + prev.focusMode;
        const nextWeekly = prev.user.weeklyFocusMinutes + prev.focusMode;
        set((state) => ({
          isTimerRunning: false,
          secondsLeft: state.focusMode * 60,
          user: {
            ...state.user,
            todayFocusMinutes: nextToday,
            weeklyFocusMinutes: nextWeekly,
          },
          toastMessage: `Hoàn thành phiên tập trung ${state.focusMode} phút!`,
        }));
        const cur = get();
        if (canCloudSync(cur)) {
          pushProfilePatch({
            today_focus_minutes: nextToday,
            weekly_focus_minutes: nextWeekly,
          });
          void logStudySessionToCloud(
            cur.cloudUserId,
            cur.activeBinderId,
            cur.focusMode,
            cur.focusMode === 5 ? "break" : "focus"
          ).then(applyCloudResult);
        }
        return;
      }
      set({ secondsLeft: prev.secondsLeft - 1 });
    },

    toggleFocusTask: (taskId) => {
      set((state) => ({
        focusTasks: state.focusTasks.map((t) =>
          t.id === taskId ? { ...t, done: !t.done } : t
        ),
      }));
      pushProfilePatch({ focus_tasks: get().focusTasks });
    },

    addFocusTask: (label) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      set((state) => ({
        focusTasks: [
          ...state.focusTasks,
          { id: `ft-${Date.now()}`, label: trimmed, done: false },
        ],
      }));
      pushProfilePatch({ focus_tasks: get().focusTasks });
    },

    setAmbientVolume: (channel, value) =>
      set((state) => ({
        ambientVolumes: {
          ...state.ambientVolumes,
          [channel]: Math.max(0, Math.min(100, value)),
        },
      })),
  };
}
