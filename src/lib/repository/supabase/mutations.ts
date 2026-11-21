"use client";

import {
  isUuid,
  toCloudSyncError,
  type CloudProfilePatch,
  type CloudSyncResult,
} from "@/lib/repository/supabase/types-and-mappers";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Binder, Flashcard, Note } from "@/types/study";

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
    const payload = {
      ...pendingProfilePatch,
      updated_at: new Date().toISOString(),
    };
    pendingProfilePatch = {};
    profileSyncTimer = null;

    const supabase = getSupabaseBrowserClient();
    if (!supabase || !isUuid(userId)) return;

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);
    onDone?.(error ? toCloudSyncError(error) : { status: "ok" });
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
  return error ? toCloudSyncError(error) : { status: "ok" };
}

export async function deleteBinderFromCloud(
  binderId: string
): Promise<CloudSyncResult> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase || !isUuid(binderId)) return { status: "ok" };
  const { error } = await supabase.from("binders").delete().eq("id", binderId);
  return error ? toCloudSyncError(error) : { status: "ok" };
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
  return error ? toCloudSyncError(error) : { status: "ok" };
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
  return error ? toCloudSyncError(error) : { status: "ok" };
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
  return error ? toCloudSyncError(error) : { status: "ok" };
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
  return error ? toCloudSyncError(error) : { status: "ok" };
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
  return error ? toCloudSyncError(error) : { status: "ok" };
}
