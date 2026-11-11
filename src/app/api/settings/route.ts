import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting } from "@/lib/db";

const DEFAULTS: Record<string, string> = {
  theme: "system",
  defaultModel: "",
  defaultPersona: "default",
  ragEnabled: "true",
};

export async function GET() {
  const stored = getAllSettings();
  return NextResponse.json({ ...DEFAULTS, ...stored });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  for (const [key, value] of Object.entries(body)) {
    setSetting(key, String(value));
  }
  const stored = getAllSettings();
  return NextResponse.json({ ...DEFAULTS, ...stored });
}
