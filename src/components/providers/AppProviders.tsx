"use client";

import React, { useEffect, useRef } from "react";
import { AmbientAudioEngine } from "@/components/audio/AmbientAudioEngine";
import { CommandPalette } from "@/components/overlays/CommandPalette";
import { CustomizeDrawer } from "@/components/overlays/CustomizeDrawer";
import { PwaRegistrar } from "@/components/pwa/PwaRegistrar";
import {
  flushAllPendingNotes,
  mapBinderRow,
  mapNoteRow,
  type DbBinderRow,
  type DbNoteRow,
} from "@/lib/repository/supabase-sync";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);
  const isTimerRunning = useAppStore((s) => s.isTimerRunning);
  const cloudUserId = useAppStore((s) => s.cloudUserId);
  const authMode = useAppStore((s) => s.authMode);
  const tickTimer = useAppStore((s) => s.tickTimer);
  const syncTimerFromClock = useAppStore((s) => s.syncTimerFromClock);
  const refreshDueFlashcards = useAppStore((s) => s.refreshDueFlashcards);
  const flushPendingOfflineSync = useAppStore(
    (s) => s.flushPendingOfflineSync
  );
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const hydrateFromSupabase = useAppStore((s) => s.hydrateFromSupabase);
  const clearSupabaseSession = useAppStore((s) => s.clearSupabaseSession);
  const toastMessage = useAppStore((s) => s.toastMessage);
  const clearToast = useAppStore((s) => s.clearToast);

  const hydratedUserRef = useRef<string | null>(null);

  // Hydrate Zustand locally first, then bind Supabase Auth session + Offline Sync
  useEffect(() => {
    useAppStore.persist.rehydrate();
    syncTimerFromClock();
    refreshDueFlashcards();

    const supabase = getSupabaseBrowserClient();

    let active = true;

    const getFullName = (u: { user_metadata?: unknown }) => {
      const meta = u.user_metadata as Record<string, unknown> | undefined;
      return typeof meta?.full_name === "string"
        ? meta.full_name
        : typeof meta?.name === "string"
        ? meta.name
        : undefined;
    };

    const syncSessionUser = (
      u: { id: string; email?: string; user_metadata?: unknown } | undefined,
      force = false
    ) => {
      if (!active || !u) return;
      if (!force && hydratedUserRef.current === u.id) return;
      hydratedUserRef.current = u.id;
      void hydrateFromSupabase(u.id, u.email ?? "", getFullName(u));
    };

    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        syncSessionUser(data.session?.user, false);
      });
    }

    const sub = supabase
      ? supabase.auth.onAuthStateChange((event, session) => {
          if (!active) return;
          if (event === "SIGNED_OUT") {
            hydratedUserRef.current = null;
            clearSupabaseSession();
            return;
          }
          if (event === "USER_UPDATED") {
            syncSessionUser(session?.user, true);
            return;
          }
          if (
            event === "INITIAL_SESSION" ||
            event === "SIGNED_IN" ||
            event === "TOKEN_REFRESHED"
          ) {
            syncSessionUser(session?.user, false);
          }
        }).data
      : null;

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void flushAllPendingNotes();
        return;
      }
      if (document.visibilityState === "visible") {
        syncTimerFromClock();
        refreshDueFlashcards();
        void flushPendingOfflineSync();
        if (supabase) {
          supabase.auth.getSession().then(({ data }) => {
            syncSessionUser(data.session?.user, false);
          });
        }
      }
    };

    const onOnline = () => {
      void flushPendingOfflineSync();
    };

    const onPageHide = () => {
      void flushAllPendingNotes();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("online", onOnline);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("pagehide", onPageHide);
      sub?.subscription.unsubscribe();
    };
  }, [
    hydrateFromSupabase,
    clearSupabaseSession,
    syncTimerFromClock,
    refreshDueFlashcards,
    flushPendingOfflineSync,
  ]);

  // Supabase Realtime multi-device sync on notes & binders
  useEffect(() => {
    if (authMode !== "supabase" || !cloudUserId) return;
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`gunotes-rt-${cloudUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notes",
          filter: `user_id=eq.${cloudUserId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE" && payload.old?.id) {
            useAppStore.setState((s) => ({
              notes: s.notes.filter((n) => n.id !== payload.old.id),
            }));
            return;
          }
          if (
            (payload.eventType === "INSERT" || payload.eventType === "UPDATE") &&
            payload.new
          ) {
            const incoming = mapNoteRow(payload.new as DbNoteRow);
            useAppStore.setState((s) => {
              const existing = s.notes.find((n) => n.id === incoming.id);
              if (
                existing?.updatedAtIso &&
                incoming.updatedAtIso &&
                Date.parse(existing.updatedAtIso) >=
                  Date.parse(incoming.updatedAtIso)
              ) {
                return s;
              }
              return {
                notes: existing
                  ? s.notes.map((n) => (n.id === incoming.id ? incoming : n))
                  : [incoming, ...s.notes],
              };
            });
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "binders",
          filter: `user_id=eq.${cloudUserId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE" && payload.old?.id) {
            useAppStore.setState((s) => ({
              binders: s.binders.filter((b) => b.id !== payload.old.id),
            }));
            return;
          }
          if (
            (payload.eventType === "INSERT" || payload.eventType === "UPDATE") &&
            payload.new
          ) {
            const incoming = mapBinderRow(payload.new as DbBinderRow);
            useAppStore.setState((s) => {
              const exists = s.binders.some((b) => b.id === incoming.id);
              return {
                binders: exists
                  ? s.binders.map((b) => (b.id === incoming.id ? incoming : b))
                  : [incoming, ...s.binders],
              };
            });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [authMode, cloudUserId]);

  // Apply theme token dataset attribute
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Global Pomodoro tick (timestamp-accurate even after sleep/backgrounding)
  useEffect(() => {
    if (!isTimerRunning) return;
    const id = window.setInterval(() => {
      tickTimer();
    }, 1000);
    return () => window.clearInterval(id);
  }, [isTimerRunning, tickTimer]);

  // Global Cmd/Ctrl + K & Escape shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!useAppStore.getState().commandPaletteOpen);
      } else if (e.key === "Escape") {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setCommandPaletteOpen]);

  // Auto-dismiss subtle toast notifications
  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => clearToast(), 2800);
    return () => window.clearTimeout(t);
  }, [toastMessage, clearToast]);

  return (
    <>
      {children}
      <AmbientAudioEngine />
      <CommandPalette />
      <CustomizeDrawer />
      <PwaRegistrar />
      {toastMessage && (
        <div className="no-print fixed right-4 bottom-20 z-50 rounded-full border border-[var(--border-hairline)] bg-[var(--ink-primary)] px-4 py-2 text-xs font-medium text-[var(--bg-paper)] shadow-lg lg:bottom-6">
          {toastMessage}
        </div>
      )}
    </>
  );
}
