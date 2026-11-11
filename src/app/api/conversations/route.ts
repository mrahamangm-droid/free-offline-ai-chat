import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { Conversation } from "@/lib/types";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim();

  if (q) {
    const rows = db
      .prepare(
        `SELECT DISTINCT c.* FROM conversations c
         LEFT JOIN messages m ON m.conversation_id = c.id
         WHERE c.title LIKE ? OR m.content LIKE ?
         ORDER BY c.updated_at DESC`
      )
      .all(`%${q}%`, `%${q}%`) as unknown as Conversation[];
    return NextResponse.json(rows);
  }

  const rows = db
    .prepare(`SELECT * FROM conversations ORDER BY updated_at DESC`)
    .all() as unknown as Conversation[];
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const id = randomUUID();
  const now = Date.now();
  const persona = body.persona || "default";
  const model = body.model || null;

  db.prepare(
    `INSERT INTO conversations (id, title, persona, model, system_prompt, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, "New chat", persona, model, body.systemPrompt || null, now, now);

  const row = db.prepare(`SELECT * FROM conversations WHERE id = ?`).get(id);
  return NextResponse.json(row, { status: 201 });
}
