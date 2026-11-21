"use client";

import React from "react";
import Link from "next/link";
import { Link2, Network } from "lucide-react";
import type { MobileTab } from "@/features/note-studio/utils/note-studio-helpers";
import type { getBacklinks } from "@/lib/wiki-links";
import type { Note, NoteTemplate } from "@/types/study";

export function NoteBacklinksSection({
  note,
  activeTemplate,
  mobileTab,
  backlinks,
  onUpdateSummary,
  onOpenVisualize,
}: {
  note: Note;
  activeTemplate: NoteTemplate;
  mobileTab: MobileTab;
  backlinks: ReturnType<typeof getBacklinks>;
  onUpdateSummary: (summary: string) => void;
  onOpenVisualize: () => void;
}) {
  const showSummary =
    activeTemplate !== "cornell" ||
    mobileTab === "all" ||
    mobileTab === "summary";

  return (
    <>
      {showSummary && (
        <div className="mt-7 border-t border-[var(--border-hairline)] pt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
              {activeTemplate === "feynman"
                ? "GIẢI THÍCH ĐỜI THƯỜNG NHƯ DẠY NGƯỜI MỚI"
                : "TÓM TẮT 3 DÒNG CUỐI TRANG"}
            </span>
            <span className="font-mono text-[10px] text-[var(--ink-muted)]">
              Tự diễn đạt lại
            </span>
          </div>
          <textarea
            rows={2}
            value={note.summary}
            onChange={(e) => onUpdateSummary(e.target.value)}
            className="w-full resize-none rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/65 p-3 text-sm leading-relaxed outline-none focus:border-[var(--ink-primary)]"
          />
        </div>
      )}

      {backlinks.length > 0 && (
        <div className="no-print mt-6 rounded-2xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-elevated)]/60 p-4">
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-wider text-[var(--ink-muted)] uppercase">
              <Link2 className="h-3.5 w-3.5" />
              <span>
                LIÊN KẾT NGƯỢC (BACKLINKS • {backlinks.length} TRANG NHẮC TỚI)
              </span>
            </span>
            <button
              type="button"
              onClick={onOpenVisualize}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-0.5 font-mono text-[10px] font-semibold hover:border-[var(--ink-primary)]"
            >
              <Network className="h-3 w-3" />
              <span>Xem trên bản đồ Visualize</span>
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {backlinks.map(({ note: refNote, excerpt }) => (
              <Link
                key={refNote.id}
                href={`/binder/${refNote.binderId}/note/${refNote.id}`}
                className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3 transition hover:border-[var(--ink-primary)]"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <Link2 className="h-3 w-3 shrink-0 text-[var(--ink-muted)]" />
                  <span className="truncate">{refNote.title}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-[var(--ink-muted)]">
                  {excerpt}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
