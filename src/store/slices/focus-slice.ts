"use client";

import { logStudySessionToCloud } from "@/lib/repository/supabase-sync";
import { computeStudyMetrics, getLocalDateKey } from "@/lib/srs/sm2";
import { canCloudSync } from "@/store/slices/cloud-helpers";
import type {
  CloudSyncHelpers,
  FocusSlice,
  StoreGet,
  StoreSet,
} from "@/store/types";

function playCompletionChime(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.9);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.9);
  } catch {
    // Ignore autoplay restriction
  }
}

export function createFocusSlice(
  set: StoreSet,
  get: StoreGet,
  helpers: CloudSyncHelpers
): FocusSlice {
  const { applyCloudResult, pushProfilePatch } = helpers;

  const completeSession = () => {
    const prev = get();
    const isBreak = prev.focusMode === 5;
    const todayKey = getLocalDateKey();
    const nextLog = isBreak
      ? prev.dailyStudyLog
      : {
          ...prev.dailyStudyLog,
          [todayKey]: (prev.dailyStudyLog[todayKey] ?? 0) + prev.focusMode,
        };
    const metrics = computeStudyMetrics(nextLog);
    const nextToday = isBreak
      ? prev.user.todayFocusMinutes
      : Math.max(prev.user.todayFocusMinutes + prev.focusMode, metrics.todayFocusMinutes);
    const nextWeekly = isBreak
      ? prev.user.weeklyFocusMinutes
      : Math.max(prev.user.weeklyFocusMinutes + prev.focusMode, metrics.weeklyFocusMinutes);
    const nextStreak = Math.max(prev.user.streakDays, metrics.streakDays);

    playCompletionChime();

    set((state) => ({
      isTimerRunning: false,
      timerEndAt: null,
      secondsLeft: state.focusMode * 60,
      dailyStudyLog: nextLog,
      user: {
        ...state.user,
        todayFocusMinutes: nextToday,
        weeklyFocusMinutes: nextWeekly,
        streakDays: nextStreak,
      },
      toastMessage: `Hoàn thành phiên ${isBreak ? "nghỉ ngắn" : "tập trung"} ${
        state.focusMode
      } phút!`,
    }));

    const cur = get();
    if (canCloudSync(cur)) {
      pushProfilePatch({
        today_focus_minutes: nextToday,
        weekly_focus_minutes: nextWeekly,
        streak_days: nextStreak,
      });
      void logStudySessionToCloud(
        cur.cloudUserId,
        cur.activeBinderId,
        cur.focusMode,
        isBreak ? "break" : "focus"
      ).then(applyCloudResult);
    }
  };

  const syncFromEndAt = () => {
    const prev = get();
    if (!prev.isTimerRunning || !prev.timerEndAt) return;
    const remaining = Math.ceil((prev.timerEndAt - Date.now()) / 1000);
    if (remaining <= 0) {
      completeSession();
    } else if (remaining !== prev.secondsLeft) {
      set({ secondsLeft: remaining });
    }
  };

  return {
    focusMode: 25,
    secondsLeft: 25 * 60,
    timerEndAt: null,
    isTimerRunning: false,
    activeBinderId: "",
    focusTasks: [],
    dailyStudyLog: {},
    ambientVolumes: {
      rain: 35,
      cafe: 0,
      keys: 0,
    },

    setFocusMode: (mode) =>
      set({
        focusMode: mode,
        secondsLeft: mode * 60,
        timerEndAt: null,
        isTimerRunning: false,
      }),

    setActiveBinderId: (activeBinderId) => set({ activeBinderId }),

    toggleTimer: () => {
      const prev = get();
      if (prev.isTimerRunning) {
        const remaining = prev.timerEndAt
          ? Math.max(1, Math.ceil((prev.timerEndAt - Date.now()) / 1000))
          : prev.secondsLeft;
        set({
          isTimerRunning: false,
          timerEndAt: null,
          secondsLeft: remaining,
        });
      } else {
        const secs = prev.secondsLeft > 0 ? prev.secondsLeft : prev.focusMode * 60;
        set({
          isTimerRunning: true,
          secondsLeft: secs,
          timerEndAt: Date.now() + secs * 1000,
        });
      }
    },

    resetTimer: () =>
      set((state) => ({
        isTimerRunning: false,
        timerEndAt: null,
        secondsLeft: state.focusMode * 60,
      })),

    tickTimer: () => {
      syncFromEndAt();
    },

    syncTimerFromClock: () => {
      syncFromEndAt();
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
