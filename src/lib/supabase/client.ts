"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

let browserClient: SupabaseClient | null = null;

/**
 * Singleton browser Supabase client using public publishable/anon key (subject to RLS).
 * Uses persistent 1-year cookie options so killed PWAs/mobile browsers keep the user signed in.
 * Returns null gracefully if env vars are missing.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (browserClient) return browserClient;

  const cfg = getSupabasePublicConfig();
  if (!cfg) return null;

  browserClient = createBrowserClient(cfg.url, cfg.publishableKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: window.location.protocol === "https:",
      maxAge: ONE_YEAR_SECONDS,
    },
  });
  return browserClient;
}
