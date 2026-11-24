export const VIETNAMESE_SPEECH_LANG = "vi-VN" as const;

/**
 * Appends a recognized Vietnamese speech chunk onto existing block text,
 * handling punctuation-aware spacing and sentence-start capitalization.
 */
export function appendVietnameseTranscript(
  currentText: string,
  rawChunk: string
): string {
  const cleaned = rawChunk.replace(/\s+/g, " ").trim();
  if (!cleaned) return currentText;

  const trimmedRight = currentText.trimEnd();
  const endsSentence =
    trimmedRight.length === 0 || /[.!?\n]$/.test(trimmedRight);

  const normalizedChunk = endsSentence
    ? cleaned.slice(0, 1).toLocaleUpperCase("vi-VN") + cleaned.slice(1)
    : cleaned;

  if (!currentText) return normalizedChunk;
  const sep = /[\s\n]$/.test(currentText) ? "" : " ";
  return `${currentText}${sep}${normalizedChunk}`;
}

/**
 * Guards against Android Chrome's Web Speech quirk that emits an identical
 * final result twice in rapid succession.
 */
export function isDuplicateAndroidChunk(
  prevChunk: string,
  nextChunk: string,
  elapsedMs: number
): boolean {
  const a = prevChunk.replace(/\s+/g, " ").trim().toLowerCase();
  const b = nextChunk.replace(/\s+/g, " ").trim().toLowerCase();
  if (!a || !b) return false;
  return a === b && elapsedMs >= 0 && elapsedMs < 1800;
}
