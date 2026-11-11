import { NextResponse } from "next/server";
import { deleteModel } from "@/lib/ollama";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  try {
    await deleteModel(decodeURIComponent(name));
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
