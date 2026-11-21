import type { Note } from "@/types/study";

const WIKI_LINK_REGEX = /\[\[([^\]]+?)\]\]/g;

function toPlainExcerpt(text: string): string {
  return text
    .replace(/==(?:[ybpg]:)?([\s\S]+?)==/g, "$1")
    .replace(/\{\{([\s\S]+?)\}\}/g, "$1")
    .replace(/\[\[([^\]]+?)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extracts unique `[[Note Title]]` targets from raw markdown/study text.
 */
export function extractWikiLinks(text: string): string[] {
  const results = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(WIKI_LINK_REGEX.source, "g");
  while ((match = regex.exec(text)) !== null) {
    const clean = match[1].trim();
    if (clean) results.add(clean);
  }
  return Array.from(results);
}

/**
 * Aggregates all unique outgoing `[[wiki-link]]` titles across a note's blocks and summary.
 */
export function extractNoteWikiLinks(note: Note): string[] {
  const results = new Set<string>();
  const addFromText = (txt?: string) => {
    if (!txt) return;
    for (const item of extractWikiLinks(txt)) {
      results.add(item);
    }
  };

  addFromText(note.summary);
  for (const blk of note.blocks) {
    addFromText(blk.cue);
    addFromText(blk.content);
    addFromText(blk.action);
  }
  return Array.from(results);
}

/**
 * Resolves a wiki-link title against available notes (case-insensitive exact match first, then includes fallback).
 */
export function resolveWikiLink(
  title: string,
  allNotes: Note[]
): Note | undefined {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return undefined;

  const exact = allNotes.find(
    (n) => n.title.trim().toLowerCase() === normalized
  );
  if (exact) return exact;

  return allNotes.find(
    (n) =>
      n.title.trim().toLowerCase().includes(normalized) ||
      normalized.includes(n.title.trim().toLowerCase())
  );
}

/**
 * Finds all notes that reference `targetNote` via `[[...]]`, along with a clean short excerpt.
 */
export function getBacklinks(
  targetNote: Note,
  allNotes: Note[]
): Array<{ note: Note; excerpt: string }> {
  const results: Array<{ note: Note; excerpt: string }> = [];

  for (const candidate of allNotes) {
    if (candidate.id === targetNote.id) continue;
    const links = extractNoteWikiLinks(candidate);
    const matchesTarget = links.some((linkTitle) => {
      const resolved = resolveWikiLink(linkTitle, allNotes);
      return resolved?.id === targetNote.id;
    });
    if (!matchesTarget) continue;

    // Pick first matching snippet from blocks or summary
    let excerpt = candidate.summary;
    const matchingBlock = candidate.blocks.find((blk) => {
      const blkLinks = [
        ...extractWikiLinks(blk.content),
        ...extractWikiLinks(blk.cue),
        ...extractWikiLinks(blk.action ?? ""),
      ];
      return blkLinks.some(
        (t) => resolveWikiLink(t, allNotes)?.id === targetNote.id
      );
    });
    if (matchingBlock) {
      excerpt = matchingBlock.content;
    }

    const cleanExcerpt = toPlainExcerpt(excerpt);
    results.push({
      note: candidate,
      excerpt:
        cleanExcerpt.length > 130
          ? `${cleanExcerpt.slice(0, 127)}...`
          : cleanExcerpt,
    });
  }

  return results;
}
