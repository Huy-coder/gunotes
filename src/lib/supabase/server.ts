import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

/**
 * Per-request Supabase SSR client bound to Next.js 15 request cookies.
 */
export async function createSupabaseServerClient() {
  const cfg = getSupabasePublicConfig();
  if (!cfg) return null;

  const cookieStore = await cookies();

  return createServerClient(cfg.url, cfg.publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            const persistentOptions = {
              ...options,
              path: options?.path ?? "/",
              sameSite: options?.sameSite ?? ("lax" as const),
              maxAge:
                options?.maxAge === 0
                  ? 0
                  : options?.maxAge ?? 60 * 60 * 24 * 365,
            };
            cookieStore.set(name, value, persistentOptions);
          }
        } catch {
          // Safe no-op when invoked inside read-only Server Component render
        }
      },
    },
  });
}

/**
 * Server-only Admin Supabase client using SUPABASE_SECRET_KEY (bypasses RLS).
 * NEVER import this module in any `"use client"` file.
 */
export function createSupabaseAdminClient() {
  const cfg = getSupabasePublicConfig();
  const secretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (!cfg || !secretKey) return null;

  return createClient(cfg.url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
