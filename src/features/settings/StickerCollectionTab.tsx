"use client";

import React from "react";
import { Lock } from "lucide-react";
import { STICKER_CATALOG, StickerArt } from "@/components/stickers/StickerArt";
import { useAppStore } from "@/store/useAppStore";

export function StickerCollectionTab() {
  const user = useAppStore((s) => s.user);

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[var(--ink-muted)]">
          Sticker die-cut được mở khóa dần theo chuỗi ngày học đều đặn.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STICKER_CATALOG.map((meta) => {
          const unlocked = user.unlockedStickers.includes(meta.id);
          return (
            <div
              key={meta.id}
              className={`flex flex-col items-center rounded-2xl border p-4 text-center ${
                unlocked
                  ? "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                  : "border-dashed border-[var(--border-hairline)] bg-[var(--bg-paper)]/40 opacity-65"
              }`}
            >
              <StickerArt id={meta.id} size={52} />
              <div className="mt-2.5 text-xs font-semibold">{meta.name}</div>
              <div className="mt-1 inline-flex items-center gap-1 font-mono text-[10px] text-[var(--ink-muted)]">
                {!unlocked && <Lock className="h-3 w-3" />}
                <span>
                  {unlocked
                    ? "Đã sở hữu"
                    : `Mở ở chuỗi ${meta.unlockStreak} ngày`}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
