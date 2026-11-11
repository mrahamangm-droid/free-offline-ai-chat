import { NextResponse } from "next/server";
import db, { getAllSettings } from "@/lib/db";

export async function GET() {
  const conversations = db.prepare(`SELECT * FROM conversations`).all();
  const messages = db.prepare(`SELECT * FROM messages`).all();
  const documents = db.prepare(`SELECT * FROM documents`).all();
  const settings = getAllSettings();

  const payload = {
    exportedAt: new Date().toISOString(),
    conversations,
    messages,
    documents,
    settings,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="offline-ai-chat-backup.json"`,
    },
  });
}
