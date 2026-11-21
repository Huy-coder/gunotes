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
  Loader2,
  LogOut,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { useAppStore } from "@/store/useAppStore";

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

export function AccountCloudTab() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const theme = useAppStore((s) => s.theme);
  const defaultPaper = useAppStore((s) => s.defaultPaper);
  const noteFont = useAppStore((s) => s.noteFont);
  const binders = useAppStore((s) => s.binders);
  const notes = useAppStore((s) => s.notes);
  const resetLocalWorkspace = useAppStore((s) => s.resetLocalWorkspace);
  const signOutAndResetLocal = useAppStore((s) => s.signOutAndResetLocal);
  const authMode = useAppStore((s) => s.authMode);
  const cloudUserId = useAppStore((s) => s.cloudUserId);
  const cloudSyncStatus = useAppStore((s) => s.cloudSyncStatus);
  const cloudError = useAppStore((s) => s.cloudError);
  const hydrateFromSupabase = useAppStore((s) => s.hydrateFromSupabase);
  const showToast = useAppStore((s) => s.showToast);

  const [health, setHealth] = useState<SupabaseHealthInfo | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [sqlCopying, setSqlCopying] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    try {
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          await reg.update();
          if (reg.waiting || reg.installing) {
            showToast("Có bản cập nhật mới — đang tải lại ứng dụng...");
            window.setTimeout(() => window.location.reload(), 600);
            return;
          }
        }
      }
      showToast(`Bạn đang dùng phiên bản mới nhất (${APP_VERSION_LABEL})`);
    } catch {
      showToast(`Phiên bản hiện tại: ${APP_VERSION_LABEL}`);
    } finally {
      setCheckingUpdate(false);
    }
  };

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
    void fetchHealth();
  }, [fetchHealth]);

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
      showToast(
        "Trình duyệt không cấp quyền clipboard — hãy thử mở file SQL trực tiếp."
      );
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
    <div className="mt-6 space-y-4">
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
              Phiên bản ứng dụng: <strong>{APP_VERSION_LABEL}</strong> • Project ID:{" "}
              <strong>{health?.projectRef ?? "ifoxqhdmqnxwhdwiqxbh"}</strong> •
              Trạng thái:{" "}
              {healthLoading && !health
                ? "Đang kiểm tra..."
                : health?.connected
                ? "Đã kết nối API thành công"
                : health?.configured
                ? "Chưa kết nối được"
                : "Chưa cấu hình biến môi trường"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void handleCheckUpdate()}
              disabled={checkingUpdate}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-2.5 py-1 font-mono text-[10px] font-semibold hover:border-[var(--ink-primary)]"
              title="Kiểm tra phiên bản PWA mới nhất"
            >
              {checkingUpdate ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              <span>Kiểm tra cập nhật</span>
            </button>
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
                    Cần cập nhật thêm {health.missingColumns!.length} cột Phase
                    2 trên bảng hiện có:
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
              API kết nối tới <strong>{health.projectRef}</strong> đã thông! Bạn
              chỉ cần sao chép file SQL schema (idempotent, chạy lại an toàn
              không mất dữ liệu cũ) và bấm Run trong Supabase SQL Editor là hoàn
              tất.
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
              : "Hiện bạn đang lưu dữ liệu cục bộ trên trình duyệt."}
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
            onClick={resetLocalWorkspace}
            className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-elevated)] px-4 py-3 text-xs font-semibold hover:border-[var(--ink-primary)]"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Đặt lại dữ liệu cục bộ</span>
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
  );
}
