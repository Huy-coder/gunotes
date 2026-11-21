"use client";

import React, { useState } from "react";
import { Flame } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { AccountCloudTab } from "@/features/settings/AccountCloudTab";
import { StickerCollectionTab } from "@/features/settings/StickerCollectionTab";
import { ThemePaperTab } from "@/features/settings/ThemePaperTab";
import { useAppStore } from "@/store/useAppStore";

type SettingsTab = "theme" | "stickers" | "account";

export default function SettingsPage() {
  const user = useAppStore((s) => s.user);
  const [tab, setTab] = useState<SettingsTab>("theme");

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-8 sm:pt-8">
        <div className="paper-shadow flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sem-hl-bg)] font-mono text-sm font-bold text-[#1F1E1B]">
              {user.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-bold">{user.displayName}</h1>
              <p className="font-mono text-xs text-[var(--ink-muted)]">
                {user.email || "Tài khoản cục bộ"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-1.5 font-mono text-xs font-medium">
            <Flame className="h-3.5 w-3.5 text-[#C96458]" />
            <span>Chuỗi {user.streakDays} ngày</span>
          </div>
        </div>

        <div className="mt-6 flex gap-6 border-b border-[var(--border-hairline)]">
          {(
            [
              { id: "theme", label: "Giao diện & Giấy" },
              { id: "stickers", label: "Bộ sưu tập Sticker" },
              { id: "account", label: "Tài khoản & Dữ liệu" },
            ] as Array<{ id: SettingsTab; label: string }>
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`border-b-2 pb-3 text-sm font-semibold transition ${
                tab === item.id
                  ? "border-[var(--ink-primary)] text-[var(--ink-primary)]"
                  : "border-transparent text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "theme" && <ThemePaperTab />}
        {tab === "stickers" && <StickerCollectionTab />}
        {tab === "account" && <AccountCloudTab />}
      </div>
    </AppShell>
  );
}
