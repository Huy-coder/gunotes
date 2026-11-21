import type { StateCreator } from "zustand";
import type { CloudProfilePatch, CloudSyncResult } from "@/lib/repository/supabase-sync";
import type {
  Binder,
  BinderCoverPattern,
  BinderCoverTone,
  CornellBlock,
  Flashcard,
  FocusTask,
  Note,
  NoteBlockLink,
  NoteFont,
  NoteTemplate,
  PaperStyle,
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

export interface AuthCloudSlice {
  isAuthenticated: boolean;
  authMode: "guest" | "supabase";
  cloudUserId: string | null;
  cloudSyncStatus: CloudSyncStatus;
  cloudError: string | null;
  user: UserProfile;
  theme: ThemeId;
  defaultPaper: PaperStyle;
  noteFont: NoteFont;
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
  setTheme: (theme: ThemeId) => void;
  setDefaultPaper: (paper: PaperStyle) => void;
  setNoteFont: (font: NoteFont) => void;
  setStudyPersona: (persona: StudyPersona) => void;
  unlockAllStickersPreview: () => void;
  resetLocalWorkspace: () => void;
}

export interface BinderSlice {
  binders: Binder[];
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
}

export interface NoteSlice {
  notes: Note[];
  blurMode: boolean;
  revealedBlockIds: string[];
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
    block: Omit<CornellBlock, "id">,
    insertAfterBlockId?: string
  ) => CornellBlock;
  restoreBlock: (noteId: string, block: CornellBlock, index: number) => void;
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
  toggleBlurMode: () => void;
  setBlurMode: (active: boolean) => void;
  toggleRevealBlock: (blockId: string) => void;
  resetReveals: () => void;
}

export interface FlashcardSlice {
  flashcards: Flashcard[];
  addFlashcard: (
    card: Omit<Flashcard, "id" | "dueLabel" | "isDue" | "intervalDays" | "reps">
  ) => void;
  rateFlashcard: (id: string, rating: 1 | 2 | 3 | 4) => void;
  resetReviewDeck: () => void;
}

export interface FocusSlice {
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
}

export interface UiSlice {
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  customizeTarget: CustomizeTarget | null;
  openCustomize: (target: CustomizeTarget) => void;
  closeCustomize: () => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  clearToast: () => void;
}

export type AppState = AuthCloudSlice &
  BinderSlice &
  NoteSlice &
  FlashcardSlice &
  FocusSlice &
  UiSlice;

export type StoreSet = Parameters<StateCreator<AppState>>[0];
export type StoreGet = Parameters<StateCreator<AppState>>[1];

export interface CloudSyncHelpers {
  applyCloudResult: (res: CloudSyncResult) => void;
  pushProfilePatch: (patch: CloudProfilePatch) => void;
  pushNoteDebounced: (noteId: string) => void;
  pushBinderImmediate: (binderId: string) => void;
}
