import { NextResponse } from "next/server";
import { listModels, RECOMMENDED_MODELS, isOllamaReachable } from "@/lib/ollama";

export async function GET() {
  const reachable = await isOllamaReachable();
  if (!reachable) {
    return NextResponse.json(
      { installed: [], recommended: RECOMMENDED_MODELS, ollamaReachable: false },
      { status: 200 }
    );
  }
  try {
    const installed = await listModels();
    return NextResponse.json({
      installed,
      recommended: RECOMMENDED_MODELS,
      ollamaReachable: true,
    });
  } catch (err) {
    return NextResponse.json(
      { error: String(err), ollamaReachable: false },
      { status: 502 }
    );
  }
}
