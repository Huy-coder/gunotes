"use client";

import React, { useMemo, useState } from "react";
import { Check, Copy, Globe, ImageDown, Printer, Share2, X } from "lucide-react";
import { stripStudyMarkup } from "@/lib/highlight/highlight-markup";
import type { Note } from "@/types/study";

function encodeNoteHash(note: Note): string {
  const lite: Note = {
    ...note,
    blocks: note.blocks.map((b) =>
      b.type === "image" && b.imageUrl?.startsWith("data:")
        ? { ...b, imageUrl: undefined }
        : b
    ),
  };
  const json = JSON.stringify(lite);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return `#data=${encodeURIComponent(b64)}`;
}

export function ShareExportModal({
  open,
  note,
  authMode,
  onTogglePublic,
  onClose,
  onToast,
}: {
  open: boolean;
  note: Note;
  authMode: "guest" | "supabase";
  onTogglePublic: (nextPublic: boolean) => void;
  onClose: () => void;
  onToast: (msg: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (authMode === "supabase") {
      return `${window.location.origin}/share/${note.id}`;
    }
    return `${window.location.origin}/share/${note.id}${encodeNoteHash(note)}`;
  }, [authMode, note]);

  if (!open) return null;

  const handleCopyLink = async () => {
    if (authMode === "supabase" && !note.isPublic) {
      onTogglePublic(true);
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      onToast("Đã sao chép link chia sẻ trang ghi chú!");
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      onToast("Không sao chép tự động được — hãy copy link trong ô.");
    }
  };

  const handleDownloadStudygramPng = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Minimal Paper background + subtle dot grid
    ctx.fillStyle = "#f9f7f2";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "rgba(31, 30, 27, 0.12)";
    for (let x = 48; x < 1040; x += 28) {
      for (let y = 48; y < 1300; y += 28) {
        ctx.beginPath();
        ctx.arc(x, y, 1.3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Header brand strip
    ctx.fillStyle = "#1f1e1b";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("GuNotes.", 76, 92);
    ctx.fillStyle = "#6f6a60";
    ctx.font = "22px monospace";
    ctx.fillText(note.tags.slice(0, 3).join("  ") || "#hoc-ba-co-gu", 230, 90);

    // Note Title
    ctx.fillStyle = "#1f1e1b";
    ctx.font = "bold 44px sans-serif";
    const titleLines: string[] = [];
    let current = "";
    for (const word of note.title.split(" ")) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > 920) {
        titleLines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) titleLines.push(current);

    let y = 170;
    for (const line of titleLines.slice(0, 3)) {
      ctx.fillText(line, 76, y);
      y += 56;
    }

    // Divider
    ctx.strokeStyle = "#d9d3c7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(76, y + 6);
    ctx.lineTo(1004, y + 6);
    ctx.stroke();
    y += 52;

    // Render blocks
    for (const blk of note.blocks) {
      if (y > 1180) break;
      if (blk.type === "diagram" || blk.type === "image") continue;
      const plain = stripStudyMarkup(blk.content).trim();
      if (!plain) continue;

      if (blk.type !== "text") {
        ctx.fillStyle = "#6f6a60";
        ctx.font = "bold 20px monospace";
        ctx.fillText(`[${blk.title ?? blk.type.toUpperCase()}]`, 76, y);
        y += 32;
      }

      ctx.fillStyle = "#1f1e1b";
      ctx.font = "28px sans-serif";
      let lineBuf = "";
      for (const word of plain.replace(/\n/g, " ").split(" ")) {
        const test = lineBuf ? `${lineBuf} ${word}` : word;
        if (ctx.measureText(test).width > 910) {
          ctx.fillText(lineBuf, 76, y);
          y += 38;
          lineBuf = word;
          if (y > 1180) break;
        } else {
          lineBuf = test;
        }
      }
      if (lineBuf && y <= 1180) {
        ctx.fillText(lineBuf, 76, y);
        y += 46;
      }
    }

    // Footer
    ctx.fillStyle = "#6f6a60";
    ctx.font = "20px monospace";
    ctx.fillText("Tạo bằng GuNotes — Học bá có gu", 76, 1290);

    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${note.title.slice(0, 40) || "gunotes-card"}.png`;
    a.click();
    onToast("Đã xuất thẻ ảnh Studygram (.png)!");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="paper-shadow w-full max-w-md space-y-4 rounded-t-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-5 text-[var(--ink-primary)] sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            <h2 className="text-sm font-bold">Chia sẻ & Xuất trang</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[var(--ink-muted)] hover:bg-[var(--bg-desk)]"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Public Link Toggle */}
        <div className="space-y-3 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-[var(--ink-muted)]" />
              <div>
                <div className="text-xs font-bold">Link chia sẻ chỉ-đọc</div>
                <div className="text-[11px] text-[var(--ink-muted)]">
                  {authMode === "supabase"
                    ? "Bạn học xem trang và lưu bản sao về sổ của họ"
                    : "Tạo link chia sẻ nhanh trực tiếp từ nội dung trang"}
                </div>
              </div>
            </div>
            {authMode === "supabase" && (
              <button
                type="button"
                onClick={() => onTogglePublic(!note.isPublic)}
                className={`rounded-full border px-3 py-1 font-mono text-[10px] font-semibold ${
                  note.isPublic
                    ? "border-[var(--sem-ex-border)] bg-[var(--sem-ex-bg)]"
                    : "border-[var(--border-hairline)] bg-[var(--bg-elevated)] text-[var(--ink-muted)]"
                }`}
              >
                {note.isPublic ? "Đang bật" : "Đang tắt"}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="min-w-0 flex-1 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-2 font-mono text-[11px] outline-none"
            />
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-[var(--accent-primary)] px-3 py-2 font-mono text-[11px] font-semibold text-[var(--accent-primary-fg)]"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              <span>{copied ? "Đã copy" : "Copy"}</span>
            </button>
          </div>
        </div>

        {/* Export Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleDownloadStudygramPng}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2.5 text-xs font-semibold hover:border-[var(--ink-primary)]"
          >
            <ImageDown className="h-4 w-4" />
            <span>Xuất ảnh (.png)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              window.print();
            }}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2.5 text-xs font-semibold hover:border-[var(--ink-primary)]"
          >
            <Printer className="h-4 w-4" />
            <span>In / Lưu PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
}
