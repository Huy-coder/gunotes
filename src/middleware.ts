import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const cfg = getSupabasePublicConfig();
  if (!cfg) return response;

  const supabase = createServerClient(cfg.url, cfg.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({
          request,
        });
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
          response.cookies.set(name, value, persistentOptions);
        }
      },
    },
  });

  // Refresh session token safely without blocking Guest Demo navigation
  await supabase.auth.getUser().catch(() => {});

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
