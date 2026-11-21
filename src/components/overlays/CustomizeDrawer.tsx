"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, Copy, Sparkles, Trash2, X } from "lucide-react";
import { STICKER_CATALOG, StickerArt } from "@/components/stickers/StickerArt";
import { PAPER_STYLE_META } from "@/lib/semantic-styles";
import { useAppStore } from "@/store/useAppStore";
import type {
  BinderCoverTone,
  ThemeId,
} from "@/types/study";

const BINDER_TONES: Array<{
  id: BinderCoverTone;
  label: string;
  swatchVar: string;
}> = [
  { id: "blue", label: "Dusty Blue", swatchVar: "var(--binder-blue-bg)" },
  { id: "sage", label: "Sage Green", swatchVar: "var(--binder-sage-bg)" },
  { id: "sand", label: "Warm Sand", swatchVar: "var(--binder-sand-bg)" },
  { id: "lavender", label: "Lavender", swatchVar: "var(--binder-lavender-bg)" },
  {
    id: "terracotta",
    label: "Terracotta",
    swatchVar: "var(--binder-terracotta-bg)",
  },
];

const THEMES: Array<{ id: ThemeId; label: string }> = [
  { id: "minimal-paper", label: "Minimal Paper" },
  { id: "cyber-kit", label: "Cyber-Kit Dark" },
  { id: "blueprint", label: "Blueprint Lab" },
  { id: "cozy-lofi", label: "Cozy Lo-fi" },
];

