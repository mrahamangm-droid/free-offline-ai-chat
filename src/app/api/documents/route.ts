import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import db from "@/lib/db";
import { chunkText } from "@/lib/rag";
import { DocumentRecord } from "@/lib/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
  "text/csv",
  "application/json",
]);

export async function GET() {
  const rows = db
    .prepare(
      `SELECT id, filename, mime, size, created_at, chunks FROM documents ORDER BY created_at DESC`
    )
    .all() as unknown as { id: string; filename: string; mime: string; size: number; created_at: number; chunks: string }[];

  const docs: DocumentRecord[] = rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    mime: r.mime,
    size: r.size,
    created_at: r.created_at,
    chunk_count: JSON.parse(r.chunks).length,
  }));
  return NextResponse.json(docs);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File exceeds 10 MB limit" }, { status: 413 });
  }

  const mime = file.type || "application/octet-stream";
  const isPdf = mime === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isAllowed = ALLOWED_TYPES.has(mime) || isPdf || /\.(txt|md|csv|json)$/i.test(file.name);
  if (!isAllowed) {
    return NextResponse.json(
      { error: "Unsupported file type. Use .txt, .md, .csv, .json, or .pdf" },
      { status: 415 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let text: string;

  if (isPdf) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buf });
    const result = await parser.getText();
    await parser.destroy();
    text = result.text;
  } else {
    text = buf.toString("utf-8");
  }

  text = text.slice(0, 2_000_000); // hard safety cap on extracted text
  const chunks = chunkText(text);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO documents (id, filename, mime, size, content, chunks, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(id, file.name, mime, file.size, text, JSON.stringify(chunks), Date.now());

  return NextResponse.json(
    { id, filename: file.name, chunk_count: chunks.length },
    { status: 201 }
  );
}
