"use client";

import { DEFAULT_STARTER_STICKERS } from "@/lib/repository/initial-state";
import {
  isMissingTableError,
  mapBinderRow,
  mapFlashcardRow,
  mapNoteRow,
  type CloudHydrateResult,
  type DbBinderRow,
  type DbFlashcardRow,
  type DbNoteRow,
  type DbProfileRow,
} from "@/lib/repository/supabase/types-and-mappers";
import { computeStudyMetrics, getLocalDateKey } from "@/lib/srs/sm2";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  FocusTask,
  NoteFont,
  PaperStyle,
  StudyPersona,
  ThemeId,
  UserProfile,
} from "@/types/study";

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
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();
    const [profileRes, bindersRes, notesRes, flashcardsRes, sessionsRes] =
      await Promise.all([
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
        supabase
          .from("study_sessions")
          .select("duration_minutes,mode,created_at")
          .eq("user_id", userId)
          .gte("created_at", ninetyDaysAgo),
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

    // Aggregate 90-day study sessions into local-date study heatmap
    const dailyStudyLog: Record<string, number> = {};
    if (!sessionsRes.error && Array.isArray(sessionsRes.data)) {
      for (const row of sessionsRes.data as Array<{
        duration_minutes?: number;
        mode?: string;
        created_at?: string;
      }>) {
        if (row.mode === "break" || !row.created_at) continue;
        const dt = new Date(row.created_at);
        if (Number.isNaN(dt.getTime())) continue;
        const key = getLocalDateKey(dt);
        dailyStudyLog[key] =
          (dailyStudyLog[key] ?? 0) + Math.max(0, row.duration_minutes ?? 0);
      }
    }

    const hasSessionHistory = Object.keys(dailyStudyLog).length > 0;
    const computedMetrics = hasSessionHistory
      ? computeStudyMetrics(dailyStudyLog)
      : null;

    const user: UserProfile = {
      id: profileRow.id,
      displayName:
        profileRow.display_name || email.split("@")[0] || "Bạn mới",
      email: profileRow.email || email,
      streakDays: computedMetrics?.streakDays ?? profileRow.streak_days ?? 0,
      weeklyFocusMinutes:
        computedMetrics?.weeklyFocusMinutes ??
        profileRow.weekly_focus_minutes ??
        0,
      todayFocusMinutes:
        computedMetrics?.todayFocusMinutes ?? profileRow.today_focus_minutes ?? 0,
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
      dailyStudyLog,
    };
  } catch (err) {
    return {
      status: "error",
      message:
        err instanceof Error ? err.message : "Không thể tải dữ liệu Supabase",
    };
  }
}
