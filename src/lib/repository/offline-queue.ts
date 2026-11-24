"use client";

import type { Binder, Flashcard, Note } from "@/types/study";

const QUEUE_KEY = "gunotes-offline-queue-v1";

export type QueuedMutation =
  | { kind: "upsert-note"; note: Note; ts: number }
  | { kind: "delete-note"; noteId: string; ts: number }
  | { kind: "upsert-binder"; binder: Binder; ts: number }
  | { kind: "delete-binder"; binderId: string; ts: number }
  | { kind: "upsert-flashcard"; card: Flashcard; ts: number }
  | { kind: "delete-flashcard"; cardId: string; ts: number };

function getEntityKey(m: QueuedMutation): string {
  switch (m.kind) {
    case "upsert-note":
      return `note:${m.note.id}`;
    case "delete-note":
      return `note:${m.noteId}`;
    case "upsert-binder":
      return `binder:${m.binder.id}`;
    case "delete-binder":
      return `binder:${m.binderId}`;
    case "upsert-flashcard":
      return `card:${m.card.id}`;
    case "delete-flashcard":
      return `card:${m.cardId}`;
  }
}

export function getOfflineQueue(): QueuedMutation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedMutation[]) : [];
  } catch {
    return [];
  }
}

export function setOfflineQueue(items: QueuedMutation[]): void {
  if (typeof window === "undefined") return;
  try {
    if (items.length === 0) {
      window.localStorage.removeItem(QUEUE_KEY);
    } else {
      window.localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    }
  } catch {
    // Ignore storage quota issues
  }
}

export function enqueueOfflineMutation(mutation: QueuedMutation): number {
  const queue = getOfflineQueue();
  const key = getEntityKey(mutation);
  const filtered = queue.filter((item) => getEntityKey(item) !== key);
  filtered.push(mutation);
  setOfflineQueue(filtered);
  return filtered.length;
}

export function clearOfflineQueue(): void {
  setOfflineQueue([]);
}
