"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { BookOpen, CopyPlus, Loader2 } from "lucide-react";
import { HighlightText } from "@/components/ui/HighlightText";
import { DiagramBlockView } from "@/features/diagrams/DiagramBlockView";
import { ImageBlockView } from "@/features/note-studio/components/ImageBlockView";
import { PaperInkLayer } from "@/features/note-studio/components/PaperInkLayer";
import { getPaperClass, SEMANTIC_META } from "@/lib/semantic-styles";
import { useAppStore } from "@/store/useAppStore";
import type { Note } from "@/types/study";

function decodeHashNote(hash: string): Note | null {
  try {
    if (!hash.startsWith("#data=")) return null;
    const b64 = decodeURIComponent(hash.slice(6));
    const json = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json) as Note;
    if (parsed && parsed.title && Array.isArray(parsed.blocks)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export default function SharedNotePage() {
  const params = useParams<{ noteId: string }>();
  const router = useRouter();
  const noteId = params?.noteId ?? "";

  const binders = useAppStore((s) => s.binders);
  const addBinder = useAppStore((s) => s.addBinder);
  const addNote = useAppStore((s) => s.addNote);
  const updateNote = useAppStore((s) => s.updateNote);
  const addBlockToNote = useAppStore((s) => s.addBlockToNote);
  const deleteBlock = useAppStore((s) => s.deleteBlock);
  const showToast = useAppStore((s) => s.showToast);

  const [sharedNote, setSharedNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fromHash =
      typeof window !== "undefined" ? decodeHashNote(window.location.hash) : null;
    if (fromHash) {
      setSharedNote(fromHash);
      setLoading(false);
      return;
    }

    fetch(`/api/share/${encodeURIComponent(noteId)}`, { cache: "no-store" })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          setErrorMsg("Trang ghi chú này chưa được bật chia sẻ công khai.");
          setLoading(false);
          return;
        }
        const json = (await res.json()) as { note?: Note };
        if (json.note) {
          setSharedNote(json.note);
        } else {
          setErrorMsg("Không tìm thấy dữ liệu trang ghi chú.");
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) {
          setErrorMsg("Không thể tải trang ghi chú chia sẻ.");
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [noteId]);

  const handleSaveCopy = () => {
    if (!sharedNote) return;
    const targetBinder =
      binders[0] ??
      addBinder({
        title: "Trang được chia sẻ",
        subtitle: "Lưu từ bạn học GuNotes",
        subjectTag: "#chia-se",
        coverTone: "blue",
      });

    const created = addNote(
      targetBinder.id,
      `${sharedNote.title} (Bản lưu)`,
      sharedNote.paperStyle,
      sharedNote.template
    );

    if (created.blocks[0]) {
      deleteBlock(created.id, created.blocks[0].id);
    }

    for (const blk of sharedNote.blocks) {
      addBlockToNote(created.id, {
        type: blk.type,
        title: blk.title,
        cue: blk.cue,
        content: blk.content,
        action: blk.action,
        diagram: blk.diagram,
        canvasGraph: blk.canvasGraph,
        diagramViewMode: blk.diagramViewMode,
        imageUrl: blk.imageUrl,
        imageCaption: blk.imageCaption,
        imageStrokes: blk.imageStrokes,
      });
    }

    updateNote(created.id, {
      tags: sharedNote.tags,
      summary: sharedNote.summary,
      inkStrokes: sharedNote.inkStrokes,
    });

    showToast("Đã lưu bản sao trang ghi chú về sổ của bạn!");
    router.push(`/binder/${targetBinder.id}/note/${created.id}`);
  };

  return (
    <div className="desk-dot min-h-screen px-4 py-6 text-[var(--ink-primary)] sm:px-8">
      <div className="mx-auto mb-5 flex max-w-[860px] flex-wrap items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--ink-primary)]" />
          <span>GuNotes.</span>
          <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-[10px] font-normal text-[var(--ink-muted)]">
            Bản đọc chia sẻ
          </span>
        </Link>

        {sharedNote && (
          <button
            type="button"
            onClick={handleSaveCopy}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)] transition hover:opacity-90"
          >
            <CopyPlus className="h-3.5 w-3.5" />
            <span>Lưu bản sao về sổ của tôi</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="mx-auto flex max-w-[860px] items-center justify-center py-24 font-mono text-xs text-[var(--ink-muted)]">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          <span>Đang mở trang ghi chú chia sẻ...</span>
        </div>
      ) : errorMsg || !sharedNote ? (
        <div className="paper-shadow mx-auto max-w-md rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] p-8 text-center">
          <BookOpen className="mx-auto h-8 w-8 text-[var(--ink-muted)]" />
          <h1 className="mt-3 text-base font-bold">Không mở được trang chia sẻ</h1>
          <p className="mt-1.5 text-xs text-[var(--ink-muted)]">{errorMsg}</p>
          <Link
            href="/workspace"
            className="mt-5 inline-block rounded-full bg-[var(--accent-primary)] px-4 py-2 text-xs font-semibold text-[var(--accent-primary-fg)]"
          >
            Mở GuNotes của tôi
          </Link>
        </div>
      ) : (
        <article
          className={`${getPaperClass(
            sharedNote.paperStyle
          )} paper-shadow relative mx-auto max-w-[860px] rounded-[20px] border border-[var(--border-hairline)] p-6 sm:p-10`}
        >
          <PaperInkLayer
            inkMode={false}
            strokes={sharedNote.inkStrokes ?? []}
            onChangeStrokes={() => {}}
            onCloseInkMode={() => {}}
          />

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {sharedNote.title}
          </h1>
          {sharedNote.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px] text-[var(--ink-muted)]">
              {sharedNote.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-0.5"
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 space-y-3">
            {sharedNote.blocks.map((blk) => {
              const meta = SEMANTIC_META[blk.type];
              return (
                <div
                  key={blk.id}
                  className={
                    blk.type === "text"
                      ? "py-1 text-[15px] leading-7"
                      : "rounded-xl border border-l-[3px] p-4"
                  }
                  style={
                    blk.type === "text"
                      ? undefined
                      : {
                          backgroundColor: meta.bgVar,
                          borderColor: meta.borderVar,
                        }
                  }
                >
                  {blk.type !== "text" && (
                    <div className="mb-1.5 font-mono text-[10px] font-bold tracking-wider uppercase">
                      {blk.title ?? meta.badge}
                    </div>
                  )}
                  {blk.cue.trim() && (
                    <div className="mb-1 text-xs font-semibold text-[var(--ink-muted)]">
                      {blk.cue}
                    </div>
                  )}
                  {blk.type === "diagram" && blk.diagram ? (
                    <DiagramBlockView
                      diagram={blk.diagram}
                      canvasGraph={blk.canvasGraph}
                      viewMode={blk.diagramViewMode}
                      onPatch={() => {}}
                    />
                  ) : blk.type === "image" ? (
                    <ImageBlockView
                      imageUrl={blk.imageUrl}
                      caption={blk.imageCaption}
                      strokes={blk.imageStrokes}
                      onPatch={() => {}}
                    />
                  ) : (
                    <div className="text-[15px] leading-7">
                      <HighlightText
                        text={blk.content}
                        disableWikiNavigation
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {sharedNote.summary.trim() && (
            <div className="mt-6 rounded-xl border border-dashed border-[var(--border-hairline)] bg-[var(--bg-elevated)]/70 p-4 text-sm">
              <div className="mb-1 font-mono text-[10px] font-bold text-[var(--ink-muted)] uppercase">
                Tóm tắt
              </div>
              <p className="leading-relaxed">{sharedNote.summary}</p>
            </div>
          )}
        </article>
      )}
    </div>
  );
}
