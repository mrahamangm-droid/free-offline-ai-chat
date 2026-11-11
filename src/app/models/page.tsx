"use client";

import { useEffect, useState } from "react";
import { Download, Trash2, Star, Cpu, MemoryStick, AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/store";
import { RECOMMENDED_MODELS } from "@/lib/ollama";
import { formatBytes } from "@/lib/utils";
import { OllamaModel } from "@/lib/types";

interface HealthInfo {
  ollamaReachable: boolean;
  hardware: { totalRamGb: number; freeRamGb: number; cpus: number; platform: string };
}

interface PullState {
  name: string;
  status: string;
  completed?: number;
  total?: number;
  error?: string;
}

export default function ModelsPage() {
  const { installedModels, refreshModels, settings, updateSettings, ollamaReachable } =
    useApp();
  const [health, setHealth] = useState<HealthInfo | null>(null);
  const [pulls, setPulls] = useState<Record<string, PullState>>({});

  async function loadHealth() {
    const res = await fetch("/api/health");
    if (res.ok) setHealth(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async load, not a sync setState
    loadHealth();
  }, []);

  async function handlePull(name: string) {
    setPulls((p) => ({ ...p, [name]: { name, status: "starting" } }));
    const res = await fetch("/api/models/pull", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.body) return;
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
          const parsed = JSON.parse(line);
          setPulls((p) => ({
            ...p,
            [name]: {
              name,
              status: parsed.status || parsed.error || "working",
              completed: parsed.completed,
              total: parsed.total,
              error: parsed.error,
            },
          }));
        } catch {
          /* ignore */
        }
      }
    }
    await refreshModels();
    setTimeout(() => {
      setPulls((p) => {
        const next = { ...p };
        delete next[name];
        return next;
      });
    }, 2000);
  }

  async function handleDelete(name: string) {
    if (!confirm(`Delete ${name}? You'll need to re-download it to use it again.`)) return;
    await fetch(`/api/models/${encodeURIComponent(name)}`, { method: "DELETE" });
    await refreshModels();
  }

  const installedNames = new Set(installedModels.map((m) => m.name));

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:pl-8 pl-16">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <h1 className="text-xl font-semibold">Model Library</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Download and manage local AI models. Everything runs on this computer — no
            API keys, no subscriptions.
          </p>
        </div>

        {!ollamaReachable && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
            <AlertTriangle size={16} />
            Ollama isn&apos;t reachable at localhost:11434. Start the Ollama service, then
            refresh this page.
          </div>
        )}

        {health && (
          <div className="flex gap-4 rounded-lg border border-border-color bg-surface px-4 py-3 text-sm">
            <div className="flex items-center gap-1.5">
              <MemoryStick size={14} /> {health.hardware.freeRamGb} GB free /{" "}
              {health.hardware.totalRamGb} GB RAM
            </div>
            <div className="flex items-center gap-1.5">
              <Cpu size={14} /> {health.hardware.cpus} CPU cores
            </div>
          </div>
        )}

        <section>
          <h2 className="text-sm font-medium text-foreground/60 mb-2">
            Installed ({installedModels.length})
          </h2>
          {installedModels.length === 0 ? (
            <p className="text-sm text-foreground/40">No models installed yet.</p>
          ) : (
            <div className="space-y-2">
              {installedModels.map((m: OllamaModel) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between rounded-lg border border-border-color bg-surface px-3 py-2.5"
                >
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-foreground/50">
                      {formatBytes(m.size)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateSettings({ defaultModel: m.name })}
                      className="text-xs px-2 py-1 rounded-md border border-border-color flex items-center gap-1 hover:bg-background"
                      title="Set as default"
                    >
                      <Star
                        size={13}
                        className={settings.defaultModel === m.name ? "fill-current" : ""}
                      />
                      {settings.defaultModel === m.name ? "Default" : "Set default"}
                    </button>
                    <button
                      onClick={() => handleDelete(m.name)}
                      className="p-1.5 text-foreground/50 hover:text-red-500"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground/60 mb-2">Recommended</h2>
          <div className="space-y-2">
            {RECOMMENDED_MODELS.map((m) => {
              const installed = installedNames.has(m.name);
              const pull = pulls[m.name];
              return (
                <div
                  key={m.name}
                  className="rounded-lg border border-border-color bg-surface px-3 py-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="text-xs text-foreground/50">
                        ~{m.approxSizeGb} GB &middot; needs ~{m.minRamGb} GB RAM &middot;{" "}
                        {m.notes}
                      </div>
                    </div>
                    {installed ? (
                      <span className="text-xs text-green-500">Installed</span>
                    ) : (
                      <button
                        disabled={!!pull}
                        onClick={() => handlePull(m.name)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-foreground text-background disabled:opacity-50"
                      >
                        <Download size={13} /> Download
                      </button>
                    )}
                  </div>
                  {pull && (
                    <div className="mt-2 text-xs text-foreground/60">
                      {pull.error ? (
                        <span className="text-red-500">{pull.error}</span>
                      ) : (
                        <>
                          {pull.status}
                          {pull.total ? (
                            <div className="mt-1 h-1.5 w-full rounded-full bg-background overflow-hidden">
                              <div
                                className="h-full bg-foreground"
                                style={{
                                  width: `${Math.min(
                                    100,
                                    ((pull.completed ?? 0) / pull.total) * 100
                                  )}%`,
                                }}
                              />
                            </div>
                          ) : null}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-foreground/40 mt-3">
            First-time downloads require an internet connection. Once downloaded, models
            run fully offline. Never download a large model without checking it fits your
            available RAM above.
          </p>
        </section>
      </div>
    </div>
  );
}
