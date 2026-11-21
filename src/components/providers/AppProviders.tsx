"use client";

import React, { useEffect, useRef } from "react";
import { AmbientAudioEngine } from "@/components/audio/AmbientAudioEngine";
import { CommandPalette } from "@/components/overlays/CommandPalette";
import { CustomizeDrawer } from "@/components/overlays/CustomizeDrawer";
import { PwaRegistrar } from "@/components/pwa/PwaRegistrar";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAppStore } from "@/store/useAppStore";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const theme = useAppStore((s) => s.theme);
  const isTimerRunning = useAppStore((s) => s.isTimerRunning);
  const tickTimer = useAppStore((s) => s.tickTimer);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const hydrateFromSupabase = useAppStore((s) => s.hydrateFromSupabase);
  const clearSupabaseSession = useAppStore((s) => s.clearSupabaseSession);
  const toastMessage = useAppStore((s) => s.toastMessage);
  const clearToast = useAppStore((s) => s.clearToast);

  const hydratedUserRef = useRef<string | null>(null);

  // Hydrate Zustand locally first, then bind Supabase Auth session + Cloud Sync
  useEffect(() => {
    useAppStore.persist.rehydrate();

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

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

    supabase.auth.getSession().then(({ data }) => {
      syncSessionUser(data.session?.user, false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
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
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        supabase.auth.getSession().then(({ data }) => {
          syncSessionUser(data.session?.user, false);
        });
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      sub.subscription.unsubscribe();
    };
  }, [hydrateFromSupabase, clearSupabaseSession]);

  // Apply theme token dataset attribute
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Global Pomodoro tick
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
