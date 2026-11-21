"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  INITIAL_BINDERS,
  INITIAL_FLASHCARDS,
  INITIAL_FOCUS_TASKS,
  INITIAL_NOTES,
  INITIAL_USER,
} from "@/lib/repository/mock-data";
import {
  batchUpsertFlashcardsToCloud,
  deleteBinderFromCloud,
  deleteNoteFromCloud,
  fetchOrSeedCloudWorkspace,
  flushNoteToCloud,
  generateUuid,
  logStudySessionToCloud,
  syncProfileToCloud,
  upsertBinderToCloud,
  upsertFlashcardToCloud,
  upsertNoteToCloud,
  type CloudProfilePatch,
  type CloudSyncResult,
} from "@/lib/repository/supabase-sync";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  Binder,
  BinderCoverPattern,
  BinderCoverTone,
  BlockType,
  CornellBlock,
  Flashcard,
  FocusTask,
  Note,
  NoteBlockLink,
  NoteFont,
  NoteTemplate,
  PaperStyle,
  PlacedSticker,
  StickerId,
  StudyPersona,
  ThemeId,
  UserProfile,
} from "@/types/study";

export type FocusModeDuration = 25 | 50 | 5;

export type CloudSyncStatus =
  | "local"
  | "loading"
  | "syncing"
  | "synced"
  | "schema-missing"
  | "error";

export interface CustomizeTarget {
  kind: "binder" | "note";
  id: string;
}

interface AppState {
  // Auth & Cloud Sync Status
  isAuthenticated: boolean;
  authMode: "guest" | "supabase";
  cloudUserId: string | null;
  cloudSyncStatus: CloudSyncStatus;
  cloudError: string | null;
  user: UserProfile;
  loginMock: (provider: "google" | "magic-link" | "guest", email?: string) => void;
  logoutMock: () => void;
  hydrateFromSupabase: (
    userId: string,
    email: string,
    displayName?: string
  ) => Promise<void>;
  clearSupabaseSession: () => void;
  signOutAndResetLocal: () => Promise<void>;
  completeOnboarding: (prefs: {
    displayName: string;
    theme: ThemeId;
    defaultPaper: PaperStyle;
    noteFont: NoteFont;
    studyPersona?: StudyPersona;
    firstBinderTitle?: string;
    firstBinderTone?: BinderCoverTone;
    firstBinderSticker?: StickerId;
  }) => void;

  // Preferences & Theme
  theme: ThemeId;
  defaultPaper: PaperStyle;
  noteFont: NoteFont;
  setTheme: (theme: ThemeId) => void;
  setDefaultPaper: (paper: PaperStyle) => void;
  setNoteFont: (font: NoteFont) => void;
  setStudyPersona: (persona: StudyPersona) => void;

  // Binders & Notes
  binders: Binder[];
  notes: Note[];
  addBinder: (input: {
    title: string;
    subtitle: string;
    subjectTag: string;
    coverTone: BinderCoverTone;
    coverPattern?: BinderCoverPattern;
    starterSticker?: StickerId;
  }) => Binder;
  updateBinderCover: (
    binderId: string,
    patch: Partial<
      Pick<
        Binder,
        | "title"
        | "subtitle"
        | "subjectTag"
        | "coverTone"
        | "coverPattern"
        | "stickers"
      >
    >
  ) => void;
  deleteBinder: (binderId: string) => void;
  toggleBinderSticker: (binderId: string, stickerId: StickerId) => void;

  addNote: (
    binderId: string,
    title?: string,
    paperStyle?: PaperStyle,
    template?: NoteTemplate
  ) => Note;
  updateNote: (
    noteId: string,
    patch: Partial<
      Pick<
        Note,
        | "title"
        | "template"
        | "paperStyle"
        | "summary"
        | "tags"
        | "headerStickerId"
        | "blockLinks"
      >
    >
  ) => void;
  addBlockLink: (
    noteId: string,
    link: Omit<NoteBlockLink, "id">
  ) => NoteBlockLink | null;
  updateBlockLinkLabel: (noteId: string, linkId: string, label: string) => void;
  removeBlockLink: (noteId: string, linkId: string) => void;
  deleteNote: (noteId: string) => void;
  duplicateNote: (noteId: string) => Note | null;
  addTagToNote: (noteId: string, rawTag: string) => void;
  removeTagFromNote: (noteId: string, tag: string) => void;
  addBlockToNote: (
    noteId: string,
    block: Omit<CornellBlock, "id">
  ) => void;
  updateBlock: (
    noteId: string,
    blockId: string,
    patch: Partial<CornellBlock>
  ) => void;
  moveBlock: (
    noteId: string,
    blockId: string,
    direction: "up" | "down"
  ) => void;
  deleteBlock: (noteId: string, blockId: string) => void;

