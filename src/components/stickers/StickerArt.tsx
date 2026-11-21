"use client";

import React from "react";
import type { StickerId } from "@/types/study";

export interface StickerMeta {
  id: StickerId;
  name: string;
  unlockStreak: number;
  tag: string;
}

export const STICKER_CATALOG: StickerMeta[] = [
  { id: "sparkle", name: "Ngôi sao Học bá", unlockStreak: 0, tag: "Starter" },
  { id: "coffee", name: "Cà phê Chạy bài", unlockStreak: 0, tag: "Starter" },
  { id: "bookmark", name: "Ruy băng Đánh dấu", unlockStreak: 0, tag: "Starter" },
  { id: "chart", name: "Đồ thị Tăng trưởng", unlockStreak: 3, tag: "3 ngày" },
  { id: "cursor", name: "Con trỏ Pixel", unlockStreak: 5, tag: "5 ngày" },
  { id: "cat", name: "Mèo Lofi Ngồi học", unlockStreak: 7, tag: "7 ngày" },
  { id: "lamp", name: "Đèn bàn Thức khuya", unlockStreak: 14, tag: "14 ngày" },
  { id: "cyber", name: "Huy hiệu Cyber-Kit", unlockStreak: 21, tag: "21 ngày" },
];

export function StickerArt({
  id,
  size = 44,
  className = "",
}: {
  id: StickerId;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`die-cut-sticker inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label={id}
    >
      {id === "sparkle" && (
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <path
            d="M32 6L38 24L56 30L38 36L32 54L26 36L8 30L26 24L32 6Z"
            fill="#FBF0C4"
            stroke="var(--sticker-outline)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path
            d="M32 6L38 24L56 30L38 36L32 54L26 36L8 30L26 24L32 6Z"
            fill="#F6D879"
            stroke="#1F1E1B"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="48" cy="14" r="3.5" fill="#DCE8F2" stroke="#1F1E1B" strokeWidth="1.8" />
        </svg>
      )}
      {id === "coffee" && (
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <rect
            x="14"
            y="22"
            width="30"
            height="28"
            rx="7"
            fill="#EFE6D5"
            stroke="var(--sticker-outline)"
            strokeWidth="6"
          />
          <path
            d="M44 27H49C52 27 54 29.5 54 33C54 36.5 52 39 49 39H44"
            fill="none"
            stroke="var(--sticker-outline)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <rect
            x="14"
            y="22"
            width="30"
            height="28"
            rx="7"
            fill="#FAF8F3"
            stroke="#1F1E1B"
            strokeWidth="2.2"
          />
          <rect x="16" y="28" width="26" height="10" fill="#D5B895" />
          <path
            d="M44 27H49C52 27 54 29.5 54 33C54 36.5 52 39 49 39H44"
            fill="none"
            stroke="#1F1E1B"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <path d="M23 16C23 13 26 12 26 9" stroke="#5F5C53" strokeWidth="2" strokeLinecap="round" />
          <path d="M32 16C32 13 35 12 35 9" stroke="#5F5C53" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
      {id === "bookmark" && (
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <path
            d="M19 10H45V54L32 43L19 54V10Z"
            fill="#F6E2DF"
            stroke="var(--sticker-outline)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path
            d="M19 10H45V54L32 43L19 54V10Z"
            fill="#F6E2DF"
            stroke="#1F1E1B"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M26 20H38" stroke="#C96458" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M26 27H34" stroke="#C96458" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )}
      {id === "chart" && (
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <rect
            x="10"
            y="12"
            width="44"
            height="40"
            rx="10"
            fill="#DCE8F2"
            stroke="var(--sticker-outline)"
            strokeWidth="6"
          />
          <rect
            x="10"
            y="12"
            width="44"
            height="40"
            rx="10"
            fill="#DCE8F2"
            stroke="#1F1E1B"
            strokeWidth="2.2"
          />
          <path
            d="M18 40L27 31L35 35L46 21"
            fill="none"
            stroke="#1F1E1B"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="46" cy="21" r="3" fill="#5B8FB9" stroke="#1F1E1B" strokeWidth="1.6" />
        </svg>
      )}
      {id === "cursor" && (
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <path
            d="M16 11L49 31L33 36L28 52L16 11Z"
            fill="#EAE4F2"
            stroke="var(--sticker-outline)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path
            d="M16 11L49 31L33 36L28 52L16 11Z"
            fill="#EAE4F2"
            stroke="#1F1E1B"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="43" cy="45" r="5" fill="#FBF0C4" stroke="#1F1E1B" strokeWidth="1.8" />
        </svg>
      )}
      {id === "cat" && (
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <path
            d="M16 24L20 12L28 19H36L44 12L48 24V42C48 48.6 42.6 54 36 54H28C21.4 54 16 48.6 16 42V24Z"
            fill="#E2ECE4"
            stroke="var(--sticker-outline)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path
            d="M16 24L20 12L28 19H36L44 12L48 24V42C48 48.6 42.6 54 36 54H28C21.4 54 16 48.6 16 42V24Z"
            fill="#FAF8F3"
            stroke="#1F1E1B"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <circle cx="26" cy="33" r="2.2" fill="#1F1E1B" />
          <circle cx="38" cy="33" r="2.2" fill="#1F1E1B" />
          <path d="M29 38C30.5 40 33.5 40 35 38" stroke="#1F1E1B" strokeWidth="2" strokeLinecap="round" fill="none" />
          <ellipse cx="22" cy="37" rx="3" ry="1.8" fill="#F6E2DF" />
          <ellipse cx="42" cy="37" rx="3" ry="1.8" fill="#F6E2DF" />
        </svg>
      )}
      {id === "lamp" && (
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <path
            d="M21 16H43L49 32H15L21 16Z"
            fill="#FBF0C4"
            stroke="var(--sticker-outline)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <path
            d="M21 16H43L49 32H15L21 16Z"
            fill="#FBF0C4"
            stroke="#1F1E1B"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M32 32V50" stroke="#1F1E1B" strokeWidth="2.4" strokeLinecap="round" />
          <path d="M22 50H42" stroke="#1F1E1B" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      )}
      {id === "cyber" && (
        <svg viewBox="0 0 64 64" className="h-full w-full">
          <polygon
            points="32,8 54,20 54,44 32,56 10,44 10,20"
            fill="#DCE8F2"
            stroke="var(--sticker-outline)"
            strokeWidth="6"
            strokeLinejoin="round"
          />
          <polygon
            points="32,8 54,20 54,44 32,56 10,44 10,20"
            fill="#EAE4F2"
            stroke="#1F1E1B"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M34 19L23 34H32L30 45L41 30H32L34 19Z" fill="#FBF0C4" stroke="#1F1E1B" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}
