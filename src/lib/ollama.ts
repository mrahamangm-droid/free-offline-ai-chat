const OLLAMA_HOST = process.env.OLLAMA_HOST_URL || "http://127.0.0.1:11434";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function isOllamaReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/version`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listModels() {
  const res = await fetch(`${OLLAMA_HOST}/api/tags`);
  if (!res.ok) throw new Error(`Ollama /api/tags failed: ${res.status}`);
  const data = await res.json();
  return data.models ?? [];
}

export async function deleteModel(name: string) {
  const res = await fetch(`${OLLAMA_HOST}/api/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to delete model: ${text}`);
  }
}

/** Streams newline-delimited JSON progress events from Ollama's pull endpoint. */
export async function pullModel(
  name: string,
  onProgress: (line: Record<string, unknown>) => void,
  signal?: AbortSignal
) {
  const res = await fetch(`${OLLAMA_HOST}/api/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: name, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to start pull: ${res.status}`);
  }
  const reader = res.body.getReader();
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
      try {
        onProgress(JSON.parse(line));
      } catch {
        // ignore malformed line
      }
    }
  }
}

/** Streams a chat completion from Ollama. Returns the raw ReadableStream of NDJSON lines. */
export async function streamChat(
  model: string,
  messages: ChatMessage[],
  signal?: AbortSignal
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) {
    const text = res.body ? "" : await res.text().catch(() => "");
    throw new Error(`Ollama chat failed: ${res.status} ${text}`);
  }
  return res.body;
}

export const RECOMMENDED_MODELS = [
  {
    name: "llama3.2:1b",
    label: "Llama 3.2 1B",
    approxSizeGb: 1.3,
    minRamGb: 4,
    notes: "Smallest, fastest. Good for low-RAM machines.",
  },
  {
    name: "llama3.2:3b",
    label: "Llama 3.2 3B",
    approxSizeGb: 2.0,
    minRamGb: 8,
    notes: "Good balance of speed and quality.",
  },
  {
    name: "qwen2.5:7b",
    label: "Qwen 2.5 7B",
    approxSizeGb: 4.7,
    minRamGb: 8,
    notes: "Strong general + coding performance.",
  },
  {
    name: "deepseek-r1:7b",
    label: "DeepSeek R1 7B",
    approxSizeGb: 4.7,
    minRamGb: 8,
    notes: "Reasoning-focused model.",
  },
  {
    name: "gemma2:9b",
    label: "Gemma 2 9B",
    approxSizeGb: 5.5,
    minRamGb: 12,
    notes: "Google's open model, solid all-rounder.",
  },
  {
    name: "mistral:7b",
    label: "Mistral 7B",
    approxSizeGb: 4.1,
    minRamGb: 8,
    notes: "Fast, well-rounded open model.",
  },
  {
    name: "phi3:mini",
    label: "Phi-3 Mini",
    approxSizeGb: 2.2,
    minRamGb: 6,
    notes: "Compact Microsoft model, decent reasoning for its size.",
  },
];
