"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

let browserClient: SupabaseClient | null = null;

/**
 * Singleton browser Supabase client using public publishable/anon key (subject to RLS).
 * Returns null gracefully if env vars are missing.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") return null;
  if (browserClient) return browserClient;

  const cfg = getSupabasePublicConfig();
  if (!cfg) return null;

  browserClient = createBrowserClient(cfg.url, cfg.publishableKey);
  return browserClient;
}
