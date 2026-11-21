const WORD_CHAR_REGEX = /[\p{L}\p{N}_'-]/u;

interface CaretPositionLike {
  offsetNode: Node;
  offset: number;
}

type DocumentWithCaret = Document & {
  caretPositionFromPoint?: (x: number, y: number) => CaretPositionLike | null;
  caretRangeFromPoint?: (x: number, y: number) => Range | null;
};

/**
 * Resolves the single Unicode word under `(clientX, clientY)` inside `containerEl`
 * so mobile users can 1-tap any word while Bút nhớ is active.
 */
export function extractWordAtPoint(
  clientX: number,
  clientY: number,
  containerEl: HTMLElement
): string | null {
  if (typeof document === "undefined") return null;
  const doc = document as DocumentWithCaret;

  let textNode: Node | null = null;
  let offset = 0;

  if (typeof doc.caretPositionFromPoint === "function") {
    const pos = doc.caretPositionFromPoint(clientX, clientY);
    if (pos) {
      textNode = pos.offsetNode;
      offset = pos.offset;
    }
  } else if (typeof doc.caretRangeFromPoint === "function") {
    const range = doc.caretRangeFromPoint(clientX, clientY);
    if (range) {
      textNode = range.startContainer;
      offset = range.startOffset;
    }
  }

  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return null;
  if (!containerEl.contains(textNode)) return null;
  if (textNode.parentElement?.closest("button, a")) return null;

  const content = textNode.textContent ?? "";
  if (!content.trim()) return null;

  let idx = Math.min(Math.max(offset, 0), content.length - 1);
  if (!WORD_CHAR_REGEX.test(content[idx])) {
    if (idx > 0 && WORD_CHAR_REGEX.test(content[idx - 1])) {
      idx -= 1;
    } else {
      return null;
    }
  }

  let start = idx;
  while (start > 0 && WORD_CHAR_REGEX.test(content[start - 1])) {
    start -= 1;
  }

  let end = idx + 1;
  while (end < content.length && WORD_CHAR_REGEX.test(content[end])) {
    end += 1;
  }

  const word = content.slice(start, end).trim();
  return word.length > 0 ? word : null;
}
