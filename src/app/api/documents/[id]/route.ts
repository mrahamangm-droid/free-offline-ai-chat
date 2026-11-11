import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare(`DELETE FROM documents WHERE id = ?`).run(id);
  return NextResponse.json({ ok: true });
}
