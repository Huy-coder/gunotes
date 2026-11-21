"use client";

import { DEFAULT_STARTER_STICKERS } from "@/lib/repository/initial-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
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

interface DbProfileRow {
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

interface DbBinderRow {
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

interface DbNoteRow {
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

interface DbFlashcardRow {
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

function mapBinderRow(r: DbBinderRow): Binder {
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

function mapNoteRow(r: DbNoteRow): Note {
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

function mapFlashcardRow(r: DbFlashcardRow, noteTitleLookup: Map<string, string>): Flashcard {
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

export async function fetchCloudWorkspace(
  userId: string,
  email: string,
  displayName?: string
): Promise<CloudHydrateResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) {
    return { status: "error", message: "Chưa cấu hình Supabase trên trình duyệt." };
  }

  try {
    const [profileRes, bindersRes, notesRes, flashcardsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase
        .from("binders")
        .select("*")
        .eq("user_id", userId)
        .order("sort_order", { ascending: true }),
      supabase
        .from("notes")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false }),
      supabase
        .from("flashcards")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    const firstError =
      profileRes.error ??
      bindersRes.error ??
      notesRes.error ??
      flashcardsRes.error;

    if (firstError) {
      if (isMissingTableError(firstError)) {
        return { status: "schema-missing" };
      }
      return { status: "error", message: firstError.message };
    }

    let profileRow = profileRes.data as DbProfileRow | null;
    if (!profileRow) {
      const fallbackName =
        displayName?.trim() || email.split("@")[0] || "Bạn mới";
      const insertPayload = {
        id: userId,
        email,
        display_name: fallbackName,
        active_theme: "minimal-paper",
        default_paper: "dot",
        note_font: "sans",
        study_persona: "flow",
        streak_days: 0,
        weekly_focus_minutes: 0,
        today_focus_minutes: 0,
        unlocked_stickers: DEFAULT_STARTER_STICKERS,
        focus_tasks: [],
        onboarded: false,
      };
      const upRes = await supabase
        .from("profiles")
        .upsert(insertPayload, { onConflict: "id" })
        .select("*")
        .single();
      if (upRes.error) {
        if (isMissingTableError(upRes.error)) return { status: "schema-missing" };
        return { status: "error", message: upRes.error.message };
      }
      profileRow = upRes.data as DbProfileRow;
    }

    const binderRows = (bindersRes.data ?? []) as DbBinderRow[];
    const noteRows = (notesRes.data ?? []) as DbNoteRow[];
    const flashcardRows = (flashcardsRes.data ?? []) as DbFlashcardRow[];

    const mappedBinders = binderRows.map(mapBinderRow);
    const mappedNotes = noteRows.map(mapNoteRow);
    const noteTitleMap = new Map(mappedNotes.map((n) => [n.id, n.title]));
    const mappedCards = flashcardRows.map((c) => mapFlashcardRow(c, noteTitleMap));

    const user: UserProfile = {
      id: profileRow.id,
      displayName:
        profileRow.display_name || email.split("@")[0] || "Bạn mới",
      email: profileRow.email || email,
      streakDays: profileRow.streak_days ?? 0,
      weeklyFocusMinutes: profileRow.weekly_focus_minutes ?? 0,
      todayFocusMinutes: profileRow.today_focus_minutes ?? 0,
      unlockedStickers: Array.isArray(profileRow.unlocked_stickers)
        ? profileRow.unlocked_stickers
        : [...DEFAULT_STARTER_STICKERS],
      studyPersona: (profileRow.study_persona as StudyPersona) || "flow",
      onboarded: profileRow.onboarded ?? false,
    };

    const focusTasks: FocusTask[] = Array.isArray(profileRow.focus_tasks)
      ? profileRow.focus_tasks
      : [];

    return {
      status: "ok",
      user,
      theme: (profileRow.active_theme as ThemeId) || "minimal-paper",
      defaultPaper: (profileRow.default_paper as PaperStyle) || "dot",
      noteFont: (profileRow.note_font as NoteFont) || "sans",
      binders: mappedBinders,
      notes: mappedNotes,
      flashcards: mappedCards,
      focusTasks,
    };
  } catch (err) {
    return {
      status: "error",
      message: err instanceof Error ? err.message : "Không thể tải dữ liệu Supabase",
    };
  }
}

// ==========================================
// Background Cloud Write Helpers (RLS-safe)
// ==========================================

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

let pendingProfilePatch: CloudProfilePatch = {};
let profileSyncTimer: number | null = null;

export function syncProfileToCloud(
  userId: string,
  patch: CloudProfilePatch,
  onDone?: (res: CloudSyncResult) => void
) {
  pendingProfilePatch = { ...pendingProfilePatch, ...patch };
  if (typeof window === "undefined") return;
  if (profileSyncTimer) window.clearTimeout(profileSyncTimer);

  profileSyncTimer = window.setTimeout(async () => {
    const payload = { ...pendingProfilePatch, updated_at: new Date().toISOString() };
    pendingProfilePatch = {};
    profileSyncTimer = null;

    const supabase = getSupabaseBrowserClient();
    if (!supabase || !isUuid(userId)) return;

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);
    if (error) {
      onDone?.({
        status: isMissingTableError(error) ? "schema-missing" : "error",
        message: error.message,
      });
    } else {
      onDone?.({ status: "ok" });
    }
  }, 450);
}

export async function upsertBinderToCloud(
  userId: string,
  binder: Binder
): Promise<CloudSyncResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isUuid(userId) || !isUuid(binder.id)) {
    return { status: "error", message: "Invalid UUID for binder sync" };
  }
  const { error } = await supabase.from("binders").upsert(
    {
      id: binder.id,
      user_id: userId,
      title: binder.title,
      subtitle: binder.subtitle,
      subject_tag: binder.subjectTag,
      cover_tone: binder.coverTone,
      cover_pattern: binder.coverPattern,
      stickers: binder.stickers,
      mastery_percent: binder.masteryPercent,
      sort_order: binder.sortOrder,
    },
    { onConflict: "id" }
  );
  if (error) {
    return {
      status: isMissingTableError(error) ? "schema-missing" : "error",
      message: error.message,
    };
  }
  return { status: "ok" };
}

export async function deleteBinderFromCloud(
  binderId: string
): Promise<CloudSyncResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isUuid(binderId)) return { status: "ok" };
  const { error } = await supabase.from("binders").delete().eq("id", binderId);
  if (error) {
    return {
      status: isMissingTableError(error) ? "schema-missing" : "error",
      message: error.message,
    };
  }
  return { status: "ok" };
}

