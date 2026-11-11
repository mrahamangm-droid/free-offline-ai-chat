import { NextRequest } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { Conversation, Message } from "@/lib/types";
import { getPersona } from "@/lib/personas";
import { streamChat, ChatMessage } from "@/lib/ollama";
import { retrieveRelevantChunks, buildRagContext, Chunk } from "@/lib/rag";

function autoTitle(content: string): string {
  const oneLine = content.replace(/\s+/g, " ").trim();
  return oneLine.length > 48 ? oneLine.slice(0, 48) + "…" : oneLine || "New chat";
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { conversationId, content, model, useRag } = body as {
    conversationId: string;
    content?: string;
    model: string;
    useRag?: boolean;
  };

  const conversation = db
    .prepare(`SELECT * FROM conversations WHERE id = ?`)
    .get(conversationId) as unknown as Conversation | undefined;

  if (!conversation) {
    return new Response(JSON.stringify({ error: "Conversation not found" }), {
      status: 404,
    });
  }

  const now = Date.now();

  if (content && content.trim()) {
    db.prepare(
      `INSERT INTO messages (id, conversation_id, role, content, created_at, edited)
       VALUES (?, ?, 'user', ?, ?, 0)`
    ).run(randomUUID(), conversationId, content, now);

    if (conversation.title === "New chat") {
      db.prepare(`UPDATE conversations SET title = ? WHERE id = ?`).run(
        autoTitle(content),
        conversationId
      );
    }
  }

  const history = db
    .prepare(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`
    )
    .all(conversationId) as unknown as Message[];

  const persona = getPersona(conversation.persona);
  let systemPrompt = conversation.system_prompt || persona.systemPrompt;

  if (useRag && content) {
    const docs = (
      db.prepare(`SELECT id, filename, chunks FROM documents`).all() as unknown as {
        id: string;
        filename: string;
        chunks: string;
      }[]
    ).map((d) => ({
      id: d.id,
      filename: d.filename,
      chunks: JSON.parse(d.chunks) as Chunk[],
    }));
    const matches = retrieveRelevantChunks(content, docs, 4);
    const ragContext = buildRagContext(matches);
    if (ragContext) systemPrompt = `${systemPrompt}\n\n${ragContext}`;
  }

  const chatMessages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content }) as ChatMessage),
  ];

  const encoder = new TextEncoder();
  let fullText = "";
  const assistantId = randomUUID();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const upstream = await streamChat(model, chatMessages, req.signal);
        const reader = upstream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            const parsed = JSON.parse(line);
            const delta: string = parsed?.message?.content ?? "";
            if (delta) {
              fullText += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }
        }

        db.prepare(
          `INSERT INTO messages (id, conversation_id, role, content, model, created_at, edited)
           VALUES (?, ?, 'assistant', ?, ?, ?, 0)`
        ).run(assistantId, conversationId, fullText, model, Date.now());
        db.prepare(`UPDATE conversations SET updated_at = ?, model = ? WHERE id = ?`).run(
          Date.now(),
          model,
          conversationId
        );

        controller.close();
      } catch (err) {
        if (fullText) {
          db.prepare(
            `INSERT INTO messages (id, conversation_id, role, content, model, created_at, edited)
             VALUES (?, ?, 'assistant', ?, ?, ?, 0)`
          ).run(assistantId, conversationId, fullText, model, Date.now());
        }
        controller.enqueue(
          encoder.encode(`\n\n[Error: ${String((err as Error)?.message ?? err)}]`)
        );
        controller.close();
      }
    },
    cancel() {
      if (fullText) {
        db.prepare(
          `INSERT INTO messages (id, conversation_id, role, content, model, created_at, edited)
           VALUES (?, ?, 'assistant', ?, ?, ?, 0)`
        ).run(assistantId, conversationId, fullText, model, Date.now());
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
      "X-Assistant-Message-Id": assistantId,
    },
  });
}