  // Active Recall / Blur Mode
  blurMode: boolean;
  revealedBlockIds: string[];
  toggleBlurMode: () => void;
  setBlurMode: (active: boolean) => void;
  toggleRevealBlock: (blockId: string) => void;
  resetReveals: () => void;

  // Flashcards
  flashcards: Flashcard[];
  addFlashcard: (
    card: Omit<
      Flashcard,
      "id" | "dueLabel" | "isDue" | "intervalDays" | "reps"
    >
  ) => void;
  rateFlashcard: (id: string, rating: 1 | 2 | 3 | 4) => void;
  resetReviewDeck: () => void;

  // Focus Cockpit & Ambient Sound
  focusMode: FocusModeDuration;
  secondsLeft: number;
  isTimerRunning: boolean;
  activeBinderId: string;
  focusTasks: FocusTask[];
  ambientVolumes: {
    rain: number;
    cafe: number;
    keys: number;
  };
  setFocusMode: (mode: FocusModeDuration) => void;
  setActiveBinderId: (binderId: string) => void;
  toggleTimer: () => void;
  resetTimer: () => void;
  tickTimer: () => void;
  toggleFocusTask: (taskId: string) => void;
  addFocusTask: (label: string) => void;
  setAmbientVolume: (channel: "rain" | "cafe" | "keys", value: number) => void;

  // Overlays & Feedback
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  customizeTarget: CustomizeTarget | null;
  openCustomize: (target: CustomizeTarget) => void;
  closeCustomize: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
  unlockAllStickersPreview: () => void;
  resetDemoData: () => void;
}

const STICKER_SLOTS: Array<{ xPct: number; yPct: number; rotation: number }> = [
  { xPct: 80, yPct: 28, rotation: 8 },
  { xPct: 30, yPct: 27, rotation: -7 },
  { xPct: 80, yPct: 75, rotation: 6 },
  { xPct: 32, yPct: 75, rotation: -6 },
];

const BLOCK_DEFAULT_TITLE: Record<BlockType, string> = {
  def: "ĐỊNH NGHĨA",
  formula: "CÔNG THỨC",
  example: "VÍ DỤ",
  trap: "BẪY HAY SAI",
  text: "GHI CHÚ",
  diagram: "SƠ ĐỒ TRỰC QUAN",
};

