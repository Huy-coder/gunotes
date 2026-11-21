import { NextResponse } from "next/server";
import { getSupabaseProjectRef } from "@/lib/supabase/config";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const TABLE_PROBES: ReadonlyArray<{ table: string; columns: string }> = [
  {
    table: "profiles",
    columns: "id,email,today_focus_minutes,focus_tasks",
  },
  {
    table: "binders",
    columns: "id,title,stickers",
  },
  {
    table: "notes",
    columns: "id,blocks,block_links",
  },
  {
    table: "flashcards",
    columns: "id,note_title,due_label,is_due,created_at",
  },
  {
    table: "study_sessions",
    columns: "id,duration_minutes",
  },
];

export async function GET() {
  const projectRef = getSupabaseProjectRef();
  const admin = createSupabaseAdminClient();

  if (!admin || !projectRef) {
    return NextResponse.json({
      configured: false,
      connected: false,
      projectRef,
      schemaReady: false,
      missingTables: TABLE_PROBES.map((p) => p.table),
      missingColumns: [] as string[],
      checkedAt: new Date().toISOString(),
    });
  }

  const missingTables: string[] = [];
  const missingColumns: string[] = [];
  let connected = false;
  let networkError: string | null = null;

  try {
    // Use GET `.limit(1)` without `{ head: true }` so PostgREST includes full JSON error messages
    const results = await Promise.all(
      TABLE_PROBES.map(async ({ table, columns }) => {
        const res = await admin.from(table).select(columns).limit(1);
        return { table, status: res.status, error: res.error };
      })
    );

    connected = true;

    for (const r of results) {
      if (!r.error) continue;
      const msg = r.error.message ?? "";
      const lower = msg.toLowerCase();
      const code = r.error.code ?? "";

      if (r.status === 401 || r.status === 403) {
        connected = false;
        networkError = msg || `Auth error (HTTP ${r.status})`;
        continue;
      }

      if (
        code === "42P01" ||
        code === "PGRST205" ||
        lower.includes("could not find the table") ||
        (lower.includes("relation") && lower.includes("does not exist")) ||
        r.status === 404
      ) {
        missingTables.push(r.table);
      } else if (
        code === "42703" ||
        code === "PGRST204" ||
        lower.includes("column") ||
        lower.includes("could not find") ||
        lower.includes("does not exist") ||
        r.status === 400
      ) {
        missingColumns.push(`${r.table}: ${msg || `HTTP ${r.status}`}`);
      } else {
        connected = false;
        networkError = msg || `HTTP ${r.status}`;
      }
    }
  } catch (err) {
    connected = false;
    networkError = err instanceof Error ? err.message : "Connection failed";
  }

  return NextResponse.json({
    configured: true,
    connected,
    projectRef,
    schemaReady:
      connected && missingTables.length === 0 && missingColumns.length === 0,
    missingTables,
    missingColumns,
    error: networkError,
    checkedAt: new Date().toISOString(),
  });
}
