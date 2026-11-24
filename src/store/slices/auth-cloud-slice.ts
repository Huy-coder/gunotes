"use client";

import { createEmptyUserProfile } from "@/lib/repository/initial-state";
import {
  clearOfflineQueue,
  getOfflineQueue,
} from "@/lib/repository/offline-queue";
import {
  batchUpsertFlashcardsToCloud,
  fetchCloudWorkspace,
  flushNoteToCloud,
  flushOfflineQueue,
  generateUuid,
  isUuid,
  upsertBinderToCloud,
} from "@/lib/repository/supabase-sync";
import { computeBinderMastery, isCardDueNow } from "@/lib/srs/sm2";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { canCloudSync } from "@/store/slices/cloud-helpers";
import type {
  AuthCloudSlice,
  CloudSyncHelpers,
  StoreGet,
  StoreSet,
} from "@/store/types";
import type { Binder, Note, StickerId } from "@/types/study";

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
    pendingOfflineCount: 0,
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
        timerEndAt: null,
        authMode: "guest",
        cloudUserId: null,
        cloudSyncStatus: "local",
      });
    },

    flushPendingOfflineSync: async () => {
      const s = get();
      if (!canCloudSync(s)) return;
      const queue = getOfflineQueue();
      if (queue.length === 0) {
        if (s.pendingOfflineCount !== 0) set({ pendingOfflineCount: 0 });
        return;
      }
      set({ cloudSyncStatus: "syncing" });
      const { flushed, remaining } = await flushOfflineQueue(s.cloudUserId);
      set({
        pendingOfflineCount: remaining,
        cloudSyncStatus: remaining === 0 ? "synced" : "error",
        cloudError: remaining === 0 ? null : "Một số thay đổi vẫn đang chờ mạng.",
        toastMessage:
          flushed > 0
            ? `Đã đồng bộ bổ sung ${flushed} thay đổi offline lên Cloud!`
            : s.toastMessage,
      });
    },

    hydrateFromSupabase: async (userId, email, displayName) => {
      const preSnapshot = get();
      const localBinders = preSnapshot.binders;
      const localNotes = preSnapshot.notes;
      const localCards = preSnapshot.flashcards;
      const localDailyLog = preSnapshot.dailyStudyLog;
      const wasGuestWithData =
        preSnapshot.authMode === "guest" &&
        (localBinders.length > 0 || localNotes.length > 0);

      set({
        authMode: "supabase",
        cloudUserId: userId,
        cloudSyncStatus: "loading",
        cloudError: null,
        isAuthenticated: true,
        pendingOfflineCount: getOfflineQueue().length,
      });

      // Push queued offline mutations up before pulling cloud state
      await flushOfflineQueue(userId);

      const res = await fetchCloudWorkspace(userId, email, displayName);
      if (res.status === "ok") {
        // Guest-to-Cloud Merge: if new Cloud workspace is empty while Guest had notes/binders, push them up
        if (
          wasGuestWithData &&
          res.binders.length === 0 &&
          res.notes.length === 0
        ) {
          const binderIdMap = new Map<string, string>();
          const migratedBinders = localBinders.map((b) => {
            const nextId = isUuid(b.id) ? b.id : generateUuid();
            binderIdMap.set(b.id, nextId);
            return { ...b, id: nextId };
          });

          const noteIdMap = new Map<string, string>();
          const migratedNotes = localNotes.map((n) => {
            const nextId = isUuid(n.id) ? n.id : generateUuid();
            noteIdMap.set(n.id, nextId);
            return {
              ...n,
              id: nextId,
              binderId: binderIdMap.get(n.binderId) ?? n.binderId,
            };
          });

          const migratedCards = localCards.map((c) => ({
            ...c,
            id: isUuid(c.id) ? c.id : generateUuid(),
            binderId: binderIdMap.get(c.binderId) ?? c.binderId,
            noteId: noteIdMap.get(c.noteId) ?? c.noteId,
          }));

          set({
            user: {
              ...res.user,
              displayName:
                preSnapshot.user.displayName !== "Bạn mới"
                  ? preSnapshot.user.displayName
                  : res.user.displayName,
              onboarded: preSnapshot.user.onboarded || res.user.onboarded,
            },
            theme: preSnapshot.theme,
            defaultPaper: preSnapshot.defaultPaper,
            noteFont: preSnapshot.noteFont,
            binders: migratedBinders,
            notes: migratedNotes,
            flashcards: migratedCards,
            focusTasks:
              preSnapshot.focusTasks.length > 0
                ? preSnapshot.focusTasks
                : res.focusTasks,
            dailyStudyLog: { ...localDailyLog, ...res.dailyStudyLog },
            activeBinderId: migratedBinders[0]?.id ?? "",
            cloudSyncStatus: "syncing",
            pendingOfflineCount: getOfflineQueue().length,
            cloudError: null,
            blurMode: false,
            revealedBlockIds: [],
            toastMessage: "Đã gộp dữ liệu cục bộ lên tài khoản Cloud!",
          });

          void (async () => {
            for (const b of migratedBinders) {
              await upsertBinderToCloud(userId, b);
            }
            for (const n of migratedNotes) {
              await flushNoteToCloud(userId, n);
            }
            await batchUpsertFlashcardsToCloud(userId, migratedCards);
            set({
              cloudSyncStatus: "synced",
              pendingOfflineCount: getOfflineQueue().length,
            });
          })();
          return;
        }

        // Timestamp-safe merge: preserve any local notes strictly newer than Cloud snapshot
        const localNoteById = new Map(localNotes.map((n) => [n.id, n]));
        const notesToPushBack: Note[] = [];
        const mergedNotes = res.notes.map((cloudNote) => {
          const localMatch = localNoteById.get(cloudNote.id);
          if (localMatch?.updatedAtIso && cloudNote.updatedAtIso) {
            if (
              Date.parse(localMatch.updatedAtIso) >
              Date.parse(cloudNote.updatedAtIso)
            ) {
              notesToPushBack.push(localMatch);
              return localMatch;
            }
          }
          return cloudNote;
        });

        const mergedDailyLog: Record<string, number> = { ...localDailyLog };
        for (const [k, v] of Object.entries(res.dailyStudyLog)) {
          mergedDailyLog[k] = Math.max(mergedDailyLog[k] ?? 0, v);
        }

        const refreshedCards = res.flashcards.map((c) => ({
          ...c,
          isDue: isCardDueNow(c),
        }));

        const mergedBinders = res.binders.map((b) => {
          const computed = computeBinderMastery(b.id, refreshedCards);
          return refreshedCards.some((c) => c.binderId === b.id)
            ? { ...b, masteryPercent: computed }
            : b;
        });

        set({
          user: res.user,
          theme: res.theme,
          defaultPaper: res.defaultPaper,
          noteFont: res.noteFont,
          binders: mergedBinders,
          notes: mergedNotes,
          flashcards: refreshedCards,
          focusTasks: res.focusTasks,
          dailyStudyLog: mergedDailyLog,
          activeBinderId: mergedBinders[0]?.id ?? "",
          cloudSyncStatus: "synced",
          pendingOfflineCount: getOfflineQueue().length,
          cloudError: null,
          blurMode: false,
          revealedBlockIds: [],
        });

        for (const newerNote of notesToPushBack) {
          void flushNoteToCloud(userId, newerNote).then(applyCloudResult);
        }
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
          pendingOfflineCount: getOfflineQueue().length,
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
        timerEndAt: null,
      });
    },

    signOutAndResetLocal: async () => {
      const supabase = getSupabaseBrowserClient();
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }
      clearOfflineQueue();
      set({
        authMode: "guest",
        cloudUserId: null,
        cloudSyncStatus: "local",
        cloudError: null,
        pendingOfflineCount: 0,
        isAuthenticated: false,
        isTimerRunning: false,
        timerEndAt: null,
        theme: "minimal-paper",
        defaultPaper: "dot",
        noteFont: "sans",
        user: createEmptyUserProfile(),
        binders: [],
        notes: [],
        flashcards: [],
        focusTasks: [],
        dailyStudyLog: {},
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

    resetLocalWorkspace: () => {
      clearOfflineQueue();
      set({
        authMode: "guest",
        cloudUserId: null,
        cloudSyncStatus: "local",
        cloudError: null,
        pendingOfflineCount: 0,
        isAuthenticated: false,
        isTimerRunning: false,
        timerEndAt: null,
        theme: "minimal-paper",
        defaultPaper: "dot",
        noteFont: "sans",
        user: createEmptyUserProfile(),
        binders: [],
        notes: [],
        flashcards: [],
        focusTasks: [],
        dailyStudyLog: {},
        activeBinderId: "",
        blurMode: false,
        revealedBlockIds: [],
        toastMessage: "Đã đặt lại dữ liệu cục bộ về trạng thái mới.",
      });
    },
  };
}
