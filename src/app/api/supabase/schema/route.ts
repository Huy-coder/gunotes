import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schemaPath = path.join(
      process.cwd(),
      "src",
      "lib",
      "repository",
      "supabase-schema.sql"
    );
    const sql = await fs.readFile(schemaPath, "utf8");
    return NextResponse.json({ sql });
  } catch {
    return NextResponse.json(
      { error: "Unable to read supabase-schema.sql" },
      { status: 500 }
    );
  }
}