export function CustomizeDrawer() {
  const router = useRouter();
  const pathname = usePathname();
  const target = useAppStore((s) => s.customizeTarget);
  const close = useAppStore((s) => s.closeCustomize);
  const binders = useAppStore((s) => s.binders);
  const notes = useAppStore((s) => s.notes);
  const user = useAppStore((s) => s.user);
  const theme = useAppStore((s) => s.theme);
  const noteFont = useAppStore((s) => s.noteFont);

  const setTheme = useAppStore((s) => s.setTheme);
  const setNoteFont = useAppStore((s) => s.setNoteFont);
  const updateBinderCover = useAppStore((s) => s.updateBinderCover);
  const deleteBinder = useAppStore((s) => s.deleteBinder);
  const toggleBinderSticker = useAppStore((s) => s.toggleBinderSticker);
  const updateNote = useAppStore((s) => s.updateNote);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const duplicateNote = useAppStore((s) => s.duplicateNote);
  const showToast = useAppStore((s) => s.showToast);

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    setConfirmDelete(false);
  }, [target]);

  if (!target) return null;

  const activeBinder =
    target.kind === "binder"
      ? binders.find((b) => b.id === target.id)
      : undefined;
  const activeNote =
    target.kind === "note" ? notes.find((n) => n.id === target.id) : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/25 backdrop-blur-[1px] sm:items-stretch"
      onClick={close}
    >
      <aside
        className="paper-shadow flex max-h-[85vh] w-full flex-col rounded-t-2xl border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] sm:max-h-full sm:w-[370px] sm:rounded-none sm:border-t-0 sm:border-l"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-hairline)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--ink-muted)]" />
            <h2 className="text-sm font-semibold">
              {target.kind === "binder"
                ? `Độ bìa: ${activeBinder?.title ?? "Sổ"}`
                : "Độ trang giấy & Sticker"}
            </h2>
          </div>
          <button
            onClick={close}
            className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {target.kind === "binder" && activeBinder && (
            <>
              <div className="space-y-2.5">
                <p className="font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
                  Thông tin sổ
                </p>
                <input
                  value={activeBinder.title}
                  onChange={(e) =>
                    updateBinderCover(activeBinder.id, {
                      title: e.target.value,
                    })
                  }
                  placeholder="Tên cuốn sổ..."
                  className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2 text-xs font-semibold outline-none focus:border-[var(--ink-primary)]"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={activeBinder.subtitle}
                    onChange={(e) =>
                      updateBinderCover(activeBinder.id, {
                        subtitle: e.target.value,
                      })
                    }
                    placeholder="Mô tả ngắn..."
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2 text-xs outline-none focus:border-[var(--ink-primary)]"
                  />
                  <input
                    value={activeBinder.subjectTag}
                    onChange={(e) =>
                      updateBinderCover(activeBinder.id, {
                        subjectTag: e.target.value,
                      })
                    }
                    placeholder="#tag-mon"
                    className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--ink-primary)]"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2.5 font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
                  Màu bìa còng
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {BINDER_TONES.map((tone) => {
                    const selected = activeBinder.coverTone === tone.id;
                    return (
                      <button
                        key={tone.id}
                        onClick={() =>
                          updateBinderCover(activeBinder.id, {
                            coverTone: tone.id,
                          })
                        }
                        title={tone.label}
                        className={`flex h-11 items-center justify-center rounded-xl border transition ${
                          selected
                            ? "border-[var(--ink-primary)] ring-2 ring-[var(--ink-primary)]/20"
                            : "border-[var(--border-hairline)]"
                        }`}
                        style={{ backgroundColor: tone.swatchVar }}
                      >
                        {selected && <Check className="h-4 w-4" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2.5 font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
                  Họa tiết bề mặt
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PAPER_STYLE_META.map((pat) => {
                    const selected = activeBinder.coverPattern === pat.id;
                    return (
                      <button
                        key={pat.id}
                        onClick={() =>
                          updateBinderCover(activeBinder.id, {
                            coverPattern: pat.id,
                          })
                        }
                        className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                          selected
                            ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                            : "border-[var(--border-hairline)] bg-[var(--bg-paper)] hover:border-[var(--ink-muted)]"
                        }`}
                      >
                        {pat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="mb-2.5 flex items-center justify-between">
                  <p className="font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
                    Dán Sticker lên bìa
                  </p>
                  <span className="font-mono text-[11px] text-[var(--ink-muted)]">
                    Tối đa 4 sticker
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2.5">
                  {STICKER_CATALOG.map((meta) => {
                    const unlocked = user.unlockedStickers.includes(meta.id);
                    const pinned = activeBinder.stickers.some(
                      (s) => s.stickerId === meta.id
                    );
                    return (
                      <button
                        key={meta.id}
                        disabled={!unlocked}
                        onClick={() => {
                          toggleBinderSticker(activeBinder.id, meta.id);
                          showToast(
                            pinned
                              ? `Đã gỡ sticker ${meta.name}`
                              : `Đã dán ${meta.name} lên bìa!`
                          );
                        }}
                        title={
                          unlocked
                            ? meta.name
                            : `Mở khóa ở chuỗi ${meta.unlockStreak} ngày`
                        }
                        className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border p-2 transition ${
                          pinned
                            ? "border-[var(--ink-primary)] bg-[var(--bg-paper)]"
                            : "border-[var(--border-hairline)] bg-[var(--bg-paper)]/60 hover:bg-[var(--bg-paper)]"
                        } ${!unlocked ? "cursor-not-allowed opacity-40" : ""}`}
                      >
                        <StickerArt id={meta.id} size={36} />
                        <span className="w-full truncate text-center font-mono text-[10px] text-[var(--ink-muted)]">
                          {unlocked ? meta.name.split(" ")[0] : meta.tag}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {target.kind === "note" && activeNote && (
            <>
              <div>
                <p className="mb-2.5 font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
                  Kiểu giấy trang này
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {PAPER_STYLE_META.map((p) => {
                    const selected = activeNote.paperStyle === p.id;
                    return (
                      <button
                        key={p.id}
                        onClick={() =>
                          updateNote(activeNote.id, { paperStyle: p.id })
                        }
                        className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                          selected
                            ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                            : "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                        }`}
                      >
                        <div>{p.label}</div>
                        <div className="text-[10px] opacity-75">{p.hint}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-2.5 font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
                  Phông chữ ghi chú
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setNoteFont("sans")}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                      noteFont === "sans"
                        ? "border-[var(--ink-primary)] bg-[var(--bg-paper)] font-semibold"
                        : "border-[var(--border-hairline)]"
                    }`}
                  >
                    <div className="font-sans text-sm">Be Vietnam Pro</div>
                    <div className="text-[11px] text-[var(--ink-muted)]">
                      Hiện đại, gọn gàng
                    </div>
                  </button>
                  <button
                    onClick={() => setNoteFont("serif")}
                    className={`rounded-xl border px-3 py-2.5 text-left text-xs transition ${
                      noteFont === "serif"
                        ? "border-[var(--ink-primary)] bg-[var(--bg-paper)] font-semibold"
                        : "border-[var(--border-hairline)]"
                    }`}
                  >
                    <div className="font-serif text-sm">Lora Serif</div>
                    <div className="text-[11px] text-[var(--ink-muted)]">
                      Vibe tạp chí, sổ tay
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2.5 font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
                  Sticker góc trang (Responsive Anchor)
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {STICKER_CATALOG.map((meta) => {
                    const unlocked = user.unlockedStickers.includes(meta.id);
                    const active = activeNote.headerStickerId === meta.id;
                    return (
                      <button
                        key={meta.id}
                        disabled={!unlocked}
                        onClick={() =>
                          updateNote(activeNote.id, {
                            headerStickerId: active ? null : meta.id,
                          })
                        }
                        className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition ${
                          active
                            ? "border-[var(--ink-primary)] bg-[var(--bg-paper)]"
                            : "border-[var(--border-hairline)]"
                        } ${!unlocked ? "cursor-not-allowed opacity-40" : ""}`}
                      >
                        <StickerArt id={meta.id} size={34} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div className="border-t border-[var(--border-hairline)] pt-4">
            <p className="mb-2.5 font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
              Đổi nhanh Gu toàn ứng dụng
            </p>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                    theme === t.id
                      ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                      : "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manage Binder / Note CRUD */}
          {target.kind === "binder" && activeBinder && (
            <div className="border-t border-[var(--border-hairline)] pt-4">
              <p className="mb-2.5 font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
                Quản lý sổ
              </p>
              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition"
                  style={{
                    backgroundColor: "var(--sem-trap-bg)",
                    borderColor: "var(--sem-trap-border)",
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa cuốn sổ này</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-xl border border-[var(--border-hairline)] px-3 py-2 text-xs font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const title = activeBinder.title;
                      const id = activeBinder.id;
                      deleteBinder(id);
                      close();
                      showToast(`Đã xóa cuốn sổ "${title}"`);
                      if (pathname.includes(id)) {
                        router.push("/workspace");
                      }
                    }}
                    className="flex-1 rounded-xl border px-3 py-2 text-xs font-bold"
                    style={{
                      backgroundColor: "var(--sem-trap-bg)",
                      borderColor: "var(--sem-trap-border)",
                    }}
                  >
                    Xác nhận xóa?
                  </button>
                </div>
              )}
            </div>
          )}

          {target.kind === "note" && activeNote && (
            <div className="space-y-2 border-t border-[var(--border-hairline)] pt-4">
              <p className="font-mono text-[11px] font-medium tracking-wider text-[var(--ink-muted)] uppercase">
                Quản lý trang
              </p>
              <button
                type="button"
                onClick={() => {
                  const copy = duplicateNote(activeNote.id);
                  if (copy) {
                    close();
                    showToast("Đã nhân bản trang ghi chú!");
                    router.push(`/binder/${copy.binderId}/note/${copy.id}`);
                  }
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2.5 text-xs font-semibold hover:border-[var(--ink-primary)]"
              >
                <Copy className="h-3.5 w-3.5" />
                <span>Nhân bản trang này</span>
              </button>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition"
                  style={{
                    backgroundColor: "var(--sem-trap-bg)",
                    borderColor: "var(--sem-trap-border)",
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa trang ghi chú</span>
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 rounded-xl border border-[var(--border-hairline)] px-3 py-2 text-xs font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const bId = activeNote.binderId;
                      deleteNote(activeNote.id);
                      close();
                      showToast("Đã xóa trang ghi chú");
                      router.push(`/binder/${bId}`);
                    }}
                    className="flex-1 rounded-xl border px-3 py-2 text-xs font-bold"
                    style={{
                      backgroundColor: "var(--sem-trap-bg)",
                      borderColor: "var(--sem-trap-border)",
                    }}
                  >
                    Xác nhận xóa?
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