function canCloudSync(s: AppState): s is AppState & { cloudUserId: string } {
  return (
    s.authMode === "supabase" &&
    Boolean(s.cloudUserId) &&
    s.cloudSyncStatus !== "schema-missing"
  );
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      const applyCloudResult = (res: CloudSyncResult) => {
        if (res.status === "ok") {
          set({ cloudSyncStatus: "synced", cloudError: null });
        } else if (res.status === "schema-missing") {
          set({
            cloudSyncStatus: "schema-missing",
            cloudError: "Chưa chạy SQL tạo bảng trên Supabase.",
          });
        } else {
          set({
            cloudSyncStatus: "error",
            cloudError: res.message ?? "Lỗi đồng bộ Supabase",
          });
        }
      };

      const pushProfilePatch = (patch: CloudProfilePatch) => {
        const s = get();
        if (!canCloudSync(s)) return;
        set({ cloudSyncStatus: "syncing" });
        syncProfileToCloud(s.cloudUserId, patch, applyCloudResult);
      };

      const pushNoteDebounced = (noteId: string) => {
        const s = get();
        if (!canCloudSync(s)) return;
        const note = s.notes.find((n) => n.id === noteId);
        if (!note) return;
        set({ cloudSyncStatus: "syncing" });
        upsertNoteToCloud(s.cloudUserId, note, applyCloudResult);
      };

      const pushBinderImmediate = (binderId: string) => {
        const s = get();
        if (!canCloudSync(s)) return;
        const binder = s.binders.find((b) => b.id === binderId);
        if (!binder) return;
        set({ cloudSyncStatus: "syncing" });
        void upsertBinderToCloud(s.cloudUserId, binder).then(applyCloudResult);
      };

      return {
        isAuthenticated: true,
        authMode: "guest",
        cloudUserId: null,
        cloudSyncStatus: "local",
        cloudError: null,
        user: INITIAL_USER,
        theme: "minimal-paper",
        defaultPaper: "dot",
        noteFont: "sans",
        binders: INITIAL_BINDERS,
        notes: INITIAL_NOTES,
        blurMode: false,
        revealedBlockIds: [],
        flashcards: INITIAL_FLASHCARDS,
        focusMode: 25,
        secondsLeft: 25 * 60,
        isTimerRunning: false,
        activeBinderId: INITIAL_BINDERS[0].id,
        focusTasks: INITIAL_FOCUS_TASKS,
        ambientVolumes: {
          rain: 35,
          cafe: 0,
          keys: 0,
        },
        commandPaletteOpen: false,
        customizeTarget: null,
        toastMessage: null,

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
                  ? "Bạn học (Demo)"
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

          const res = await fetchOrSeedCloudWorkspace(userId, email, displayName);
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
            user: INITIAL_USER,
            binders: INITIAL_BINDERS,
            notes: INITIAL_NOTES,
            flashcards: INITIAL_FLASHCARDS,
            focusTasks: INITIAL_FOCUS_TASKS,
            activeBinderId: INITIAL_BINDERS[0].id,
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
                subtitle: "Sổ mới khởi tạo",
                subjectTag: "#mon-hoc",
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
              flashcards: state.flashcards.filter(
                (f) => f.binderId !== binderId
              ),
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
              const slot =
                STICKER_SLOTS[b.stickers.length % STICKER_SLOTS.length];
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

        addNote: (binderId, title, paperStyle, template) => {
          const state = get();
          const created: Note = {
            id: generateUuid(),
            binderId,
            title: title?.trim() || "Trang ghi chú mới",
            template: template ?? "cornell",
            paperStyle: paperStyle ?? state.defaultPaper,
            tags: ["#ghi-chu-moi"],
            headerStickerId: "sparkle",
            updatedAt: "Vừa xong",
            updatedMinutesAgo: 0,
            blocks: [
              {
                id: `blk-${Date.now()}-1`,
                cue: "Ý chính hoặc câu hỏi gợi nhớ đầu tiên?",
                type: "def",
                title: "ĐỊNH NGHĨA",
                content:
                  "Ghi ngắn gọn ==từ khóa cốt lõi== bằng ngôn ngữ của bạn. Dùng dấu ==...== để tô highlight vàng.",
                blurrable: true,
              },
            ],
            summary:
              "Tóm tắt lại bài học trong 2–3 câu sau khi kết thúc buổi học để nhớ sâu hơn.",
          };
          set((s) => ({
            notes: [created, ...s.notes],
          }));
          const cur = get();
          if (canCloudSync(cur)) {
            set({ cloudSyncStatus: "syncing" });
            void flushNoteToCloud(cur.cloudUserId, created).then(
              applyCloudResult
            );
          }
          return created;
        },

        updateNote: (noteId, patch) => {
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    ...patch,
                    updatedAt: "Vừa lưu",
                    updatedMinutesAgo: 0,
                  }
                : n
            ),
          }));
          pushNoteDebounced(noteId);
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
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    blockLinks: [...(n.blockLinks ?? []), created],
                    updatedAt: "Vừa lưu",
                    updatedMinutesAgo: 0,
                  }
                : n
            ),
          }));
          pushNoteDebounced(noteId);
          return created;
        },

        updateBlockLinkLabel: (noteId, linkId, label) => {
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    blockLinks: (n.blockLinks ?? []).map((l) =>
                      l.id === linkId ? { ...l, label } : l
                    ),
                    updatedAt: "Vừa lưu",
                    updatedMinutesAgo: 0,
                  }
                : n
            ),
          }));
          pushNoteDebounced(noteId);
        },

        removeBlockLink: (noteId, linkId) => {
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    blockLinks: (n.blockLinks ?? []).filter(
                      (l) => l.id !== linkId
                    ),
                    updatedAt: "Vừa lưu",
                    updatedMinutesAgo: 0,
                  }
                : n
            ),
          }));
          pushNoteDebounced(noteId);
        },

        addTagToNote: (noteId, rawTag) => {
          const clean = rawTag.trim().replace(/\s+/g, "-");
          if (!clean) return;
          const normalized = clean.startsWith("#") ? clean : `#${clean}`;
          set((state) => ({
            notes: state.notes.map((n) => {
              if (n.id !== noteId) return n;
              if (n.tags.includes(normalized)) return n;
              return {
                ...n,
                tags: [...n.tags, normalized],
                updatedAt: "Vừa lưu",
                updatedMinutesAgo: 0,
              };
            }),
          }));
          pushNoteDebounced(noteId);
        },

        removeTagFromNote: (noteId, tag) => {
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    tags: n.tags.filter((t) => t !== tag),
                    updatedAt: "Vừa lưu",
                    updatedMinutesAgo: 0,
                  }
                : n
            ),
          }));
          pushNoteDebounced(noteId);
        },

        addBlockToNote: (noteId, block) => {
          const newBlock: CornellBlock = {
            ...block,
            id: `blk-${Date.now()}`,
            title: block.title ?? BLOCK_DEFAULT_TITLE[block.type],
            blurrable: true,
          };
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    blocks: [...n.blocks, newBlock],
                    updatedAt: "Vừa lưu",
                    updatedMinutesAgo: 0,
                  }
                : n
            ),
          }));
          pushNoteDebounced(noteId);
        },

        updateBlock: (noteId, blockId, patch) => {
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    blocks: n.blocks.map((b) =>
                      b.id === blockId ? { ...b, ...patch } : b
                    ),
                    updatedAt: "Vừa lưu",
                    updatedMinutesAgo: 0,
                  }
                : n
            ),
          }));
          pushNoteDebounced(noteId);
        },

        moveBlock: (noteId, blockId, direction) => {
          set((state) => ({
            notes: state.notes.map((n) => {
              if (n.id !== noteId) return n;
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
            }),
          }));
          pushNoteDebounced(noteId);
        },

        deleteBlock: (noteId, blockId) => {
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === noteId
                ? {
                    ...n,
                    blocks: n.blocks.filter((b) => b.id !== blockId),
                    blockLinks: (n.blockLinks ?? []).filter(
                      (l) =>
                        l.sourceBlockId !== blockId &&
                        l.targetBlockId !== blockId
                    ),
                    updatedAt: "Vừa lưu",
                    updatedMinutesAgo: 0,
                  }
                : n
            ),
          }));
          pushNoteDebounced(noteId);
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
          const intervalMap: Record<
            1 | 2 | 3 | 4,
            { days: number; label: string }
          > = {
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

        setCommandPaletteOpen: (commandPaletteOpen) =>
          set({ commandPaletteOpen }),
        openCustomize: (customizeTarget) => set({ customizeTarget }),
        closeCustomize: () => set({ customizeTarget: null }),
        showToast: (toastMessage) => set({ toastMessage }),
        clearToast: () => set({ toastMessage: null }),

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

        resetDemoData: () =>
          set({
            authMode: "guest",
            cloudUserId: null,
            cloudSyncStatus: "local",
            cloudError: null,
            theme: "minimal-paper",
            defaultPaper: "dot",
            noteFont: "sans",
            user: INITIAL_USER,
            binders: INITIAL_BINDERS,
            notes: INITIAL_NOTES,
            flashcards: INITIAL_FLASHCARDS,
            focusTasks: INITIAL_FOCUS_TASKS,
            activeBinderId: INITIAL_BINDERS[0].id,
            blurMode: false,
            revealedBlockIds: [],
            toastMessage: "Đã khôi phục dữ liệu mẫu ban đầu.",
          }),
      };
    },
    {
      name: "gunotes-state-v6",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
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
