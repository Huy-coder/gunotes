import { NextResponse } from "next/server";
import { mapNoteRow, type DbNoteRow } from "@/lib/repository/supabase/types-and-mappers";
import { isUuid } from "@/lib/repository/supabase-sync";
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  context: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await context.params;
  if (!noteId || !isUuid(noteId)) {
    return NextResponse.json({ error: "Invalid note id" }, { status: 400 });
  }

  const client =
    createSupabaseAdminClient() ?? (await createSupabaseServerClient());
  if (!client) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 }
    );
  }

  const { data, error } = await client
    .from("notes")
    .select("*")
    .eq("id", noteId)
    .eq("is_public", true)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Trang ghi chú chưa được chia sẻ công khai." },
      { status: 404 }
    );
  }

  return NextResponse.json({ note: mapNoteRow(data as DbNoteRow) });
}
