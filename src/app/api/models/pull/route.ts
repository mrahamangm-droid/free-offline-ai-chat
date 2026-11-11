import { NextRequest } from "next/server";
import { pullModel } from "@/lib/ollama";

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name || typeof name !== "string") {
    return new Response(JSON.stringify({ error: "Missing model name" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        await pullModel(name, (progress) => {
          controller.enqueue(encoder.encode(JSON.stringify(progress) + "\n"));
        });
        controller.close();
      } catch (err) {
        controller.enqueue(
          encoder.encode(JSON.stringify({ error: String(err) }) + "\n")
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
    },
  });
}
