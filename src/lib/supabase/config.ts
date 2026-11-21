export function getSupabasePublicConfig(): {
  url: string;
  publishableKey: string;
} | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const publishableKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicConfig() !== null;
}

export function getSupabaseProjectRef(): string | null {
  const cfg = getSupabasePublicConfig();
  if (!cfg) return null;
  try {
    const hostname = new URL(cfg.url).hostname;
    return hostname.split(".")[0] ?? null;
  } catch {
    return null;
  }
}
