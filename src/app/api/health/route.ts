import { NextResponse } from "next/server";
import os from "os";
import { isOllamaReachable, listModels } from "@/lib/ollama";

export async function GET() {
  const ollamaUp = await isOllamaReachable();
  let models: unknown[] = [];
  if (ollamaUp) {
    try {
      models = await listModels();
    } catch {
      models = [];
    }
  }

  const totalRamGb = os.totalmem() / 1024 ** 3;
  const freeRamGb = os.freemem() / 1024 ** 3;

  return NextResponse.json({
    ollamaReachable: ollamaUp,
    installedModelCount: models.length,
    hardware: {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalRamGb: Number(totalRamGb.toFixed(1)),
      freeRamGb: Number(freeRamGb.toFixed(1)),
    },
  });
}
