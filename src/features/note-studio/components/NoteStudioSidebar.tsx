"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, FilePlus2, PanelLeftClose } from "lucide-react";
import type { Binder, Note } from "@/types/study";

export function NoteStudioSidebar({
  binder,
  binderNotes,
  activeNoteId,
  onClose,
  onCreateNote,
}: {
  binder: Binder;
  binderNotes: Note[];
  activeNoteId: string;
  onClose: () => void;
  onCreateNote: () => void;
}) {
  return (
    <aside className="no-print sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-[var(--border-hairline)] bg-[var(--bg-desk)]/70 p-4 xl:flex">
      <div className="flex items-center justify-between">
        <Link
          href={`/binder/${binder.id}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--ink-primary)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="truncate">{binder.title}</span>
        </Link>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-paper)]"
          title="Thu gọn mục lục sổ"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <span className="font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
          Trang trong sổ ({binderNotes.length})
        </span>
        <button
          type="button"
          onClick={onCreateNote}
          className="rounded-md p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--ink-primary)]"
          title="Trang mới"
        >
          <FilePlus2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
        {binderNotes.map((n) => {
          const active = n.id === activeNoteId;
          return (
            <Link
              key={n.id}
              href={`/binder/${binder.id}/note/${n.id}`}
              className={`block rounded-xl px-3 py-2 text-xs transition ${
                active
                  ? "border border-[var(--border-hairline)] bg-[var(--bg-elevated)] font-semibold text-[var(--ink-primary)] shadow-2xs"
                  : "text-[var(--ink-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--ink-primary)]"
              }`}
            >
              <div className="line-clamp-2">{n.title}</div>
              <div className="mt-0.5 font-mono text-[10px] opacity-75">
                {n.updatedAt}
              </div>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
