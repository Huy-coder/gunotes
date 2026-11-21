import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase PKCE OAuth / Magic Link / Email Confirmation callback handler.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/workspace";
  const safeNext = nextParam.startsWith("/") ? nextParam : "/workspace";

  if (code) {
    const supabase = await createSupabaseServerClient();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(
          new URL("/login?error=auth_callback_failed", url.origin)
        );
      }
    }
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
