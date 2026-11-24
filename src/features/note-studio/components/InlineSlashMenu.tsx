"use client";

import React from "react";
import { GitBranch, ImagePlus, Sigma } from "lucide-react";
import type { SlashCommandItem } from "@/features/note-studio/utils/note-studio-helpers";
import { SEMANTIC_META } from "@/lib/semantic-styles";

export function InlineSlashMenu({
  items,
  activeIndex,
  onSelect,
}: {
  items: SlashCommandItem[];
  activeIndex: number;
  onSelect: (item: SlashCommandItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div
      data-highlight-ui="true"
      className="no-print mt-1.5 max-h-64 w-full max-w-sm overflow-y-auto rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-1.5 shadow-xl"
    >
      <div className="px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
        Chèn hoặc đổi khối nhanh (↑↓ Enter)
      </div>
      {items.map((item, idx) => {
        const isSelected = idx === activeIndex;
        const meta =
          item.action.kind === "block"
            ? SEMANTIC_META[item.action.blockType]
            : null;
        return (
          <button
            key={item.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(item);
            }}
            className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left text-xs transition ${
              isSelected
                ? "bg-[var(--bg-desk)] text-[var(--ink-primary)]"
                : "text-[var(--ink-primary)] hover:bg-[var(--bg-desk)]/70"
            }`}
          >
            {meta ? (
              <span
                className="h-3.5 w-3.5 shrink-0 rounded-full border"
                style={{
                  backgroundColor: meta.bgVar,
                  borderColor: meta.borderVar,
                }}
              />
            ) : item.action.kind === "formula" ? (
              <Sigma className="h-3.5 w-3.5 shrink-0 text-[var(--ink-primary)]" />
            ) : item.action.kind === "image" ? (
              <ImagePlus className="h-3.5 w-3.5 shrink-0 text-[var(--ink-primary)]" />
            ) : (
              <GitBranch className="h-3.5 w-3.5 shrink-0 text-[var(--ink-primary)]" />
            )}
            <span className="min-w-0 flex-1">
              <strong className="font-semibold">{item.label}</strong>
              <span className="ml-2 text-[11px] text-[var(--ink-muted)]">
                {item.description}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
