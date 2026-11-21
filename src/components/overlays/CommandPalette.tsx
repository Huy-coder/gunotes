"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  EyeOff,
  FilePlus2,
  Flame,
  Palette,
  Search,
  Sparkles,
  Timer,
  X,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";

export function CommandPalette() {
  const router = useRouter();
  const open = useAppStore((s) => s.commandPaletteOpen);
  const setOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const binders = useAppStore((s) => s.binders);
  const notes = useAppStore((s) => s.notes);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const blurMode = useAppStore((s) => s.blurMode);
  const toggleBlurMode = useAppStore((s) => s.toggleBlurMode);
  const addNote = useAppStore((s) => s.addNote);
  const showToast = useAppStore((s) => s.showToast);

  const [query, setQuery] = useState("");

  const filteredNotes = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes.slice(0, 5);
    return notes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.tags.some((t) => t.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [notes, query]);

  const filteredBinders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return binders.slice(0, 4);
    return binders.filter((b) => b.title.toLowerCase().includes(q));
  }, [binders, query]);

  if (!open) return null;

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 pt-16 backdrop-blur-[2px] sm:pt-24"
      onClick={close}
    >
      <div
        className="paper-shadow w-full max-w-xl overflow-hidden rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-[var(--border-hairline)] px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-[var(--ink-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm ghi chú, cuốn sổ hoặc gõ lệnh nhanh..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--ink-muted)]"
          />
          <button
            onClick={close}
            className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
            aria-label="Đóng tìm kiếm"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {/* Quick Actions */}
          <div className="px-2 py-1.5 font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
            Thao tác nhanh
          </div>
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            <button
              onClick={() => {
                const targetBinder = binders[0];
                if (targetBinder) {
                  const created = addNote(targetBinder.id);
                  close();
                  router.push(`/binder/${targetBinder.id}/note/${created.id}`);
                  showToast("Đã tạo trang ghi chú Cornell mới!");
                }
              }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-desk)]"
            >
              <FilePlus2 className="h-4 w-4 text-[var(--ink-muted)]" />
              <span>Tạo trang ghi chú mới</span>
            </button>
            <button
              onClick={() => {
                toggleBlurMode();
                showToast(
                  !blurMode
                    ? "Đã bật chế độ Che để nhớ (Blur)"
                    : "Đã tắt chế độ Che bài"
                );
                close();
              }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-desk)]"
            >
              <EyeOff className="h-4 w-4 text-[var(--ink-muted)]" />
              <span>
                {blurMode ? "Tắt Blur Recall" : "Bật Che để nhớ (Blur)"}
              </span>
            </button>
            <button
              onClick={() => {
                const next =
                  theme === "minimal-paper" ? "cyber-kit" : "minimal-paper";
                setTheme(next);
                showToast(
                  next === "cyber-kit"
                    ? "Đã đổi sang Cyber-Kit Dark"
                    : "Đã về Minimal Paper"
                );
                close();
              }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-desk)]"
            >
              <Palette className="h-4 w-4 text-[var(--ink-muted)]" />
              <span>
                Đổi gu:{" "}
                {theme === "minimal-paper"
                  ? "Cyber-Kit Dark"
                  : "Minimal Paper"}
              </span>
            </button>
            <button
              onClick={() => {
                close();
                router.push("/focus");
              }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-desk)]"
            >
              <Timer className="h-4 w-4 text-[var(--ink-muted)]" />
              <span>Vào Phòng Tập trung</span>
            </button>
            <button
              onClick={() => {
                close();
                router.push("/review");
              }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-desk)]"
            >
              <Flame className="h-4 w-4 text-[var(--ink-muted)]" />
              <span>Ôn tập Flashcards</span>
            </button>
            <button
              onClick={() => {
                close();
                router.push("/settings");
              }}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-desk)]"
            >
              <Sparkles className="h-4 w-4 text-[var(--ink-muted)]" />
              <span>Độ giao diện & Stickers</span>
            </button>
          </div>

          {/* Binders */}
          {filteredBinders.length > 0 && (
            <>
              <div className="mt-3 px-2 py-1.5 font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
                Giá sách bìa còng
              </div>
              <div className="space-y-0.5">
                {filteredBinders.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      close();
                      router.push(`/binder/${b.id}`);
                    }}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-desk)]"
                  >
                    <span className="flex items-center gap-2.5 font-medium">
                      <BookOpen className="h-4 w-4 text-[var(--ink-muted)]" />
                      {b.title}
                    </span>
                    <span className="font-mono text-xs text-[var(--ink-muted)]">
                      {b.subjectTag}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Notes */}
          {filteredNotes.length > 0 && (
            <>
              <div className="mt-3 px-2 py-1.5 font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
                Trang ghi chú
              </div>
              <div className="space-y-0.5">
                {filteredNotes.map((n) => {
                  const binder = binders.find((b) => b.id === n.binderId);
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        close();
                        router.push(`/binder/${n.binderId}/note/${n.id}`);
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-[var(--bg-desk)]"
                    >
                      <span className="truncate font-medium">{n.title}</span>
                      <span className="ml-3 shrink-0 font-mono text-xs text-[var(--ink-muted)]">
                        {binder?.title ?? "Sổ"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 py-2 font-mono text-[11px] text-[var(--ink-muted)]">
          <span>Click hoặc dùng phím tắt Ctrl/Cmd + K</span>
          <span>ESC để đóng</span>
        </div>
      </div>
    </div>
  );
}
