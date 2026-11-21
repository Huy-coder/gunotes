"use client";

import React from "react";
import { Plus, X } from "lucide-react";

export function EditableChipList({
  items,
  placeholder,
  onChange,
}: {
  items: string[];
  placeholder: string;
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-1.5">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="flex items-center gap-1 rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/85 px-2 py-1"
        >
          <input
            value={item}
            onChange={(e) => {
              const next = [...items];
              next[idx] = e.target.value;
              onChange(next);
            }}
            className="min-w-0 flex-1 bg-transparent text-xs outline-none"
          />
          {items.length > 1 && (
            <button
              type="button"
              onClick={() => onChange(items.filter((_, i) => i !== idx))}
              className="shrink-0 text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              aria-label="Xóa ý"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, placeholder])}
        className="inline-flex items-center gap-1 font-mono text-[10px] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
      >
        <Plus className="h-3 w-3" />
        <span>Thêm ý</span>
      </button>
    </div>
  );
}