const noteTimers = new Map<string, number>();
const latestNotesPending = new Map<string, { userId: string; note: Note }>();

export async function flushNoteToCloud(
  userId: string,
  note: Note
): Promise<CloudSyncResult> {
  const supabase = getSupabaseBrowserClient();
  if (
    !supabase ||
    !isUuid(userId) ||
    !isUuid(note.id) ||
    !isUuid(note.binderId)
  ) {
    return { status: "error", message: "Invalid UUID for note sync" };
  }
  const { error } = await supabase.from("notes").upsert(
    {
      id: note.id,
      user_id: userId,
      binder_id: note.binderId,
      title: note.title,
      template: note.template,
      paper_style: note.paperStyle,
      tags: note.tags,
      blocks: note.blocks,
      block_links: note.blockLinks ?? [],
      summary: note.summary,
      header_sticker_id: note.headerStickerId ?? null,
      is_pinned: Boolean(note.isPinned),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) {
    return {
      status: isMissingTableError(error) ? "schema-missing" : "error",
      message: error.message,
    };
  }
  return { status: "ok" };
}

export function upsertNoteToCloud(
  userId: string,
  note: Note,
  onDone?: (res: CloudSyncResult) => void
) {
  if (typeof window === "undefined" || !isUuid(note.id)) return;
  latestNotesPending.set(note.id, { userId, note });
  const prevTimer = noteTimers.get(note.id);
  if (prevTimer) window.clearTimeout(prevTimer);

  const timer = window.setTimeout(async () => {
    noteTimers.delete(note.id);
    const entry = latestNotesPending.get(note.id);
    latestNotesPending.delete(note.id);
    if (!entry) return;
    const res = await flushNoteToCloud(entry.userId, entry.note);
    onDone?.(res);
  }, 500);

  noteTimers.set(note.id, timer);
}

export async function deleteNoteFromCloud(
  noteId: string
): Promise<CloudSyncResult> {
  if (typeof window !== "undefined") {
    const t = noteTimers.get(noteId);
    if (t) window.clearTimeout(t);
    noteTimers.delete(noteId);
    latestNotesPending.delete(noteId);
  }
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isUuid(noteId)) return { status: "ok" };
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) {
    return {
      status: isMissingTableError(error) ? "schema-missing" : "error",
      message: error.message,
    };
  }
  return { status: "ok" };
}

