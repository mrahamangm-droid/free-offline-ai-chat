import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { Conversation, Message } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") || "md";

  const conversation = db
    .prepare(`SELECT * FROM conversations WHERE id = ?`)
    .get(id) as unknown as Conversation | undefined;
  if (!conversation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const messages = db
    .prepare(`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`)
    .all(id) as unknown as Message[];

  const safeTitle = conversation.title.replace(/[^a-z0-9-_]+/gi, "_").slice(0, 60);

  if (format === "json") {
    return new NextResponse(JSON.stringify({ ...conversation, messages }, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${safeTitle}.json"`,
      },
    });
  }

  if (format === "txt") {
    const body = messages
      .map((m) => `${m.role.toUpperCase()}:\n${m.content}\n`)
      .join("\n---\n\n");
    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename="${safeTitle}.txt"`,
      },
    });
  }

  // markdown (default)
  const body =
    `# ${conversation.title}\n\n` +
    messages
      .map(
        (m) =>
          `### ${m.role === "user" ? "You" : "Assistant"}\n\n${m.content}\n`
      )
      .join("\n");
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/markdown",
      "Content-Disposition": `attachment; filename="${safeTitle}.md"`,
    },
  });
}
