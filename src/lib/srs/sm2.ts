import { stripStudyMarkup } from "../highlight/highlight-markup";
import type { Flashcard, Note } from "../../types/study";

const DAY_MS = 86400000;

export function getLocalDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isCardDueNow(card: Flashcard, nowMs: number = Date.now()): boolean {
  if (card.dueAtIso) {
    const t = Date.parse(card.dueAtIso);
    if (!Number.isNaN(t)) return t <= nowMs;
  }
  return card.isDue;
}

export function formatSrsIntervalLabel(intervalDays: number): string {
  if (intervalDays <= 0) return "Ôn lại sau 10 phút";
  if (intervalDays === 1) return "Ngày mai";
  return `${intervalDays} ngày nữa`;
}

export function computeNextSrs(
  card: Flashcard,
  rating: 1 | 2 | 3 | 4,
  nowMs: number = Date.now()
): {
  isDue: boolean;
  intervalDays: number;
  reps: number;
  easeFactor: number;
  dueAtIso: string;
  dueLabel: string;
} {
  const ef = card.easeFactor ?? 2.5;
  const prevReps = card.reps ?? 0;
  const prevInterval = Math.max(0, card.intervalDays ?? 0);

  if (rating === 1) {
    return {
      isDue: true,
      intervalDays: 0,
      reps: 0,
      easeFactor: Math.max(1.3, Number((ef - 0.2).toFixed(2))),
      dueAtIso: new Date(nowMs + 10 * 60 * 1000).toISOString(),
      dueLabel: "Ôn lại sau 10 phút",
    };
  }

  let nextInterval = 1;
  let nextEf = ef;

  if (rating === 2) {
    nextEf = Math.max(1.3, Number((ef - 0.15).toFixed(2)));
    nextInterval = prevReps === 0 ? 1 : Math.max(1, Math.round(Math.max(1, prevInterval) * 1.2));
  } else if (rating === 3) {
    nextInterval =
      prevReps === 0
        ? 1
        : prevReps === 1
        ? 4
        : Math.max(2, Math.round(prevInterval * ef));
  } else {
    nextEf = Math.min(3.0, Number((ef + 0.15).toFixed(2)));
    nextInterval =
      prevReps === 0
        ? 4
        : Math.max(3, Math.round(Math.max(2, prevInterval) * ef * 1.3));
  }

  return {
    isDue: false,
    intervalDays: nextInterval,
    reps: prevReps + 1,
    easeFactor: nextEf,
    dueAtIso: new Date(nowMs + nextInterval * DAY_MS).toISOString(),
    dueLabel: formatSrsIntervalLabel(nextInterval),
  };
}

export function computeBinderMastery(
  binderId: string,
  flashcards: Flashcard[],
  nowMs: number = Date.now()
): number {
  const cards = flashcards.filter((c) => c.binderId === binderId);
  if (cards.length === 0) return 0;
  const masteredWeight = cards.reduce((acc, card) => {
    if (isCardDueNow(card, nowMs)) return acc;
    if (card.reps >= 2 || card.intervalDays >= 4) return acc + 1;
    return acc + 0.65;
  }, 0);
  return Math.min(100, Math.round((masteredWeight / cards.length) * 100));
}

export function computeStudyMetrics(
  dailyStudyLog: Record<string, number>,
  now: Date = new Date()
): {
  todayFocusMinutes: number;
  weeklyFocusMinutes: number;
  streakDays: number;
} {
  const todayKey = getLocalDateKey(now);
  const todayFocusMinutes = dailyStudyLog[todayKey] ?? 0;

  let weeklyFocusMinutes = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    weeklyFocusMinutes += dailyStudyLog[getLocalDateKey(d)] ?? 0;
  }

  let streakDays = 0;
  const startOffset = (dailyStudyLog[todayKey] ?? 0) > 0 ? 0 : 1;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    if ((dailyStudyLog[getLocalDateKey(d)] ?? 0) > 0) {
      streakDays += 1;
    } else {
      break;
    }
  }

  return { todayFocusMinutes, weeklyFocusMinutes, streakDays };
}

const BADGE_LABEL: Record<"def" | "formula" | "example" | "trap", string> = {
  def: "ĐỊNH NGHĨA",
  formula: "CÔNG THỨC",
  example: "VÍ DỤ",
  trap: "BẪY HAY SAI",
};

export function generateFlashcardsFromNote(
  note: Note,
  existingCards: Flashcard[]
): Array<
  Omit<Flashcard, "id" | "dueLabel" | "isDue" | "intervalDays" | "reps">
> {
  const existingFronts = new Set(
    existingCards
      .filter((c) => c.noteId === note.id)
      .map((c) => stripStudyMarkup(c.front).trim().toLowerCase())
  );

  const generated: Array<
    Omit<Flashcard, "id" | "dueLabel" | "isDue" | "intervalDays" | "reps">
  > = [];

  for (const blk of note.blocks) {
    if (blk.type === "diagram" || blk.type === "image") continue;
    const rawContent = blk.content.trim();
    if (!rawContent) continue;

    // 1. Cloze-based extraction
    const clozeMatches = Array.from(rawContent.matchAll(/\{\{([\s\S]+?)\}\}/g));
    if (clozeMatches.length > 0) {
      const masked = rawContent.replace(/\{\{([\s\S]+?)\}\}/g, "[_____]");
      const front = blk.cue.trim()
        ? `${blk.cue.trim()}\n${stripStudyMarkup(masked)}`
        : stripStudyMarkup(masked);
      const norm = stripStudyMarkup(front).trim().toLowerCase();
      if (!existingFronts.has(norm)) {
        existingFronts.add(norm);
        const answers = clozeMatches.map((m) => `==y:${m[1].trim()}==`).join(" • ");
        generated.push({
          binderId: note.binderId,
          noteId: note.id,
          noteTitle: note.title,
          type: blk.type === "text" ? "def" : blk.type,
          front,
          back: `${answers}\n\n${rawContent}`,
          tip: "Tạo tự động từ ô che chữ {{Cloze}}.",
        });
      }
      continue;
    }

    // 2. Semantic block extraction (def, formula, trap)
    if (blk.type === "def" || blk.type === "formula" || blk.type === "trap") {
      const front =
        blk.cue.trim() || `${BADGE_LABEL[blk.type]} • ${note.title}`;
      const norm = stripStudyMarkup(front).trim().toLowerCase();
      if (!existingFronts.has(norm)) {
        existingFronts.add(norm);
        generated.push({
          binderId: note.binderId,
          noteId: note.id,
          noteTitle: note.title,
          type: blk.type,
          front,
          back: rawContent,
        });
      }
    }
  }

  return generated;
}
