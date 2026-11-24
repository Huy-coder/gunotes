"use client";

import React, { useMemo, useState } from "react";
import { Check, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { stripStudyMarkup } from "@/lib/highlight/highlight-markup";
import { SEMANTIC_META } from "@/lib/semantic-styles";
import { isCardDueNow } from "@/lib/srs/sm2";
import { useAppStore } from "@/store/useAppStore";
import type { Flashcard } from "@/types/study";

export function FlashcardManagerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const binders = useAppStore((s) => s.binders);
  const notes = useAppStore((s) => s.notes);
  const flashcards = useAppStore((s) => s.flashcards);
  const addFlashcard = useAppStore((s) => s.addFlashcard);
  const updateFlashcard = useAppStore((s) => s.updateFlashcard);
  const deleteFlashcard = useAppStore((s) => s.deleteFlashcard);
  const showToast = useAppStore((s) => s.showToast);

  const [query, setQuery] = useState("");
  const [binderFilter, setBinderFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    front: string;
    back: string;
    tip: string;
    type: Flashcard["type"];
  }>({ front: "", back: "", tip: "", type: "def" });

  const [createOpen, setCreateOpen] = useState(false);
  const [newFront, setNewFront] = useState("");
  const [newBack, setNewBack] = useState("");
  const [newTip, setNewTip] = useState("");
  const [newType, setNewType] = useState<Flashcard["type"]>("def");
  const [newBinderId, setNewBinderId] = useState<string>(binders[0]?.id ?? "");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return flashcards.filter((fc) => {
      if (binderFilter !== "all" && fc.binderId !== binderFilter) return false;
      if (!q) return true;
      return (
        stripStudyMarkup(fc.front).toLowerCase().includes(q) ||
        stripStudyMarkup(fc.back).toLowerCase().includes(q) ||
        fc.noteTitle.toLowerCase().includes(q)
      );
    });
  }, [flashcards, binderFilter, query]);

  if (!open) return null;

  const startEdit = (card: Flashcard) => {
    setEditingId(card.id);
    setEditDraft({
      front: card.front,
      back: card.back,
      tip: card.tip ?? "",
      type: card.type,
    });
  };

  const handleSaveEdit = (id: string) => {
    if (!editDraft.front.trim() || !editDraft.back.trim()) return;
    updateFlashcard(id, {
      front: editDraft.front,
      back: editDraft.back,
      tip: editDraft.tip.trim() || undefined,
      type: editDraft.type,
    });
    setEditingId(null);
    showToast("Đã cập nhật thẻ Flashcard!");
  };

  const handleCreateManual = (e: React.FormEvent) => {
    e.preventDefault();
    const targetBinderId = newBinderId || binders[0]?.id;
    const targetNote =
      notes.find((n) => n.binderId === targetBinderId) ?? notes[0];
    if (!targetBinderId || !targetNote || !newFront.trim() || !newBack.trim()) {
      showToast("Hãy tạo ít nhất 1 cuốn sổ & trang note trước khi thêm thẻ.");
      return;
    }
    addFlashcard({
      binderId: targetBinderId,
      noteId: targetNote.id,
      noteTitle: targetNote.title,
      type: newType,
      front: newFront.trim(),
      back: newBack.trim(),
      tip: newTip.trim() || undefined,
    });
    setNewFront("");
    setNewBack("");
    setNewTip("");
    setCreateOpen(false);
    showToast("Đã thêm thẻ Flashcard mới!");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="paper-shadow flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-primary)] sm:rounded-2xl"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] px-4 py-3 sm:px-6">
          <div>
            <h2 className="text-sm font-bold sm:text-base">
              Quản lý bộ thẻ Flashcard ({flashcards.length})
            </h2>
            <p className="font-mono text-[10px] text-[var(--ink-muted)]">
              Xem lịch nhắc SM-2, sửa nhanh, xóa hoặc tạo thẻ mới
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCreateOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-primary-fg)]"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Thêm thẻ</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--border-hairline)] px-4 py-2.5 sm:px-6">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-1.5">
            <Search className="h-3.5 w-3.5 text-[var(--ink-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm câu hỏi hoặc đáp án..."
              className="w-full bg-transparent text-xs outline-none"
            />
          </div>
          <select
            value={binderFilter}
            onChange={(e) => setBinderFilter(e.target.value)}
            className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-1.5 text-xs outline-none"
          >
            <option value="all">Tất cả môn ({flashcards.length})</option>
            {binders.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {createOpen && (
            <form
              onSubmit={handleCreateManual}
              className="space-y-3 rounded-2xl border border-[var(--ink-primary)] bg-[var(--bg-paper)] p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-[11px] font-bold uppercase">
                  Tạo Flashcard thủ công
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={newBinderId || binders[0]?.id || ""}
                    onChange={(e) => setNewBinderId(e.target.value)}
                    className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 text-xs outline-none"
                  >
                    {binders.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.title}
                      </option>
                    ))}
                  </select>
                  <select
                    value={newType}
                    onChange={(e) =>
                      setNewType(e.target.value as Flashcard["type"])
                    }
                    className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 text-xs outline-none"
                  >
                    <option value="def">Định nghĩa</option>
                    <option value="formula">Công thức</option>
                    <option value="example">Ví dụ</option>
                    <option value="trap">Bẫy hay sai</option>
                  </select>
                </div>
              </div>
              <input
                required
                value={newFront}
                onChange={(e) => setNewFront(e.target.value)}
                placeholder="Mặt trước (Câu hỏi gợi nhớ)..."
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--ink-primary)]"
              />
              <textarea
                required
                rows={3}
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                placeholder="Mặt sau (Đáp án chuẩn, hỗ trợ ==y:tô màu== & $KaTeX$)..."
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2 text-sm outline-none focus:border-[var(--ink-primary)]"
              />
              <input
                value={newTip}
                onChange={(e) => setNewTip(e.target.value)}
                placeholder="Ghi chú thêm / Mẹo tránh bẫy (không bắt buộc)..."
                className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2 text-xs outline-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-full border border-[var(--border-hairline)] px-3.5 py-1.5 text-xs"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-full bg-[var(--accent-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--accent-primary-fg)]"
                >
                  Lưu thẻ mới
                </button>
              </div>
            </form>
          )}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[var(--border-hairline)] py-12 text-center text-xs text-[var(--ink-muted)]">
              Chưa tìm thấy thẻ Flashcard phù hợp.
            </div>
          ) : (
            filtered.map((card) => {
              const due = isCardDueNow(card);
              const isEditing = editingId === card.id;
              return (
                <div
                  key={card.id}
                  className="rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-3.5"
                >
                  {isEditing ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <select
                          value={editDraft.type}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              type: e.target.value as Flashcard["type"],
                            }))
                          }
                          className="rounded-lg border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-1 text-xs"
                        >
                          <option value="def">Định nghĩa</option>
                          <option value="formula">Công thức</option>
                          <option value="example">Ví dụ</option>
                          <option value="trap">Bẫy hay sai</option>
                        </select>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="rounded-full border border-[var(--border-hairline)] px-3 py-1 text-xs"
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(card.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-primary)] px-3 py-1 text-xs font-semibold text-[var(--accent-primary-fg)]"
                          >
                            <Check className="h-3 w-3" />
                            <span>Lưu</span>
                          </button>
                        </div>
                      </div>
                      <input
                        value={editDraft.front}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, front: e.target.value }))
                        }
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold outline-none"
                      />
                      <textarea
                        rows={3}
                        value={editDraft.back}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, back: e.target.value }))
                        }
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2 text-xs outline-none"
                      />
                      <input
                        value={editDraft.tip}
                        onChange={(e) =>
                          setEditDraft((d) => ({ ...d, tip: e.target.value }))
                        }
                        placeholder="Lưu ý thêm..."
                        className="w-full rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1.5 text-xs outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                          <span
                            className="rounded-full border px-2 py-0.5 font-bold"
                            style={{
                              backgroundColor: SEMANTIC_META[card.type].bgVar,
                              borderColor: SEMANTIC_META[card.type].borderVar,
                            }}
                          >
                            {SEMANTIC_META[card.type].badge}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 font-semibold ${
                              due
                                ? "bg-[var(--hl-yellow)] text-[var(--ink-primary)]"
                                : "bg-[var(--bg-desk)] text-[var(--ink-muted)]"
                            }`}
                          >
                            {due ? "Đến hạn ôn" : card.dueLabel}
                          </span>
                          <span className="truncate text-[var(--ink-muted)]">
                            {card.noteTitle}
                          </span>
                        </div>
                        <div className="text-sm font-semibold">
                          {stripStudyMarkup(card.front)}
                        </div>
                        <p className="line-clamp-2 text-xs text-[var(--ink-muted)]">
                          {stripStudyMarkup(card.back)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(card)}
                          title="Sửa thẻ"
                          className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-[var(--ink-primary)]"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            deleteFlashcard(card.id);
                            showToast("Đã xóa thẻ Flashcard.");
                          }}
                          title="Xóa thẻ"
                          className="rounded-lg p-1.5 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)] hover:text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
