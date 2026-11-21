"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Copy,
  Layers,
  List,
  Network,
  Palette,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { BinderGraphView } from "@/components/graph/BinderGraphView";
import { AppShell } from "@/components/layout/AppShell";
import { StickerArt } from "@/components/stickers/StickerArt";
import {
  getBinderToneVars,
  NOTE_TEMPLATE_META,
  SEMANTIC_META,
} from "@/lib/semantic-styles";
import { useAppStore } from "@/store/useAppStore";
import type { NoteTemplate } from "@/types/study";

type FilterType = "all" | "formula" | "trap" | "def";

export default function BinderIndexPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const binderId = params?.id ?? "";

  const binders = useAppStore((s) => s.binders);
  const notes = useAppStore((s) => s.notes);
  const flashcards = useAppStore((s) => s.flashcards);
  const addNote = useAppStore((s) => s.addNote);
  const duplicateNote = useAppStore((s) => s.duplicateNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const openCustomize = useAppStore((s) => s.openCustomize);
  const showToast = useAppStore((s) => s.showToast);

  const [viewMode, setViewMode] = useState<"list" | "graph">("list");
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(
    null
  );

  const binder = binders.find((b) => b.id === binderId) ?? binders[0];
  const binderNotes = useMemo(
    () => notes.filter((n) => n.binderId === binder?.id),
    [notes, binder?.id]
  );

  const filteredNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return binderNotes.filter((note) => {
      const matchesQuery =
        !q ||
        note.title.toLowerCase().includes(q) ||
        note.summary.toLowerCase().includes(q) ||
        note.tags.some((t) => t.toLowerCase().includes(q));
      const matchesFilter =
        filter === "all" || note.blocks.some((b) => b.type === filter);
      return matchesQuery && matchesFilter;
    });
  }, [binderNotes, filter, search]);

  if (!binder) {
    return (
      <AppShell>
        <div className="p-8 text-center">
          <p className="text-sm text-[var(--ink-muted)]">Không tìm thấy cuốn sổ.</p>
          <Link
            href="/workspace"
            className="mt-4 inline-block rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)]"
          >
            Quay về Giá sách
          </Link>
        </div>
      </AppShell>
    );
  }

  const tone = getBinderToneVars(binder.coverTone);
  const binderFlashcards = flashcards.filter((f) => f.binderId === binder.id);
  const dueCount = binderFlashcards.filter((f) => f.isDue).length;
  const primarySticker = binder.stickers[0]?.stickerId;

  const handleCreateNote = (template: NoteTemplate = "cornell") => {
    const created = addNote(binder.id, undefined, undefined, template);
    const tplLabel =
      NOTE_TEMPLATE_META.find((t) => t.id === template)?.label ?? "Cornell";
    setTemplatePickerOpen(false);
    showToast(`Đã mở trang ghi chú theo mẫu ${tplLabel}`);
    router.push(`/binder/${binder.id}/note/${created.id}`);
  };

  return (
    <AppShell>
      {/* Tactile Binder Cover Header */}
      <section
        className="border-b px-4 pt-5 pb-6 sm:px-8 sm:pt-7"
        style={{
          backgroundColor: tone.bg,
          borderColor: tone.border,
          backgroundImage:
            "radial-gradient(var(--grid-line) 1.2px, transparent 1.2px)",
          backgroundSize: "18px 18px",
        }}
      >
        <div className="mx-auto max-w-4xl">
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/90 px-3 py-1 text-xs font-medium text-[var(--ink-primary)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Giá sách</span>
            </Link>

            <button
              type="button"
              onClick={() => openCustomize({ kind: "binder", id: binder.id })}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/90 px-3 py-1 text-xs font-medium"
            >
              <Palette className="h-3.5 w-3.5" />
              <span>Độ bìa & Sticker</span>
            </button>
          </div>

          <div className="mt-5 flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-xs text-[var(--ink-muted)]">
                {binder.subjectTag}
              </span>
              <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                {binder.title}
              </h1>
              <p className="mt-1 font-mono text-xs text-[var(--ink-muted)]">
                {binderNotes.length} trang ghi chép • {binderFlashcards.length}{" "}
                Flashcards • {binder.masteryPercent}% đã thuộc
              </p>
            </div>
            {primarySticker && <StickerArt id={primarySticker} size={52} />}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <Link
              href={`/review?binder=${binder.id}`}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>
                {dueCount > 0
                  ? `Ôn ${dueCount} thẻ đến hạn`
                  : "Ôn lại thẻ môn này"}
              </span>
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setTemplatePickerOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-semibold text-[var(--ink-primary)] transition hover:border-[var(--ink-muted)]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Trang ghi chú mới</span>
              </button>

              {templatePickerOpen && (
                <div className="paper-shadow absolute top-11 left-0 z-40 w-72 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-2">
                  <div className="px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                    Chọn phương pháp ghi chú
                  </div>
                  {NOTE_TEMPLATE_META.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => handleCreateNote(tpl.id)}
                      className="block w-full rounded-xl px-2.5 py-2 text-left transition hover:bg-[var(--bg-desk)]"
                    >
                      <div className="text-xs font-semibold">{tpl.label}</div>
                      <div className="text-[11px] text-[var(--ink-muted)]">
                        {tpl.shortDesc}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                setViewMode((v) => (v === "graph" ? "list" : "graph"))
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 font-mono text-xs font-bold transition ${
                viewMode === "graph"
                  ? "border-[var(--ink-primary)] bg-[var(--hl-yellow)] text-[var(--ink-primary)] shadow-2xs"
                  : "border-[var(--ink-primary)]/40 bg-[var(--hl-yellow)]/80 text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span>Visualize Sổ</span>
            </button>
          </div>
        </div>
      </section>

      {/* Binder Index Body */}
      <div className="mx-auto max-w-4xl px-4 pt-5 pb-24 sm:px-8">
        {/* View Mode Switcher + Search & Filter */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-0.5">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                viewMode === "list"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Danh sách trang</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("graph")}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                viewMode === "graph"
                  ? "bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              <Network className="h-3.5 w-3.5" />
              <span>Visualize Sổ</span>
            </button>
          </div>

          {viewMode === "list" && (
            <div className="relative w-full sm:w-56">
              <Search className="absolute top-2.5 left-3 h-3.5 w-3.5 text-[var(--ink-muted)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm trang trong sổ..."
                className="w-full rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] py-1.5 pr-3 pl-8 text-xs outline-none focus:border-[var(--ink-primary)]"
              />
            </div>
          )}
        </div>

        {viewMode === "graph" ? (
          <BinderGraphView
            binder={binder}
            notes={binderNotes}
            allNotes={notes}
            onClose={() => setViewMode("list")}
          />
        ) : (
          <>
            {/* Filter Chips */}
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {(
                [
                  { id: "all", label: "Tất cả" },
                  { id: "def", label: "Định nghĩa" },
                  { id: "formula", label: "Có công thức" },
                  { id: "trap", label: "Bẫy hay sai" },
                ] as Array<{ id: FilterType; label: string }>
              ).map((chip) => {
                const active = filter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setFilter(chip.id)}
                    className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                      active
                        ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                        : "border-[var(--border-hairline)] bg-[var(--bg-paper)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                    }`}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>

            {/* Loose-leaf Notes List */}
            <div className="mt-4 space-y-3">
              {filteredNotes.length === 0 ? (
                <div className="paper-dot rounded-2xl border border-dashed border-[var(--border-hairline)] p-8 text-center">
                  <p className="text-sm font-medium">
                    Chưa có trang ghi chú nào khớp bộ lọc.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleCreateNote("cornell")}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)]"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Tạo trang Cornell đầu tiên</span>
                  </button>
                </div>
              ) : (
                filteredNotes.map((note) => {
                  const uniqueTypes = Array.from(
                    new Set(note.blocks.map((b) => b.type))
                  );
                  return (
                    <div
                      key={note.id}
                      className="paper-shadow rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--ink-muted)] sm:p-5"
                    >
                      <Link
                        href={`/binder/${binder.id}/note/${note.id}`}
                        className="block"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-base font-bold">
                                {note.title}
                              </h3>
                              <div className="flex shrink-0 items-center gap-1">
                                {uniqueTypes.map((t) => (
                                  <span
                                    key={t}
                                    className="h-2.5 w-2.5 rounded-full border border-black/10"
                                    style={{
                                      backgroundColor: SEMANTIC_META[t].borderVar,
                                    }}
                                    title={SEMANTIC_META[t].badge}
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[var(--ink-muted)] sm:text-sm">
                              {note.summary}
                            </p>
                          </div>
                          {note.headerStickerId && (
                            <StickerArt id={note.headerStickerId} size={34} />
                          )}
                        </div>
                      </Link>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] pt-2.5 font-mono text-[11px] text-[var(--ink-muted)]">
                        <div className="flex flex-wrap gap-2">
                          <span>
                            {NOTE_TEMPLATE_META.find(
                              (t) => t.id === note.template
                            )?.label ?? "Cornell"}{" "}
                            • {note.blocks.length} khối
                          </span>
                          {note.tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="hidden sm:inline">
                            Cập nhật: {note.updatedAt}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const copy = duplicateNote(note.id);
                              if (copy) showToast("Đã nhân bản trang ghi chú!");
                            }}
                            title="Nhân bản trang"
                            className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          {confirmDeleteNoteId === note.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  deleteNote(note.id);
                                  setConfirmDeleteNoteId(null);
                                  showToast("Đã xóa trang ghi chú");
                                }}
                                className="rounded-full border px-2 py-0.5 text-[10px] font-bold text-[var(--ink-primary)]"
                                style={{
                                  backgroundColor: "var(--sem-trap-bg)",
                                  borderColor: "var(--sem-trap-border)",
                                }}
                              >
                                Xóa?
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteNoteId(null)}
                                className="rounded-full px-1.5 py-0.5 text-[10px]"
                              >
                                Hủy
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteNoteId(note.id)}
                              title="Xóa trang"
                              className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
