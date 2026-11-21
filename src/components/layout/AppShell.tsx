"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Layers,
  Search,
  Settings,
  Timer,
} from "lucide-react";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { useAppStore } from "@/store/useAppStore";

function formatClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AppShell({
  children,
  hideMobileBottomBar = false,
}: {
  children: React.ReactNode;
  hideMobileBottomBar?: boolean;
}) {
  const pathname = usePathname();
  const user = useAppStore((s) => s.user);
  const theme = useAppStore((s) => s.theme);
  const authMode = useAppStore((s) => s.authMode);
  const cloudSyncStatus = useAppStore((s) => s.cloudSyncStatus);
  const flashcards = useAppStore((s) => s.flashcards);
  const isTimerRunning = useAppStore((s) => s.isTimerRunning);
  const secondsLeft = useAppStore((s) => s.secondsLeft);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  const dueCount = flashcards.filter((f) => f.isDue).length;

  const navItems = [
    {
      href: "/workspace",
      label: "Giá sách",
      icon: BookOpen,
      active:
        pathname.startsWith("/workspace") || pathname.startsWith("/binder"),
    },
    {
      href: "/review",
      label: "Ôn tập",
      icon: Layers,
      badge: dueCount > 0 ? dueCount : undefined,
      active: pathname.startsWith("/review"),
    },
    {
      href: "/focus",
      label: "Tập trung",
      icon: Timer,
      active: pathname.startsWith("/focus"),
    },
    {
      href: "/settings",
      label: "Cá nhân",
      icon: Settings,
      active: pathname.startsWith("/settings"),
    },
  ];

  const themeDisplayName =
    theme === "minimal-paper"
      ? "Minimal Paper"
      : theme === "cyber-kit"
      ? "Cyber-Kit Dark"
      : theme === "blueprint"
      ? "Blueprint Lab"
      : "Cozy Lo-fi";

  return (
    <div className="flex min-h-screen bg-[var(--bg-desk)] text-[var(--ink-primary)]">
      {/* Desktop Left Navigation Rail */}
      <aside className="no-print sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col justify-between border-r border-[var(--border-hairline)] bg-[var(--bg-desk)] px-3.5 py-5 lg:flex">
        <div className="space-y-5">
          <div className="flex items-center justify-between px-2">
            <Link
              href="/"
              className="flex items-center gap-2 text-lg font-bold tracking-tight"
            >
              <span className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--ink-primary)]" />
              <span>GuNotes.</span>
            </Link>
            <span className="rounded-full border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-2 py-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
              {APP_VERSION_LABEL}
            </span>
          </div>

          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2 text-xs text-[var(--ink-muted)] transition hover:border-[var(--ink-muted)]"
          >
            <span className="flex items-center gap-2">
              <Search className="h-3.5 w-3.5" />
              Tìm nhanh...
            </span>
            <kbd className="rounded border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[10px]">
              ⌘K
            </kbd>
          </button>

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    item.active
                      ? "bg-[var(--bg-elevated)] text-[var(--ink-primary)] shadow-xs ring-1 ring-[var(--border-hairline)]"
                      : "text-[var(--ink-muted)] hover:bg-[var(--bg-paper)] hover:text-[var(--ink-primary)]"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--ink-primary)]"
                      style={{ backgroundColor: "var(--sem-trap-bg)" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {isTimerRunning && (
            <Link
              href="/focus"
              className="flex items-center justify-between rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] px-3 py-2.5 text-xs transition hover:border-[var(--ink-muted)]"
            >
              <span className="flex items-center gap-2 text-[var(--ink-muted)]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-ring)]" />
                Đang tập trung
              </span>
              <span className="font-mono font-semibold tabular-nums">
                {formatClock(secondsLeft)}
              </span>
            </Link>
          )}
        </div>

        <Link
          href="/settings"
          className="flex items-center gap-3 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-2.5 transition hover:border-[var(--ink-muted)]"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--sem-hl-bg)] font-mono text-xs font-bold text-[#1F1E1B]">
            {user.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold">
              {user.displayName}
            </div>
            <div className="flex items-center gap-1.5 truncate font-mono text-[10px] text-[var(--ink-muted)]">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  authMode === "supabase" && cloudSyncStatus === "synced"
                    ? "bg-[#5f8d6b]"
                    : authMode === "supabase" &&
                      (cloudSyncStatus === "syncing" ||
                        cloudSyncStatus === "loading")
                    ? "animate-pulse bg-[#38bdf8]"
                    : cloudSyncStatus === "schema-missing"
                    ? "bg-[#eab308]"
                    : "bg-[var(--ink-muted)]/50"
                }`}
              />
              <span className="truncate">
                {authMode === "supabase"
                  ? cloudSyncStatus === "synced"
                    ? `Cloud • ${themeDisplayName}`
                    : cloudSyncStatus === "schema-missing"
                    ? "Cần chạy SQL • Local"
                    : "Đang đồng bộ..."
                  : `Local • ${themeDisplayName}`}
              </span>
            </div>
          </div>
        </Link>
      </aside>

      {/* Main Content Area */}
      <main
        className={`min-w-0 flex-1 ${
          hideMobileBottomBar ? "pb-6" : "pb-24 lg:pb-8"
        }`}
      >
        {children}
      </main>

      {/* Mobile Persistent Bottom Navigation Bar */}
      {!hideMobileBottomBar && (
        <nav className="no-print fixed right-0 bottom-0 left-0 z-40 border-t border-[var(--border-hairline)] bg-[var(--bg-elevated)]/95 px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
          <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center justify-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition ${
                    item.active
                      ? "text-[var(--ink-primary)]"
                      : "text-[var(--ink-muted)]"
                  }`}
                >
                  <div
                    className={`flex h-7 w-11 items-center justify-center rounded-full transition ${
                      item.active ? "bg-[var(--bg-desk)]" : ""
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className="absolute top-1 right-4 h-2 w-2 rounded-full"
                      style={{ backgroundColor: "var(--sem-trap-border)" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