export async function upsertFlashcardToCloud(
  userId: string,
  card: Flashcard
): Promise<CloudSyncResult> {
  const supabase = getSupabaseBrowserClient();
  if (
    !supabase ||
    !isUuid(userId) ||
    !isUuid(card.id) ||
    !isUuid(card.binderId) ||
    !isUuid(card.noteId)
  ) {
    return { status: "error", message: "Invalid UUID for flashcard sync" };
  }
  const dueAt = new Date(
    Date.now() + Math.max(0, card.intervalDays) * 86400000
  ).toISOString();

  const { error } = await supabase.from("flashcards").upsert(
    {
      id: card.id,
      user_id: userId,
      binder_id: card.binderId,
      note_id: card.noteId,
      note_title: card.noteTitle,
      block_type: card.type,
      front: card.front,
      back: card.back,
      tip: card.tip ?? null,
      due_label: card.dueLabel,
      is_due: card.isDue,
      due_at: dueAt,
      interval_days: card.intervalDays,
      reps: card.reps,
    },
    { onConflict: "id" }
  );
  if (error) {
    return {
      status: isMissingTableError(error) ? "schema-missing" : "error",
      message: error.message,
    };
  }
  return { status: "ok" };
}

export async function batchUpsertFlashcardsToCloud(
  userId: string,
  cards: Flashcard[]
): Promise<CloudSyncResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isUuid(userId)) return { status: "ok" };
  const rows = cards
    .filter((c) => isUuid(c.id) && isUuid(c.binderId) && isUuid(c.noteId))
    .map((c) => ({
      id: c.id,
      user_id: userId,
      binder_id: c.binderId,
      note_id: c.noteId,
      note_title: c.noteTitle,
      block_type: c.type,
      front: c.front,
      back: c.back,
      tip: c.tip ?? null,
      due_label: c.dueLabel,
      is_due: c.isDue,
      interval_days: c.intervalDays,
      reps: c.reps,
    }));
  if (rows.length === 0) return { status: "ok" };
  const { error } = await supabase
    .from("flashcards")
    .upsert(rows, { onConflict: "id" });
  if (error) {
    return {
      status: isMissingTableError(error) ? "schema-missing" : "error",
      message: error.message,
    };
  }
  return { status: "ok" };
}

export async function logStudySessionToCloud(
  userId: string,
  binderId: string | null | undefined,
  durationMinutes: number,
  mode: "focus" | "break" = "focus"
): Promise<CloudSyncResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isUuid(userId)) return { status: "ok" };
  const { error } = await supabase.from("study_sessions").insert({
    user_id: userId,
    binder_id: isUuid(binderId) ? binderId : null,
    duration_minutes: durationMinutes,
    mode,
  });
  if (error) {
    return {
      status: isMissingTableError(error) ? "schema-missing" : "error",
      message: error.message,
    };
  }
  return { status: "ok" };
}
