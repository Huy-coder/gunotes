"use client";

import { createEmptyUserProfile } from "@/lib/repository/initial-state";
import {
  fetchCloudWorkspace,
  generateUuid,
  upsertBinderToCloud,
} from "@/lib/repository/supabase-sync";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { canCloudSync } from "@/store/slices/cloud-helpers";
import type {
  AuthCloudSlice,
  CloudSyncHelpers,
  StoreGet,
  StoreSet,
} from "@/store/types";
import type { Binder, StickerId } from "@/types/study";

export function createAuthCloudSlice(
  set: StoreSet,
  get: StoreGet,
  helpers: CloudSyncHelpers
): AuthCloudSlice {
  const { applyCloudResult, pushProfilePatch } = helpers;

  return {
    isAuthenticated: false,
    authMode: "guest",
    cloudUserId: null,
    cloudSyncStatus: "local",
    cloudError: null,
    user: createEmptyUserProfile(),
    theme: "minimal-paper",
    defaultPaper: "dot",
    noteFont: "sans",

    loginMock: (provider, email) => {
      set((state) => ({
        isAuthenticated: true,
        authMode: "guest",
        cloudUserId: null,
        cloudSyncStatus: "local",
        cloudError: null,
        user: {
          ...state.user,
          email: email?.trim() || state.user.email,
          displayName:
            provider === "guest"
              ? state.user.displayName || "Bạn mới"
              : email?.split("@")[0] || state.user.displayName,
        },
      }));
    },

    logoutMock: () => {
      set({
        isAuthenticated: false,
        isTimerRunning: false,
        authMode: "guest",
        cloudUserId: null,
        cloudSyncStatus: "local",
      });
    },

    hydrateFromSupabase: async (userId, email, displayName) => {
      set({
        authMode: "supabase",
        cloudUserId: userId,
        cloudSyncStatus: "loading",
        cloudError: null,
        isAuthenticated: true,
      });

      const res = await fetchCloudWorkspace(userId, email, displayName);
      if (res.status === "ok") {
        set({
          user: res.user,
          theme: res.theme,
          defaultPaper: res.defaultPaper,
          noteFont: res.noteFont,
          binders: res.binders,
          notes: res.notes,
          flashcards: res.flashcards,
          focusTasks: res.focusTasks,
          activeBinderId: res.binders[0]?.id ?? "",
          cloudSyncStatus: "synced",
          cloudError: null,
          blurMode: false,
          revealedBlockIds: [],
        });
      } else if (res.status === "schema-missing") {
        set((state) => ({
          cloudSyncStatus: "schema-missing",
          cloudError:
            "Chưa chạy SQL Schema tạo bảng trên Supabase. Hãy mở Cá nhân → Tài khoản & Dữ liệu để copy SQL.",
          user: {
            ...state.user,
            id: userId,
            email: email || state.user.email,
            displayName:
              displayName?.trim() ||
              email.split("@")[0] ||
              state.user.displayName,
          },
        }));
      } else {
        set({
          cloudSyncStatus: "error",
          cloudError: res.message,
        });
      }
    },

    clearSupabaseSession: () => {
      set({
        authMode: "guest",
        cloudUserId: null,
        cloudSyncStatus: "local",
        cloudError: null,
        isAuthenticated: false,
        isTimerRunning: false,
      });
    },

    signOutAndResetLocal: async () => {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
      set({
        authMode: "guest",
        cloudUserId: null,
        cloudSyncStatus: "local",
        cloudError: null,
        isAuthenticated: false,
        isTimerRunning: false,
        theme: "minimal-paper",
        defaultPaper: "dot",
        noteFont: "sans",
        user: createEmptyUserProfile(),
        binders: [],
        notes: [],
        flashcards: [],
        focusTasks: [],
        activeBinderId: "",
        blurMode: false,
        revealedBlockIds: [],
        toastMessage: "Đã đăng xuất tài khoản Supabase.",
      });
    },

    completeOnboarding: (prefs) => {
      let createdBinder: Binder | null = null;
      set((state) => {
        let nextBinders = state.binders;
        if (prefs.firstBinderTitle?.trim()) {
          const newId = generateUuid();
          createdBinder = {
            id: newId,
            title: prefs.firstBinderTitle.trim(),
            subtitle: "Sổ chuyên đề mới",
            subjectTag: "#hoc-ba",
            coverTone: prefs.firstBinderTone ?? "blue",
            coverPattern: prefs.defaultPaper,
            stickers: prefs.firstBinderSticker
              ? [
                  {
                    id: `st-${Date.now()}`,
                    stickerId: prefs.firstBinderSticker,
                    xPct: 76,
                    yPct: 16,
                    rotation: 8,
                  },
                ]
              : [],
            masteryPercent: 0,
            sortOrder: state.binders.length,
          };
          nextBinders = [createdBinder, ...state.binders];
        }
        return {
          isAuthenticated: true,
          theme: prefs.theme,
          defaultPaper: prefs.defaultPaper,
          noteFont: prefs.noteFont,
          binders: nextBinders,
          activeBinderId: createdBinder?.id ?? state.activeBinderId,
          user: {
            ...state.user,
            displayName: prefs.displayName.trim() || state.user.displayName,
            studyPersona: prefs.studyPersona ?? state.user.studyPersona,
            onboarded: true,
          },
        };
      });

      const cur = get();
      if (canCloudSync(cur)) {
        pushProfilePatch({
          display_name: cur.user.displayName,
          active_theme: cur.theme,
          default_paper: cur.defaultPaper,
          note_font: cur.noteFont,
          study_persona: cur.user.studyPersona,
          onboarded: true,
        });
        if (createdBinder) {
          void upsertBinderToCloud(cur.cloudUserId, createdBinder).then(
            applyCloudResult
          );
        }
      }
    },

    setTheme: (theme) => {
      set({ theme });
      pushProfilePatch({ active_theme: theme });
    },
    setDefaultPaper: (defaultPaper) => {
      set({ defaultPaper });
      pushProfilePatch({ default_paper: defaultPaper });
    },
    setNoteFont: (noteFont) => {
      set({ noteFont });
      pushProfilePatch({ note_font: noteFont });
    },
    setStudyPersona: (studyPersona) => {
      set((state) => ({
        user: { ...state.user, studyPersona },
      }));
      pushProfilePatch({ study_persona: studyPersona });
    },

    unlockAllStickersPreview: () => {
      const allStickers: StickerId[] = [
        "coffee",
        "sparkle",
        "cat",
        "cursor",
        "bookmark",
        "chart",
        "lamp",
        "cyber",
      ];
      set((state) => ({
        user: {
          ...state.user,
          unlockedStickers: allStickers,
        },
        toastMessage: "Đã mở khóa toàn bộ 8 Sticker trong bản xem trước!",
      }));
      pushProfilePatch({ unlocked_stickers: allStickers });
    },

    resetLocalWorkspace: () =>
      set({
        authMode: "guest",
        cloudUserId: null,
        cloudSyncStatus: "local",
        cloudError: null,
        isAuthenticated: false,
        theme: "minimal-paper",
        defaultPaper: "dot",
        noteFont: "sans",
        user: createEmptyUserProfile(),
        binders: [],
        notes: [],
        flashcards: [],
        focusTasks: [],
        activeBinderId: "",
        blurMode: false,
        revealedBlockIds: [],
        toastMessage: "Đã đặt lại dữ liệu cục bộ về trạng thái mới.",
      }),
  };
}
