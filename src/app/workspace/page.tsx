"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  Flame,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { BinderCard } from "@/components/binder/BinderCard";
import { AppShell } from "@/components/layout/AppShell";
import { StudyHeatmapCard } from "@/features/workspace/StudyHeatmapCard";
import { getPaperClass } from "@/lib/semantic-styles";
import { isCardDueNow } from "@/lib/srs/sm2";
import { useAppStore } from "@/store/useAppStore";
import type { BinderCoverTone, StickerId } from "@/types/study";

const COVER_TONES: Array<{ id: BinderCoverTone; label: string; var: string }> = [
  { id: "blue", label: "Dusty Blue", var: "var(--binder-blue-bg)" },
  { id: "sage", label: "Sage Green", var: "var(--binder-sage-bg)" },
  { id: "sand", label: "Warm Sand", var: "var(--binder-sand-bg)" },
  { id: "lavender", label: "Lavender", var: "var(--binder-lavender-bg)" },
  {
    id: "terracotta",
    label: "Terracotta",
    var: "var(--binder-terracotta-bg)",
  },
];

export default function WorkspacePage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const binders = useAppStore((s) => s.binders);
  const notes = useAppStore((s) => s.notes);
  const flashcards = useAppStore((s) => s.flashcards);
  const addBinder = useAppStore((s) => s.addBinder);
  const openCustomize = useAppStore((s) => s.openCustomize);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const showToast = useAppStore((s) => s.showToast);

  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newTag, setNewTag] = useState("#hoc-tap");
  const [newTone, setNewTone] = useState<BinderCoverTone>("blue");
  const [newSticker, setNewSticker] = useState<StickerId>("sparkle");

  const dueTotal = flashcards.filter((f) => isCardDueNow(f)).length;
  const recentNotes = [...notes]
    .sort((a, b) => a.updatedMinutesAgo - b.updatedMinutesAgo)
    .slice(0, 3);

  const weeklyHours = Math.floor(user.weeklyFocusMinutes / 60);
  const weeklyMins = user.weeklyFocusMinutes % 60;

  const handleCreateBinder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created = addBinder({
      title: newTitle,
      subtitle: newSubtitle || "Sổ chuyên đề mới",
      subjectTag: newTag.startsWith("#") ? newTag : `#${newTag}`,
      coverTone: newTone,
      starterSticker: newSticker,
    });
    setCreateOpen(false);
    setNewTitle("");
    setNewSubtitle("");
    showToast(`Đã tạo cuốn sổ "${created.title}"`);
    router.push(`/binder/${created.id}`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-8 sm:pt-8">
        {/* Top Greeting & Study Pulse */}
        <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-mono text-xs text-[var(--ink-muted)]">
              CHÀO BUỔI TỐI, {user.displayName.toUpperCase()}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
              Giá sách của bạn
            </h1>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {binders.length === 0 && notes.length === 0 ? (
                "Chào mừng đến GuNotes! Hãy tạo cuốn sổ đầu tiên để bắt đầu ghi chép."
              ) : dueTotal > 0 ? (
                <>
                  Hôm nay bạn có{" "}
                  <Link
                    href="/review"
                    className="font-semibold text-[var(--ink-primary)] underline decoration-[var(--sem-trap-border)] underline-offset-4"
                  >
                    {dueTotal} thẻ cần ôn
                  </Link>{" "}
                  để giữ vững chuỗi học bá.
                </>
              ) : (
                "Bạn đã hoàn thành toàn bộ thẻ ôn tập hôm nay!"
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setCommandPaletteOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-muted)] lg:hidden"
              aria-label="Tìm kiếm"
            >
              <Search className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 font-mono text-xs font-medium">
              <Flame className="h-3.5 w-3.5 text-[#C96458]" />
              <span>{user.streakDays} ngày</span>
            </div>

            <div className="hidden items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 font-mono text-xs font-medium sm:flex">
              <Clock className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
              <span>
                {weeklyHours}h {weeklyMins}p tuần này
              </span>
            </div>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90 sm:text-sm"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo sổ mới</span>
            </button>
          </div>
        </header>

        {/* Quick Resume Strip */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
              Tiếp tục ghi chép
            </h2>
            <Link
              href="/review"
              className="font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
            >
              Ôn nhanh {dueTotal} thẻ →
            </Link>
          </div>

          {recentNotes.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible">
              {recentNotes.map((note) => {
                const binder = binders.find((b) => b.id === note.binderId);
                return (
                  <Link
                    key={note.id}
                    href={`/binder/${note.binderId}/note/${note.id}`}
                    className={`${getPaperClass(
                      note.paperStyle
                    )} paper-shadow flex min-w-[250px] flex-col justify-between rounded-2xl border border-[var(--border-hairline)] p-4 transition hover:-translate-y-0.5 sm:min-w-0`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="max-w-[140px] truncate rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-[var(--ink-muted)]">
                          {binder?.title ?? "Sổ"}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] whitespace-nowrap text-[var(--ink-muted)]">
                          {note.updatedAt}
                        </span>
                      </div>
                      <h3 className="mt-2.5 line-clamp-1 text-sm font-semibold">
                        {note.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--ink-muted)]">
                        {note.summary}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="paper-dot paper-shadow flex flex-col items-start justify-between gap-4 rounded-2xl border border-dashed border-[var(--border-hairline)] p-5 sm:flex-row sm:items-center">
              <div>
                <h3 className="text-sm font-semibold">
                  Bàn học của bạn đang trống sạch sẽ
                </h3>
                <p className="mt-1 text-xs text-[var(--ink-muted)]">
                  Tạo cuốn sổ bìa còng đầu tiên hoặc chọn gu học tập phù hợp với bạn.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Tạo sổ đầu tiên</span>
                </button>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-medium hover:border-[var(--ink-primary)]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Thiết lập gu học tập</span>
                </Link>
              </div>
            </div>
          )}
        </section>

        {/* Study Activity Heatmap & SRS Forecast */}
        <StudyHeatmapCard />

        {/* Main Ring-Binder Shelf Grid */}
        <section className="mt-8">
          <div className="mb-3.5 flex items-center justify-between">
            <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
              Sổ tay bìa còng ({binders.length})
            </h2>
            <span className="hidden items-center gap-1 font-mono text-[11px] text-[var(--ink-muted)] sm:flex">
              <Sparkles className="h-3 w-3" />
              Hover vào bìa sổ để đổi màu & dán sticker
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {binders.map((binder) => {
              const noteCount = notes.filter(
                (n) => n.binderId === binder.id
              ).length;
              const dueCount = flashcards.filter(
                (f) => f.binderId === binder.id && f.isDue
              ).length;
              return (
                <BinderCard
                  key={binder.id}
                  binder={binder}
                  noteCount={noteCount}
                  dueFlashcardCount={dueCount}
                  onCustomize={(id) => openCustomize({ kind: "binder", id })}
                />
              );
            })}

            {/* Add Binder Slot */}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-[14px] border border-dashed border-[var(--border-hairline)] bg-[var(--bg-paper)]/50 p-4 text-center text-[var(--ink-muted)] transition hover:border-[var(--ink-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--ink-primary)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]">
                <Plus className="h-5 w-5" />
              </div>
              <span className="text-xs font-semibold">Thêm cuốn sổ mới</span>
              <span className="font-mono text-[10px]">Chọn màu & sticker</span>
            </button>
          </div>
        </section>
      </div>

      {/* Create Binder Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 backdrop-blur-[1px]"
          onClick={() => setCreateOpen(false)}
        >
          <form
            onSubmit={handleCreateBinder}
            onClick={(e) => e.stopPropagation()}
            className="paper-shadow w-full max-w-md space-y-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-6 text-[var(--ink-primary)]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold">Tạo sổ bìa còng mới</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <label className="mb-1 block font-mono text-[11px] text-[var(--ink-muted)]">
                TÊN MÔN HỌC / CHUYÊN ĐỀ
              </label>
              <input
                autoFocus
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="VD: Xác suất thống kê, Tiếng Anh B2..."
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--ink-primary)]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block font-mono text-[11px] text-[var(--ink-muted)]">
                  MÔ TẢ NGẮN
                </label>
                <input
                  value={newSubtitle}
                  onChange={(e) => setNewSubtitle(e.target.value)}
                  placeholder="Kỳ 2 • Năm nhất"
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2 text-sm outline-none focus:border-[var(--ink-primary)]"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[11px] text-[var(--ink-muted)]">
                  TAG
                </label>
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="#hoc-tap"
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--ink-primary)]"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
                MÀU BÌA
              </div>
              <div className="flex gap-2">
                {COVER_TONES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setNewTone(t.id)}
                    className={`h-9 flex-1 rounded-xl border ${
                      newTone === t.id
                        ? "border-[var(--ink-primary)] ring-2 ring-[var(--ink-primary)]/20"
                        : "border-[var(--border-hairline)]"
                    }`}
                    style={{ backgroundColor: t.var }}
                    title={t.label}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
                STICKER MỞ MÀN
              </div>
              <div className="flex gap-2">
                {(["sparkle", "coffee", "bookmark", "cat"] as StickerId[]).map(
                  (st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewSticker(st)}
                      className={`rounded-xl border px-3 py-1.5 font-mono text-xs ${
                        newSticker === st
                          ? "border-[var(--ink-primary)] bg-[var(--bg-paper)] font-semibold"
                          : "border-[var(--border-hairline)]"
                      }`}
                    >
                      {st}
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-full border border-[var(--border-hairline)] px-4 py-2 text-xs font-medium"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-full bg-[var(--accent-primary)] px-5 py-2 text-xs font-semibold text-[var(--accent-primary-fg)]"
              >
                Tạo sổ ngay
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
