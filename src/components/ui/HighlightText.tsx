"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import katex from "katex";
import { Link2 } from "lucide-react";
import { resolveWikiLink } from "@/lib/wiki-links";
import { useAppStore } from "@/store/useAppStore";
import type { HighlightColor } from "@/types/study";

const HIGHLIGHT_VAR_MAP: Record<HighlightColor, string> = {
  y: "var(--hl-yellow)",
  b: "var(--hl-blue)",
  p: "var(--hl-pink)",
  g: "var(--hl-green)",
};

function renderMathHtml(expr: string, displayMode: boolean): string {
  try {
    return katex.renderToString(expr.trim(), {
      displayMode,
      throwOnError: false,
      strict: false,
    });
  } catch {
    return expr;
  }
}

function renderInlineMathSegments(
  text: string,
  keyPrefix: string
): React.ReactNode[] {
  const parts = text.split(/(\$[^$\n]+?\$)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
      const expr = part.slice(1, -1);
      return (
        <span
          key={`${keyPrefix}-m-${idx}`}
          className="inline-block align-middle"
          dangerouslySetInnerHTML={{
            __html: renderMathHtml(expr, false),
          }}
        />
      );
    }
    return <React.Fragment key={`${keyPrefix}-t-${idx}`}>{part}</React.Fragment>;
  });
}

function ClozePill({
  inner,
  defaultHidden,
}: {
  inner: string;
  defaultHidden: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const hidden = defaultHidden && !revealed;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        setRevealed((v) => !v);
      }}
      title={hidden ? "Chạm để mở từ ẩn" : "Chạm để che thử lại"}
      className={`cloze-pill mx-0.5 cursor-pointer ${
        hidden ? "cloze-pill-hidden" : ""
      }`}
    >
      {hidden ? "••••••" : renderInlineMathSegments(inner, "cloze")}
    </button>
  );
}

function WikiLinkPill({
  title,
  disabled = false,
}: {
  title: string;
  disabled?: boolean;
}) {
  const router = useRouter();
  const notes = useAppStore((s) => s.notes);
  const showToast = useAppStore((s) => s.showToast);
  const target = resolveWikiLink(title, notes);

  if (disabled) {
    return (
      <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-[var(--sem-def-border)] bg-[var(--sem-def-bg)]/80 px-1.5 py-0.5 text-[0.9em] font-semibold text-[var(--ink-primary)]">
        <Link2 className="h-3 w-3 shrink-0" />
        <span>{target ? target.title : title}</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (target) {
          router.push(`/binder/${target.binderId}/note/${target.id}`);
        } else {
          showToast(`Chưa tìm thấy trang "${title}" trong sổ.`);
        }
      }}
      title={
        target
          ? `Mở trang liên kết: ${target.title}`
          : `Liên kết tới: ${title}`
      }
      className="mx-0.5 inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--sem-def-border)] bg-[var(--sem-def-bg)]/85 px-1.5 py-0.5 align-baseline text-[0.92em] font-semibold text-[var(--ink-primary)] transition hover:bg-[var(--sem-def-bg)] hover:underline"
    >
      <Link2 className="h-3 w-3 shrink-0" />
      <span>{title}</span>
    </button>
  );
}

/**
 * Renders display KaTeX (`$$...$$`), inline KaTeX (`$...$`), multi-color
 * stationery marker highlights (`==y:...==`, `==b:...==`, `==p:...==`, `==g:...==`, `==...==`),
 * interactive inline Cloze pills (`{{...}}`), and bi-directional Wiki-Links (`[[...]]`).
 */
export function HighlightText({
  text,
  blurMode = false,
  disableWikiNavigation = false,
}: {
  text: string;
  blurMode?: boolean;
  disableWikiNavigation?: boolean;
}) {
  // Split display math $$...$$ across lines first
  const blocks = text.split(/(\$\$[\s\S]+?\$\$)/g);

  return (
    <>
      {blocks.map((block, bIdx) => {
        if (block.startsWith("$$") && block.endsWith("$$") && block.length > 4) {
          const expr = block.slice(2, -2);
          return (
            <div
              key={`dm-${bIdx}`}
              className="my-1.5 overflow-x-auto rounded-lg bg-[var(--bg-elevated)]/45 px-2.5 py-1"
              dangerouslySetInnerHTML={{
                __html: renderMathHtml(expr, true),
              }}
            />
          );
        }

        const lines = block.split("\n");
        return lines.map((line, lIdx) => {
          const tokens = line.split(
            /(==[\s\S]+?==|\{\{[\s\S]+?\}\}|\[\[[^\]]+?\]\])/g
          );
          return (
            <React.Fragment key={`ln-${bIdx}-${lIdx}`}>
              {tokens.map((tok, tIdx) => {
                if (tok.startsWith("==") && tok.endsWith("==") && tok.length > 4) {
                  let raw = tok.slice(2, -2);
                  let color: HighlightColor = "y";
                  const prefixMatch = /^([ybpg]):([\s\S]+)$/.exec(raw);
                  if (prefixMatch) {
                    color = prefixMatch[1] as HighlightColor;
                    raw = prefixMatch[2];
                  }
                  return (
                    <mark
                      key={`hl-${bIdx}-${lIdx}-${tIdx}`}
                      className="marker-stroke"
                      style={
                        {
                          "--marker-color": HIGHLIGHT_VAR_MAP[color],
                        } as React.CSSProperties
                      }
                    >
                      {renderInlineMathSegments(raw, `hl-${bIdx}-${lIdx}-${tIdx}`)}
                    </mark>
                  );
                }

                if (tok.startsWith("{{") && tok.endsWith("}}") && tok.length > 4) {
                  const inner = tok.slice(2, -2);
                  return (
                    <ClozePill
                      key={`cz-${bIdx}-${lIdx}-${tIdx}`}
                      inner={inner}
                      defaultHidden={blurMode}
                    />
                  );
                }

                if (tok.startsWith("[[") && tok.endsWith("]]") && tok.length > 4) {
                  const inner = tok.slice(2, -2).trim();
                  return (
                    <WikiLinkPill
                      key={`wl-${bIdx}-${lIdx}-${tIdx}`}
                      title={inner}
                      disabled={disableWikiNavigation}
                    />
                  );
                }

                return (
                  <React.Fragment key={`tx-${bIdx}-${lIdx}-${tIdx}`}>
                    {renderInlineMathSegments(tok, `tx-${bIdx}-${lIdx}-${tIdx}`)}
                  </React.Fragment>
                );
              })}
              {lIdx < lines.length - 1 && <br />}
            </React.Fragment>
          );
        });
      })}
    </>
  );
}

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
