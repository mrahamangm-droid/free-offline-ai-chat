import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Conversation, Message } from "@/lib/types";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conversation = db
    .prepare(`SELECT * FROM conversations WHERE id = ?`)
    .get(id) as unknown as Conversation | undefined;
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const messages = db
    .prepare(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
    )
    .all(id) as unknown as Message[];
  return NextResponse.json({ ...conversation, messages });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const now = Date.now();

  if (typeof body.title === "string") {
    db.prepare(`UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?`).run(
      body.title,
      now,
      id
    );
  }
  if (typeof body.model === "string") {
    db.prepare(`UPDATE conversations SET model = ?, updated_at = ? WHERE id = ?`).run(
      body.model,
      now,
      id
    );
  }
  if (typeof body.persona === "string") {
    db.prepare(`UPDATE conversations SET persona = ?, updated_at = ? WHERE id = ?`).run(
      body.persona,
      now,
      id
    );
  }

  const row = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id);
  return NextResponse.json(row);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare(`DELETE FROM conversations WHERE id = ?`).run(id);
  return NextResponse.json({ ok: true });
}
