import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import db from "@/lib/db";

export async function GET() {
  const dataDir = process.env.APP_DATA_DIR || path.join(process.cwd(), "data");
  const dbPath = path.join(dataDir, "app.db");
  let dbSizeBytes = 0;
  try {
    dbSizeBytes = fs.statSync(dbPath).size;
  } catch {
    dbSizeBytes = 0;
  }
  const counts = db
    .prepare(
      `SELECT
        (SELECT COUNT(*) FROM conversations) AS conversations,
        (SELECT COUNT(*) FROM messages) AS messages,
        (SELECT COUNT(*) FROM documents) AS documents`
    )
    .get();
  return NextResponse.json({ dbSizeBytes, counts });
}

export async function DELETE() {
  db.exec(`DELETE FROM messages; DELETE FROM conversations; DELETE FROM documents;`);
  return NextResponse.json({ ok: true });
}
