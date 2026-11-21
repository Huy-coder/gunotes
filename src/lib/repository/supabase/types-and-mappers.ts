"use client";

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
  PlacedSticker,
  StickerId,
  StudyPersona,
  ThemeId,
  UserProfile,
} from "@/types/study";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function generateUuid(): string {
  if (
    typeof globalThis !== "undefined" &&
    typeof globalThis.crypto?.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isUuid(id: string | null | undefined): id is string {
  return Boolean(id && UUID_REGEX.test(id));
}

export function isMissingTableError(error: {
  code?: string;
  message?: string;
} | null): boolean {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = error.message?.toLowerCase() ?? "";
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    code === "42703" ||
    code === "PGRST204" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the") ||
    msg.includes("schema cache")
  );
}

export function toCloudSyncError(error: {
  code?: string;
  message?: string;
}): CloudSyncResult {
  return {
    status: isMissingTableError(error) ? "schema-missing" : "error",
    message: error.message,
  };
}

export function formatRelativeUpdatedAt(iso?: string | null): {
  label: string;
  minutesAgo: number;
} {
  if (!iso) return { label: "Vừa xong", minutesAgo: 0 };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return { label: "Hôm nay", minutesAgo: 0 };
  }
  const diffMs = Math.max(0, Date.now() - date.getTime());
  const minutesAgo = Math.floor(diffMs / 60000);
  if (minutesAgo < 2) return { label: "Vừa xong", minutesAgo };
  if (minutesAgo < 60) {
    return { label: `${minutesAgo} phút trước`, minutesAgo };
  }
  const now = new Date();
  const isSameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();
  if (isSameDay) {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return { label: `Hôm nay, ${hh}:${mm}`, minutesAgo };
  }
  const days = Math.floor(minutesAgo / 1440);
  if (days === 1) return { label: "Hôm qua", minutesAgo };
  if (days < 7) return { label: `${days} ngày trước`, minutesAgo };
  return {
    label: `${date.getDate()}/${date.getMonth() + 1}`,
    minutesAgo,
  };
}

export type CloudHydrateResult =
  | {
      status: "ok";
      user: UserProfile;
      theme: ThemeId;
      defaultPaper: PaperStyle;
      noteFont: NoteFont;
      binders: Binder[];
      notes: Note[];
      flashcards: Flashcard[];
      focusTasks: FocusTask[];
    }
  | { status: "schema-missing" }
  | { status: "error"; message: string };

export type CloudSyncResult = {
  status: "ok" | "schema-missing" | "error";
  message?: string;
};

export interface CloudProfilePatch {
  email?: string;
  display_name?: string;
  active_theme?: ThemeId;
  default_paper?: PaperStyle;
  note_font?: NoteFont;
  study_persona?: StudyPersona;
  streak_days?: number;
  weekly_focus_minutes?: number;
  today_focus_minutes?: number;
  unlocked_stickers?: StickerId[];
  focus_tasks?: FocusTask[];
  onboarded?: boolean;
}

export interface DbProfileRow {
  id: string;
  email: string;
  display_name: string;
  active_theme: string;
  default_paper: string;
  note_font: string;
  study_persona: string;
  streak_days: number;
  weekly_focus_minutes: number;
  today_focus_minutes: number;
  unlocked_stickers: StickerId[];
  focus_tasks: FocusTask[];
  onboarded: boolean;
}

export interface DbBinderRow {
  id: string;
  user_id: string;
  title: string;
  subtitle: string;
  subject_tag: string;
  cover_tone: string;
  cover_pattern: string;
  stickers: PlacedSticker[];
  mastery_percent: number;
  sort_order: number;
}

export interface DbNoteRow {
  id: string;
  user_id: string;
  binder_id: string;
  title: string;
  template: string;
  paper_style: string;
  tags: string[];
  blocks: CornellBlock[];
  block_links?: NoteBlockLink[];
  summary: string;
  header_sticker_id?: string | null;
  is_pinned?: boolean;
  updated_at?: string;
}

export interface DbFlashcardRow {
  id: string;
  user_id: string;
  binder_id: string;
  note_id: string;
  note_title?: string;
  block_type: string;
  front: string;
  back: string;
  tip?: string | null;
  due_label?: string;
  is_due?: boolean;
  due_at?: string;
  interval_days: number;
  reps: number;
}

export function mapBinderRow(r: DbBinderRow): Binder {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? "",
    subjectTag: r.subject_tag ?? "#hoc-tap",
    coverTone: (r.cover_tone as BinderCoverTone) || "blue",
    coverPattern: (r.cover_pattern as BinderCoverPattern) || "dot",
    stickers: Array.isArray(r.stickers) ? r.stickers : [],
    masteryPercent: r.mastery_percent ?? 0,
    sortOrder: r.sort_order ?? 0,
  };
}

export function mapNoteRow(r: DbNoteRow): Note {
  const rel = formatRelativeUpdatedAt(r.updated_at);
  return {
    id: r.id,
    binderId: r.binder_id,
    title: r.title,
    template: (r.template as NoteTemplate) || "cornell",
    paperStyle: (r.paper_style as PaperStyle) || "dot",
    tags: Array.isArray(r.tags) ? r.tags : [],
    blocks: Array.isArray(r.blocks) ? r.blocks : [],
    blockLinks: Array.isArray(r.block_links) ? r.block_links : undefined,
    summary: r.summary ?? "",
    headerStickerId: (r.header_sticker_id as StickerId | null | undefined) ?? null,
    isPinned: Boolean(r.is_pinned),
    updatedAt: rel.label,
    updatedMinutesAgo: rel.minutesAgo,
  };
}

export function mapFlashcardRow(
  r: DbFlashcardRow,
  noteTitleLookup: Map<string, string>
): Flashcard {
  return {
    id: r.id,
    binderId: r.binder_id,
    noteId: r.note_id,
    noteTitle: r.note_title || noteTitleLookup.get(r.note_id) || "Trang ghi chú",
    type: (r.block_type as Flashcard["type"]) || "def",
    front: r.front,
    back: r.back,
    tip: r.tip ?? undefined,
    dueLabel: r.due_label ?? "Đến hạn hôm nay",
    isDue: r.is_due ?? true,
    intervalDays: r.interval_days ?? 1,
    reps: r.reps ?? 0,
  };
}
