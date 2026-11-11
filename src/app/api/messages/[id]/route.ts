import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Message } from "@/lib/types";

function deleteFromHere(id: string) {
  const msg = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id) as unknown as
    | Message
    | undefined;
  if (!msg) return;
  db.prepare(
    `DELETE FROM messages WHERE conversation_id = ? AND created_at >= ? AND id != ?`
  ).run(msg.conversation_id, msg.created_at, id);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { content, truncateAfter } = await req.json();

  db.prepare(`UPDATE messages SET content = ?, edited = 1 WHERE id = ?`).run(
    content,
    id
  );

  if (truncateAfter) {
    const msg = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id) as unknown as
      | Message
      | undefined;
    if (msg) {
      db.prepare(
        `DELETE FROM messages WHERE conversation_id = ? AND created_at > ? AND id != ?`
      ).run(msg.conversation_id, msg.created_at, id);
    }
  }

  const row = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id);
  return NextResponse.json(row);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cascade = req.nextUrl.searchParams.get("cascade") === "true";
  if (cascade) {
    deleteFromHere(id);
  }
  db.prepare(`DELETE FROM messages WHERE id = ?`).run(id);
  return NextResponse.json({ ok: true });
}
