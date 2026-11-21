import type { HighlightColor } from "@/types/study";

/**
 * Strips highlight/cloze/wiki-link markers from text for plain comparison or card previews.
 */
export function stripStudyMarkup(text: string): string {
  return text
    .replace(/==(?:[ybpg]:)?([\s\S]+?)==/g, "$1")
    .replace(/\{\{([\s\S]+?)\}\}/g, "$1")
    .replace(/\[\[([^\]]+?)\]\]/g, "$1");
}

type TokenUnit = {
  raw: string;
  plain: string;
  style: HighlightColor | "cloze" | null;
  kind: "nl" | "display-math" | "wiki" | "inline-math" | "char";
};

function pushStyledInnerUnits(
  units: TokenUnit[],
  inner: string,
  style: HighlightColor | "cloze" | null
) {
  const parts = inner.split(/(\$[^$\n]+?\$|\n)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part === "\n") {
      units.push({ raw: "\n", plain: "\n", style: null, kind: "nl" });
    } else if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      units.push({
        raw: part,
        plain: part.slice(1, -1),
        style,
        kind: "inline-math",
      });
    } else {
      for (const ch of part) {
        units.push({ raw: ch, plain: ch, style, kind: "char" });
      }
    }
  }
}

function tokenizeForHighlight(source: string): TokenUnit[] {
  const units: TokenUnit[] = [];
  const blocks = source.split(/(\$\$[\s\S]+?\$\$)/g);

  for (const block of blocks) {
    if (!block) continue;
    if (block.startsWith("$$") && block.endsWith("$$") && block.length > 4) {
      units.push({
        raw: block,
        plain: block.slice(2, -2),
        style: null,
        kind: "display-math",
      });
      continue;
    }

    const tokens = block.split(
      /(\[\[[^\]]+?\]\]|==[\s\S]+?==|\{\{[\s\S]+?\}\}|\$[^$\n]+?\$|\n)/g
    );
    for (const tok of tokens) {
      if (!tok) continue;
      if (tok === "\n") {
        units.push({ raw: "\n", plain: "\n", style: null, kind: "nl" });
      } else if (tok.startsWith("[[") && tok.endsWith("]]") && tok.length > 4) {
        units.push({
          raw: tok,
          plain: tok.slice(2, -2).trim(),
          style: null,
          kind: "wiki",
        });
      } else if (tok.startsWith("==") && tok.endsWith("==") && tok.length > 4) {
        let rawInner = tok.slice(2, -2);
        let color: HighlightColor = "y";
        const m = /^([ybpg]):([\s\S]+)$/.exec(rawInner);
        if (m) {
          color = m[1] as HighlightColor;
          rawInner = m[2];
        }
        pushStyledInnerUnits(units, rawInner, color);
      } else if (tok.startsWith("{{") && tok.endsWith("}}") && tok.length > 4) {
        pushStyledInnerUnits(units, tok.slice(2, -2), "cloze");
      } else if (tok.startsWith("$") && tok.endsWith("$") && tok.length > 2) {
        units.push({
          raw: tok,
          plain: tok.slice(1, -1),
          style: null,
          kind: "inline-math",
        });
      } else {
        for (const ch of tok) {
          units.push({ raw: ch, plain: ch, style: null, kind: "char" });
        }
      }
    }
  }

  return units;
}

function findPlainMatchRange(
  plainText: string,
  trimmedTarget: string
): { start: number; end: number } | null {
  const exactIdx = plainText.indexOf(trimmedTarget);
  if (exactIdx !== -1) {
    return { start: exactIdx, end: exactIdx + trimmedTarget.length };
  }

  // Fallback: collapse whitespace runs so multi-line or multi-space DOM selections match
  let normPlain = "";
  const normToOrig: number[] = [];
  let inSpace = false;

  for (let i = 0; i < plainText.length; i++) {
    const ch = plainText[i];
    if (/\s/.test(ch)) {
      if (!inSpace && normPlain.length > 0) {
        normPlain += " ";
        normToOrig.push(i);
        inSpace = true;
      }
    } else {
      normPlain += ch;
      normToOrig.push(i);
      inSpace = false;
    }
  }

  const normTarget = trimmedTarget.replace(/\s+/g, " ").trim();
  if (!normTarget) return null;

  const normIdx = normPlain.indexOf(normTarget);
  if (normIdx === -1) return null;

  const origStart = normToOrig[normIdx];
  const origEnd = normToOrig[normIdx + normTarget.length - 1] + 1;
  return { start: origStart, end: origEnd };
}

function wrapStyledRun(
  runRaw: string,
  style: HighlightColor | "cloze"
): string {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(runRaw);
  if (!m || !m[2]) return runRaw;
  const [, lead, core, trail] = m;
  const wrapped = style === "cloze" ? `{{${core}}}` : `==${style}:${core}==`;
  return `${lead}${wrapped}${trail}`;
}

/**
 * Applies or clears a highlighter marker / inline cloze for a selected phrase
 * inside a source block string, handling single-character, multi-line, and
 * overlapping highlight selections cleanly.
 */
export function applyTextHighlight(
  source: string,
  selectedText: string,
  mode: HighlightColor | "cloze" | "clear"
): string {
  const trimmed = selectedText.trim();
  if (!trimmed) return source;

  const units = tokenizeForHighlight(source);
  let plainText = "";
  const ranges = units.map((u) => {
    const start = plainText.length;
    plainText += u.plain;
    return { start, end: plainText.length };
  });

  const match = findPlainMatchRange(plainText, trimmed);
  if (!match) return source;

  const targetStyle = mode === "clear" ? null : mode;
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    if (u.kind === "nl" || u.kind === "display-math" || u.kind === "wiki") {
      continue;
    }
    if (ranges[i].end > match.start && ranges[i].start < match.end) {
      u.style = targetStyle;
    }
  }

  // Re-serialize consecutive runs sharing the same style
  let out = "";
  let currentStyle: HighlightColor | "cloze" | null = null;
  let buffer = "";

  const flush = () => {
    if (!buffer) return;
    out += currentStyle ? wrapStyledRun(buffer, currentStyle) : buffer;
    buffer = "";
  };

  for (const u of units) {
    if (u.style !== currentStyle) {
      flush();
      currentStyle = u.style;
    }
    buffer += u.raw;
  }
  flush();

  return out;
}
