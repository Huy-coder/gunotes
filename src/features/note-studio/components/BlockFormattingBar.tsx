"use client";

import React from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Link2,
  Plus,
  Sigma,
  Trash2,
} from "lucide-react";
import { HIGHLIGHT_COLORS } from "@/lib/semantic-styles";
import type { BlockType, HighlightColor } from "@/types/study";

const BLOCK_TYPE_PILLS: Array<{ type: BlockType; short: string; title: string }> = [
  { type: "text", short: "Thường", title: "Đoạn văn bản tự do" },
  { type: "def", short: "Đ/N", title: "Định nghĩa" },
  { type: "formula", short: "CT", title: "Công thức" },
  { type: "example", short: "VD", title: "Ví dụ" },
  { type: "trap", short: "Bẫy", title: "Bẫy hay sai" },
];

export function BlockFormattingBar({
  currentType,
  isFirst,
  isLast,
  onWrapSelection,
  onOpenFormula,
  onToggleLinkPicker,
  onChangeBlockType,
  onInsertBelow,
  onMove,
  onDelete,
  onDone,
}: {
  currentType: BlockType;
  isFirst: boolean;
  isLast: boolean;
  onWrapSelection: (mode: HighlightColor | "cloze") => void;
  onOpenFormula: () => void;
  onToggleLinkPicker: () => void;
  onChangeBlockType: (type: BlockType) => void;
  onInsertBelow: () => void;
  onMove: (dir: "up" | "down") => void;
  onDelete: () => void;
  onDone: () => void;
}) {
  return (
    <div
      data-highlight-ui="true"
      className="no-print flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)]/95 px-2 py-1.5 shadow-xs"
    >
      {/* Text formatting: colors, cloze, formula, wiki-link */}
      <div className="flex flex-wrap items-center gap-1">
        {HIGHLIGHT_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => {
              e.stopPropagation();
              onWrapSelection(c.id);
            }}
            title={`Tô ${c.label} đoạn đang chọn`}
            className="h-6 w-6 rounded-full border border-black/15 transition hover:scale-110"
            style={{ backgroundColor: c.cssVar }}
            aria-label={`Tô ${c.label}`}
          />
        ))}
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onWrapSelection("cloze");
          }}
          title="Che chữ thành ô tự kiểm tra {{...}}"
          className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
        >
          Che chữ
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onOpenFormula();
          }}
          title="Chèn / sửa công thức toán fx"
          className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
        >
          <Sigma className="h-3 w-3" />
          <span>fx</span>
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleLinkPicker();
          }}
          title="Chèn liên kết tới trang khác [[...]]"
          className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 font-mono text-[11px] font-semibold text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
        >
          <Link2 className="h-3 w-3" />
          <span className="hidden sm:inline">[[Link]]</span>
        </button>
      </div>

      {/* Block type switcher + structural actions */}
      <div className="flex flex-wrap items-center gap-1">
        <div className="flex items-center rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-desk)] p-0.5">
          {BLOCK_TYPE_PILLS.map((pill) => {
            const active = currentType === pill.type;
            return (
              <button
                key={pill.type}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => {
                  e.stopPropagation();
                  onChangeBlockType(pill.type);
                }}
                title={pill.title}
                className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-semibold transition ${
                  active
                    ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] shadow-2xs"
                    : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                {pill.short}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onInsertBelow();
          }}
          title="Thêm khối viết tiếp bên dưới (Ctrl/Cmd+Enter)"
          className="inline-flex items-center gap-0.5 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
        >
          <Plus className="h-3 w-3" />
          <span>Dưới</span>
        </button>

        <button
          type="button"
          disabled={isFirst}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onMove("up");
          }}
          title="Đưa khối lên"
          className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)] disabled:opacity-30"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={isLast}
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onMove("down");
          }}
          title="Đưa khối xuống"
          className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)] disabled:opacity-30"
        >
          <ArrowDown className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Xóa khối này"
          className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => {
            e.stopPropagation();
            onDone();
          }}
          title="Xong (Esc)"
          className="inline-flex items-center gap-0.5 rounded-lg bg-[var(--accent-primary)] px-2 py-1 font-mono text-[10px] font-semibold text-[var(--accent-primary-fg)]"
        >
          <Check className="h-3 w-3" />
          <span>Xong</span>
        </button>
      </div>
    </div>
  );
}
