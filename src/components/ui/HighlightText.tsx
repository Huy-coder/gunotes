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

/**
 * Applies or clears a highlighter marker / inline cloze for a selected plain phrase
 * inside a source block string.
 */
export function applyTextHighlight(
  source: string,
  selectedText: string,
  mode: HighlightColor | "cloze" | "clear"
): string {
  const trimmed = selectedText.trim();
  if (!trimmed || trimmed.length < 2) return source;

  // Strip existing markers surrounding the phrase if user re-colors or clears
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existingWrapRegex = new RegExp(
    `(?:==(?:[ybpg]:)?|\\{\\{)\\s*(${escaped})\\s*(?:==|\\}\\})`
  );

  if (mode === "clear") {
    if (existingWrapRegex.test(source)) {
      return source.replace(existingWrapRegex, "$1");
    }
    return source;
  }

  const wrapped =
    mode === "cloze" ? `{{${trimmed}}}` : `==${mode}:${trimmed}==`;

  if (existingWrapRegex.test(source)) {
    return source.replace(existingWrapRegex, wrapped);
  }

  const idx = source.indexOf(trimmed);
  if (idx !== -1) {
    return (
      source.slice(0, idx) + wrapped + source.slice(idx + trimmed.length)
    );
  }

  return source;
}
