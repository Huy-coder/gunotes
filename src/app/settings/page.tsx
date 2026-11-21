"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Cloud,
  Copy,
  Database,
  Download,
  ExternalLink,
  Flame,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { STICKER_CATALOG, StickerArt } from "@/components/stickers/StickerArt";
import { PAPER_STYLE_META, STUDY_PERSONA_META } from "@/lib/semantic-styles";
import { useAppStore } from "@/store/useAppStore";
import type { NoteFont, ThemeId } from "@/types/study";

type SettingsTab = "theme" | "stickers" | "account";

interface SupabaseHealthInfo {
  configured: boolean;
  connected: boolean;
  projectRef: string | null;
  schemaReady: boolean;
  missingTables: string[];
  missingColumns?: string[];
  error?: string | null;
  checkedAt: string;
}

const THEME_CARDS: Array<{
  id: ThemeId;
  name: string;
  desc: string;
  deskBg: string;
  paperBg: string;
  inkColor: string;
  accentBg: string;
}> = [
  {
    id: "minimal-paper",
    name: "Minimal Paper",
    desc: "Giấy kem dịu mắt, mực than chì & pastel",
    deskBg: "#F4F1EA",
    paperBg: "#FAF8F3",
    inkColor: "#1F1E1B",
    accentBg: "#DCE8F2",
  },
  {
    id: "cyber-kit",
    name: "Cyber-Kit Dark",
    desc: "Nền đen sâu, viền hologram & cyan neon",
    deskBg: "#0B0E14",
    paperBg: "#121722",
    inkColor: "#EEF2F7",
    accentBg: "#38BDF8",
  },
  {
    id: "blueprint",
    name: "Blueprint Lab",
    desc: "Xanh kỹ thuật sắc nét, phong cách kiến trúc",
    deskBg: "#132238",
    paperBg: "#182B47",
    inkColor: "#F1F6FD",
    accentBg: "#7DD3FC",
  },
  {
    id: "cozy-lofi",
    name: "Cozy Lo-fi",
    desc: "Tông giấy rang trầm ấm cho buổi đêm",
    deskBg: "#EBE2D3",
    paperBg: "#F6F0E4",
    inkColor: "#2C221E",
    accentBg: "#DCE5E8",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const theme = useAppStore((s) => s.theme);
  const defaultPaper = useAppStore((s) => s.defaultPaper);
  const noteFont = useAppStore((s) => s.noteFont);
  const binders = useAppStore((s) => s.binders);
  const notes = useAppStore((s) => s.notes);

  const setTheme = useAppStore((s) => s.setTheme);
  const setDefaultPaper = useAppStore((s) => s.setDefaultPaper);
  const setNoteFont = useAppStore((s) => s.setNoteFont);
  const setStudyPersona = useAppStore((s) => s.setStudyPersona);
  const unlockAllStickersPreview = useAppStore(
    (s) => s.unlockAllStickersPreview
  );
  const resetDemoData = useAppStore((s) => s.resetDemoData);
  const signOutAndResetLocal = useAppStore((s) => s.signOutAndResetLocal);
  const authMode = useAppStore((s) => s.authMode);
  const cloudUserId = useAppStore((s) => s.cloudUserId);
  const cloudSyncStatus = useAppStore((s) => s.cloudSyncStatus);
  const cloudError = useAppStore((s) => s.cloudError);
  const hydrateFromSupabase = useAppStore((s) => s.hydrateFromSupabase);
  const showToast = useAppStore((s) => s.showToast);

  const [tab, setTab] = useState<SettingsTab>("theme");
  const [health, setHealth] = useState<SupabaseHealthInfo | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [sqlCopying, setSqlCopying] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    try {
      const res = await fetch("/api/supabase/health", { cache: "no-store" });
      if (res.ok) {
        const json = (await res.json()) as SupabaseHealthInfo;
        setHealth(json);
      }
    } catch {
      // ignore network glitches silently
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "account") {
      void fetchHealth();
    }
  }, [tab, fetchHealth]);

  const handleCopySqlSchema = async () => {
    setSqlCopying(true);
    try {
      const res = await fetch("/api/supabase/schema", { cache: "no-store" });
      const data = (await res.json()) as { sql?: string };
      if (!data.sql) {
        showToast("Không đọc được file SQL schema.");
        return;
      }
      await navigator.clipboard.writeText(data.sql);
      setSqlCopied(true);
      showToast("Đã sao chép toàn bộ SQL Schema Supabase!");
      window.setTimeout(() => setSqlCopied(false), 3000);
    } catch {
      showToast("Trình duyệt không cấp quyền clipboard — hãy thử mở file SQL trực tiếp.");
    } finally {
      setSqlCopying(false);
    }
  };

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      profile: user,
      preferences: { theme, defaultPaper, noteFont },
      binders,
      notes,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gunotes-backup.json";
    a.click();
    URL.revokeObjectURL(url);
    showToast("Đã xuất toàn bộ sổ tay ra file JSON!");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-4 pt-6 sm:px-8 sm:pt-8">
        {/* Profile Header Card */}
        <div className="paper-shadow flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--sem-hl-bg)] font-mono text-sm font-bold text-[#1F1E1B]">
              {user.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-bold">{user.displayName}</h1>
              <p className="font-mono text-xs text-[var(--ink-muted)]">
                {user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-1.5 font-mono text-xs font-medium">
            <Flame className="h-3.5 w-3.5 text-[#C96458]" />
            <span>Chuỗi {user.streakDays} ngày</span>
          </div>
        </div>

        {/* Horizontal Tabs */}
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

        {/* Tab 1: Theme & Paper */}
        {tab === "theme" && (
          <div className="mt-6 space-y-8">
            <section>
              <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                Chọn Gu Không Gian (Theme Presets)
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {THEME_CARDS.map((card) => {
                  const active = theme === card.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => {
                        setTheme(card.id);
                        showToast(`Đã chuyển sang gu ${card.name}`);
                      }}
                      className={`paper-shadow flex flex-col overflow-hidden rounded-2xl border text-left transition ${
                        active
                          ? "border-[var(--ink-primary)] ring-2 ring-[var(--ink-primary)]/20"
                          : "border-[var(--border-hairline)] hover:border-[var(--ink-muted)]"
                      }`}
                    >
                      {/* Mini Visual Swatch */}
                      <div
                        className="flex h-24 w-full items-center gap-3 p-4"
                        style={{ backgroundColor: card.deskBg }}
                      >
                        <div
                          className="flex h-full flex-1 flex-col justify-between rounded-xl border border-black/10 p-2.5"
                          style={{
                            backgroundColor: card.paperBg,
                            color: card.inkColor,
                          }}
                        >
                          <div className="text-[11px] font-bold">
                            Aa Ghi chú mẫu
                          </div>
                          <div className="flex gap-1.5">
                            <span
                              className="h-2.5 w-10 rounded-full"
                              style={{ backgroundColor: card.accentBg }}
                            />
                            <span className="h-2.5 w-6 rounded-full bg-current opacity-20" />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-[var(--bg-elevated)] p-4">
                        <div>
                          <div className="text-sm font-bold">{card.name}</div>
                          <div className="mt-0.5 text-xs text-[var(--ink-muted)]">
                            {card.desc}
                          </div>
                        </div>
                        {active && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                  Chất liệu giấy mặc định (4 loại ruột giấy)
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {PAPER_STYLE_META.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDefaultPaper(p.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        defaultPaper === p.id
                          ? "border-[var(--ink-primary)] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                          : "border-[var(--border-hairline)] bg-[var(--bg-paper)]"
                      }`}
                    >
                      <div className="text-xs font-semibold">{p.label}</div>
                      <div className="text-[10px] opacity-75">{p.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                  Phông chữ nội dung
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(
                    [
                      { id: "sans", label: "Be Vietnam Pro", sub: "Hiện đại" },
                      { id: "serif", label: "Lora Serif", sub: "Tạp chí" },
                    ] as Array<{ id: NoteFont; label: string; sub: string }>
                  ).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setNoteFont(f.id)}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${
                        noteFont === f.id
                          ? "border-[var(--ink-primary)] bg-[var(--bg-paper)] ring-1 ring-[var(--ink-primary)]"
                          : "border-[var(--border-hairline)] bg-[var(--bg-elevated)]"
                      }`}
                    >
                      <div
                        className={`text-sm font-semibold ${
                          f.id === "serif" ? "font-serif" : "font-sans"
                        }`}
                      >
                        {f.label}
                      </div>
                      <div className="font-mono text-[10px] text-[var(--ink-muted)]">
                        {f.sub}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <h2 className="font-mono text-xs font-semibold tracking-wider text-[var(--ink-muted)] uppercase">
                Gu Liên Minh Học Bá (Tư duy chủ đạo)
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {STUDY_PERSONA_META.map((item) => {
                  const active = (user.studyPersona ?? "flow") === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setStudyPersona(item.id);
                        showToast(`Đã chọn ${item.name}`);
                      }}
                      className={`rounded-2xl border p-3.5 text-left transition ${
                        active
                          ? "border-[var(--ink-primary)] bg-[var(--bg-paper)] ring-2 ring-[var(--ink-primary)]/15"
                          : "border-[var(--border-hairline)] bg-[var(--bg-elevated)] hover:border-[var(--ink-muted)]"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold sm:text-sm">
                        <span>{item.name}</span>
                        {active && <Check className="h-4 w-4" />}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-[var(--ink-muted)]">
                        {item.tagline}
                      </div>
                      <p className="mt-1 text-xs text-[var(--ink-muted)]">
                        {item.desc}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Sticker Collection */}
        {tab === "stickers" && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-[var(--ink-muted)]">
                Sticker die-cut được mở khóa dần theo chuỗi ngày học đều đặn.
              </p>
              <button
                type="button"
                onClick={unlockAllStickersPreview}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3.5 py-1.5 text-xs font-semibold hover:border-[var(--ink-primary)]"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Mở khóa thử tất cả (Demo)</span>
              </button>
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
                    <div className="mt-2.5 text-xs font-semibold">
                      {meta.name}
                    </div>
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
        )}

        {/* Tab 3: Account & Data */}
        {tab === "account" && (
          <div className="mt-6 space-y-4">
            {/* Live Supabase Diagnostics Card */}
            <div className="paper-shadow rounded-2xl border border-[var(--border-hairline)] bg-[var(--bg-paper)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Cloud className="h-4 w-4" />
                    <h3 className="text-sm font-bold">
                      Kết nối Supabase Cloud Backend
                    </h3>
                  </div>
                  <p className="font-mono text-[11px] text-[var(--ink-muted)]">
                    Project ID:{" "}
                    <strong>{health?.projectRef ?? "ifoxqhdmqnxwhdwiqxbh"}</strong>{" "}
                    • Trạng thái:{" "}
                    {healthLoading && !health
                      ? "Đang kiểm tra..."
                      : health?.connected
                      ? "Đã kết nối API thành công"
                      : health?.configured
                      ? "Chưa kết nối được"
                      : "Chưa cấu hình biến môi trường"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold"
                    style={{
                      backgroundColor:
                        authMode === "supabase" && cloudSyncStatus === "synced"
                          ? "var(--sem-ex-bg)"
                          : cloudSyncStatus === "schema-missing" ||
                            (health && !health.schemaReady)
                          ? "var(--hl-yellow)"
                          : "var(--bg-elevated)",
                      borderColor:
                        authMode === "supabase" && cloudSyncStatus === "synced"
                          ? "var(--sem-ex-border)"
                          : "var(--border-hairline)",
                    }}
                  >
                    <Database className="h-3 w-3" />
                    <span>
                      {authMode === "supabase"
                        ? cloudSyncStatus === "synced"
                          ? "Cloud Sync Đang Bật"
                          : cloudSyncStatus === "syncing"
                          ? "Đang đồng bộ..."
                          : cloudSyncStatus === "schema-missing"
                          ? "Chờ tạo bảng SQL"
                          : "Đang tải Cloud..."
                        : "Chế độ Khách (Local)"}
                    </span>
                  </span>

                  <button
                    type="button"
                    onClick={() => void fetchHealth()}
                    disabled={healthLoading}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[10px] font-semibold hover:border-[var(--ink-primary)]"
                    title="Kiểm tra lại kết nối Supabase"
                  >
                    {healthLoading ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    <span>Kiểm tra</span>
                  </button>
                </div>
              </div>

              {/* Schema Setup Prompt if tables or Phase 2 columns are missing */}
              {health?.connected && !health.schemaReady && (
                <div
                  className="mt-4 space-y-3 rounded-xl border p-4 text-xs"
                  style={{
                    backgroundColor: "var(--hl-yellow)",
                    borderColor: "var(--sem-formula-border)",
                  }}
                >
                  {health.missingTables.length > 0 && (
                    <div className="flex items-start gap-2 font-bold">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        Database đang trống {health.missingTables.length}/5 bảng:{" "}
                        <span className="font-mono">
                          {health.missingTables.join(", ")}
                        </span>
                      </span>
                    </div>
                  )}

                  {(health.missingColumns?.length ?? 0) > 0 && (
                    <div className="flex items-start gap-2 font-bold">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <div className="space-y-1">
                        <div>
                          Cần cập nhật thêm {health.missingColumns!.length} cột Phase 2 trên bảng hiện có:
                        </div>
                        <ul className="list-disc pl-4 font-mono text-[11px] font-medium">
                          {health.missingColumns!.map((colErr) => (
                            <li key={colErr}>{colErr}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  <p className="leading-relaxed text-[var(--ink-primary)]/85">
                    API kết nối tới <strong>{health.projectRef}</strong> đã
                    thông! Bạn chỉ cần sao chép file SQL schema (idempotent, chạy
                    lại an toàn không mất dữ liệu cũ) và bấm Run trong Supabase
                    SQL Editor là hoàn tất.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopySqlSchema()}
                      disabled={sqlCopying}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-primary)] px-3.5 py-1.5 font-mono text-[11px] font-semibold text-[var(--accent-primary-fg)]"
                    >
                      {sqlCopied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      <span>
                        {sqlCopied ? "Đã sao chép SQL!" : "Sao chép SQL Schema"}
                      </span>
                    </button>

                    <a
                      href={`https://supabase.com/dashboard/project/${
                        health.projectRef ?? "ifoxqhdmqnxwhdwiqxbh"
                      }/sql/new`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ink-primary)] bg-[var(--bg-elevated)] px-3.5 py-1.5 font-mono text-[11px] font-semibold text-[var(--ink-primary)] hover:bg-[var(--bg-paper)]"
                    >
                      <span>Mở Supabase SQL Editor</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              )}

              {health?.connected && health.schemaReady && (
                <div
                  className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3.5 text-xs"
                  style={{
                    backgroundColor: "var(--sem-ex-bg)",
                    borderColor: "var(--sem-ex-border)",
                  }}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    <Check className="h-4 w-4 shrink-0" />
                    <span>
                      Đủ 5/5 bảng & cột Phase 2 (`profiles`, `binders`, `notes`,
                      `flashcards`, `study_sessions`) đã sẵn sàng!
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopySqlSchema()}
                      disabled={sqlCopying}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[10px] font-semibold text-[var(--ink-primary)] hover:border-[var(--ink-primary)]"
                    >
                      {sqlCopied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>
                        {sqlCopied ? "Đã sao chép SQL!" : "Sao chép SQL Schema"}
                      </span>
                    </button>
                    {authMode === "guest" && (
                      <Link
                        href="/login"
                        className="rounded-full bg-[var(--accent-primary)] px-3 py-1 font-mono text-[10px] font-semibold text-[var(--accent-primary-fg)]"
                      >
                        Đăng nhập Cloud →
                      </Link>
                    )}
                  </div>
                </div>
              )}

              {health && !health.connected && (
                <div
                  className="mt-4 space-y-2 rounded-xl border p-3.5 text-xs"
                  style={{
                    backgroundColor: "var(--sem-trap-bg)",
                    borderColor: "var(--sem-trap-border)",
                  }}
                >
                  <div className="font-bold">
                    Không kết nối được tới API Supabase
                    {health.error ? `: ${health.error}` : "."}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopySqlSchema()}
                    disabled={sqlCopying}
                    className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-3 py-1 font-mono text-[10px] font-semibold"
                  >
                    {sqlCopied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    <span>
                      {sqlCopied ? "Đã sao chép SQL!" : "Sao chép SQL Schema"}
                    </span>
                  </button>
                </div>
              )}

              {cloudError && (
                <p className="mt-3 font-mono text-[11px] text-[#9b3b30]">
                  Lưu ý đồng bộ: {cloudError}
                </p>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-dashed border-[var(--border-hairline)] pt-3 text-xs text-[var(--ink-muted)]">
                <span>
                  {authMode === "supabase"
                    ? `Đang đồng bộ theo tài khoản ${user.email}`
                    : "Hiện bạn đang xem bằng dữ liệu mẫu Local trên trình duyệt."}
                </span>
                {authMode === "guest" ? (
                  <Link
                    href="/login"
                    className="font-semibold text-[var(--ink-primary)] underline underline-offset-4"
                  >
                    Đăng nhập / Tạo tài khoản Supabase →
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (cloudUserId) {
                        void hydrateFromSupabase(
                          cloudUserId,
                          user.email,
                          user.displayName
                        );
                        showToast("Đang tải lại dữ liệu mới nhất từ Supabase...");
                      }
                    }}
                    className="inline-flex items-center gap-1 font-semibold text-[var(--ink-primary)] underline underline-offset-4"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Đồng bộ lại từ Cloud</span>
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={handleExportJson}
                className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 py-3 text-xs font-semibold hover:border-[var(--ink-primary)]"
              >
                <Download className="h-4 w-4" />
                <span>Xuất toàn bộ dữ liệu (.json)</span>
              </button>

              {authMode === "guest" && (
                <button
                  type="button"
                  onClick={resetDemoData}
                  className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 py-3 text-xs font-semibold hover:border-[var(--ink-primary)]"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Khôi phục dữ liệu mẫu</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  void signOutAndResetLocal().then(() => {
                    router.push("/login");
                  });
                }}
                className="flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold"
                style={{
                  backgroundColor: "var(--sem-trap-bg)",
                  borderColor: "var(--sem-trap-border)",
                }}
              >
                <LogOut className="h-4 w-4" />
                <span>
                  {authMode === "supabase"
                    ? "Đăng xuất tài khoản Supabase"
                    : "Đăng xuất về màn Login"}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
