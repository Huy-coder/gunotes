"use client";

import React from "react";
import Link from "next/link";
import { Palette } from "lucide-react";
import { StickerArt } from "@/components/stickers/StickerArt";
import { getBinderToneVars } from "@/lib/semantic-styles";
import type { Binder } from "@/types/study";

export function BinderCard({
  binder,
  noteCount,
  dueFlashcardCount,
  onCustomize,
}: {
  binder: Binder;
  noteCount: number;
  dueFlashcardCount: number;
  onCustomize: (binderId: string) => void;
}) {
  const tone = getBinderToneVars(binder.coverTone);

  const patternStyle: React.CSSProperties =
    binder.coverPattern === "dot"
      ? {
          backgroundImage:
            "radial-gradient(var(--grid-line) 1.2px, transparent 1.2px)",
          backgroundSize: "16px 16px",
        }
      : binder.coverPattern === "grid"
      ? {
          backgroundImage:
            "linear-gradient(to right, var(--grid-line) 1px, transparent 1px), linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }
      : binder.coverPattern === "lined"
      ? {
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 19px, var(--grid-line) 19px, var(--grid-line) 20px)",
        }
      : {};

  return (
    <div className="group relative aspect-[3/4] w-full">
      <Link
        href={`/binder/${binder.id}`}
        className="paper-shadow relative flex h-full w-full flex-col justify-between overflow-hidden rounded-[14px] border p-4 pl-7 transition duration-200 hover:-translate-y-0.5"
        style={{
          backgroundColor: tone.bg,
          borderColor: tone.border,
          ...patternStyle,
        }}
      >
        {/* Tactile Ring-Binder Spine Holes along left margin */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 bottom-0 left-0 flex w-5 flex-col items-center justify-evenly border-r border-black/8 bg-black/[0.03]"
        >
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <span
              key={idx}
              className="h-2.5 w-2.5 rounded-full border border-black/15 bg-[var(--bg-desk)] shadow-inner"
            />
          ))}
        </div>

        {/* Placed Die-Cut Stickers (percentage coordinates on 3:4 frame) */}
        {binder.stickers.map((st) => (
          <div
            key={st.id}
            className="pointer-events-none absolute z-10 scale-90 sm:scale-100"
            style={{
              left: `${st.xPct}%`,
              top: `${st.yPct}%`,
              transform: `translate(-50%, -50%) rotate(${st.rotation}deg)`,
            }}
          >
            <StickerArt id={st.stickerId} size={36} />
          </div>
        ))}

        {/* Top Subject Tag (leaves safe right space for Độ bìa button) */}
        <div className="relative z-20 flex items-center justify-between gap-2 pr-8">
          <span className="max-w-full truncate rounded-full bg-[var(--bg-elevated)]/85 px-2.5 py-0.5 font-mono text-[10px] font-medium text-[var(--ink-muted)] backdrop-blur-xs">
            {binder.subjectTag}
          </span>
        </div>

        {/* Typed Center Cover Label Tape (Muji / Cyber-Kit aesthetic) */}
        <div className="relative z-20 my-auto rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)]/92 p-2.5 backdrop-blur-xs sm:p-3">
          <h3 className="line-clamp-2 text-sm font-bold tracking-tight text-[var(--ink-primary)] sm:text-base">
            {binder.title}
          </h3>
          <p className="mt-1 line-clamp-1 text-[11px] text-[var(--ink-muted)]">
            {binder.subtitle}
          </p>
        </div>

        {/* Bottom Metadata & Mastery */}
        <div className="relative z-20 space-y-1.5">
          <div className="flex items-center justify-between gap-1 font-mono text-[10px] whitespace-nowrap text-[var(--ink-muted)] sm:text-[11px]">
            <span>{noteCount} trang</span>
            <span>
              {dueFlashcardCount > 0 ? `${dueFlashcardCount} thẻ ôn` : "Đã ôn"}
            </span>
          </div>
          <div className="h-1 w-full overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-[var(--ink-primary)]/75 transition-all"
              style={{ width: `${binder.masteryPercent}%` }}
            />
          </div>
        </div>
      </Link>

      {/* Quick Customize Button ("Độ bìa") */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onCustomize(binder.id);
        }}
        title="Độ bìa & Sticker"
        className="absolute top-2.5 right-2.5 z-30 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)]/95 text-[var(--ink-primary)] shadow-xs transition hover:scale-105 sm:h-auto sm:w-auto sm:gap-1 sm:px-2.5 sm:py-1 sm:text-[11px] sm:font-medium lg:opacity-0 lg:group-hover:opacity-100"
      >
        <Palette className="h-3 w-3" />
        <span className="hidden sm:inline">Độ bìa</span>
      </button>
    </div>
  );
}
