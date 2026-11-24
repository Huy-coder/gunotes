"use client";

import React from "react";
import { CornerDownLeft, Loader2, MicOff } from "lucide-react";

export function VoiceDictationBar({
  isListening,
  isTranscribing,
  interimTranscript,
  onInsertNewline,
  onStop,
}: {
  isListening: boolean;
  isTranscribing: boolean;
  interimTranscript: string;
  onInsertNewline: () => void;
  onStop: () => void;
}) {
  if (!isListening && !isTranscribing) return null;

  return (
    <div
      data-highlight-ui="true"
      className="no-print pointer-events-none fixed right-0 bottom-20 left-0 z-40 flex justify-center px-3 lg:left-[232px]"
    >
      <div className="paper-shadow pointer-events-auto flex max-w-xl flex-wrap items-center justify-center gap-2 rounded-2xl border border-[var(--ink-primary)] bg-[var(--bg-elevated)]/98 px-3.5 py-2 backdrop-blur-md">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sem-trap-bg)] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[var(--ink-primary)]">
          {isTranscribing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" />
          )}
          <span>Tiếng Việt (vi-VN)</span>
        </span>

        <span className="max-w-[220px] truncate text-xs text-[var(--ink-muted)] italic sm:max-w-[280px]">
          {isTranscribing
            ? "Đang chuyển giọng nói thành chữ..."
            : interimTranscript || "Hãy nói tiếng Việt tự nhiên..."}
        </span>

        {isListening && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onInsertNewline}
            className="inline-flex min-h-[30px] items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2.5 py-0.5 font-mono text-[10px] font-semibold hover:border-[var(--ink-primary)]"
          >
            <CornerDownLeft className="h-3 w-3" />
            <span>Xuống dòng</span>
          </button>
        )}

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onStop}
          className="inline-flex min-h-[30px] items-center gap-1 rounded-full bg-[var(--accent-primary)] px-3 py-0.5 font-mono text-[10px] font-semibold text-[var(--accent-primary-fg)]"
        >
          <MicOff className="h-3 w-3" />
          <span>Dừng</span>
        </button>
      </div>
    </div>
  );
}
