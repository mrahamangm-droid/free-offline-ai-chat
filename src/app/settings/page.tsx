"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, Monitor, Download, Trash2, ShieldCheck } from "lucide-react";
import { useApp } from "@/lib/store";
import { PERSONAS } from "@/lib/personas";
import { formatBytes } from "@/lib/utils";

function applyTheme(theme: string) {
  const isDark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  try {
    localStorage.setItem("theme", theme);
  } catch {
    /* ignore */
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings, installedModels } = useApp();
  const [stats, setStats] = useState<{
    dbSizeBytes: number;
    counts: { conversations: number; messages: number; documents: number };
  } | null>(null);

  async function loadStats() {
    const res = await fetch("/api/data");
    if (res.ok) setStats(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async load, not a sync setState
    loadStats();
  }, []);

  async function handleClearData() {
    if (
      !confirm(
        "This permanently deletes all conversations, messages, and uploaded documents on this computer. Continue?"
      )
    )
      return;
    await fetch("/api/data", { method: "DELETE" });
    await loadStats();
    router.push("/");
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:pl-8 pl-16">
      <div className="mx-auto max-w-2xl space-y-8">
        <h1 className="text-xl font-semibold">Settings</h1>

        <section>
          <h2 className="text-sm font-medium text-foreground/60 mb-2">Theme</h2>
          <div className="flex gap-2">
            {[
              { id: "light", icon: Sun, label: "Light" },
              { id: "dark", icon: Moon, label: "Dark" },
              { id: "system", icon: Monitor, label: "System" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  updateSettings({ theme: t.id });
                  applyTheme(t.id);
                }}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm ${
                  settings.theme === t.id
                    ? "border-foreground"
                    : "border-border-color hover:bg-surface"
                }`}
              >
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground/60 mb-2">Defaults</h2>
          <div className="space-y-3">
            <label className="block text-sm">
              Default model
              <select
                value={settings.defaultModel}
                onChange={(e) => updateSettings({ defaultModel: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border-color bg-surface px-2 py-1.5"
              >
                <option value="">(use first installed model)</option>
                {installedModels.map((m) => (
                  <option key={m.name} value={m.name}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              Default persona
              <select
                value={settings.defaultPersona}
                onChange={(e) => updateSettings({ defaultPersona: e.target.value })}
                className="mt-1 w-full rounded-lg border border-border-color bg-surface px-2 py-1.5"
              >
                {PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={settings.ragEnabled !== "false"}
                onChange={(e) =>
                  updateSettings({ ragEnabled: e.target.checked ? "true" : "false" })
                }
              />
              Use knowledge base documents by default
            </label>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground/60 mb-2">Storage</h2>
          {stats && (
            <div className="rounded-lg border border-border-color bg-surface px-3 py-2.5 text-sm space-y-1">
              <div>Database size: {formatBytes(stats.dbSizeBytes)}</div>
              <div>Conversations: {stats.counts.conversations}</div>
              <div>Messages: {stats.counts.messages}</div>
              <div>Documents: {stats.counts.documents}</div>
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <a
              href="/api/backup"
              className="flex items-center gap-1.5 text-sm rounded-md border border-border-color px-3 py-1.5 hover:bg-surface"
            >
              <Download size={14} /> Export backup (JSON)
            </a>
            <button
              onClick={handleClearData}
              className="flex items-center gap-1.5 text-sm rounded-md border border-red-500/40 text-red-500 px-3 py-1.5 hover:bg-red-500/10"
            >
              <Trash2 size={14} /> Clear all data
            </button>
          </div>
        </section>

        <section>
          <h2 className="text-sm font-medium text-foreground/60 mb-2">Privacy</h2>
          <div className="flex gap-2 rounded-lg border border-border-color bg-surface px-3 py-2.5 text-sm text-foreground/70">
            <ShieldCheck size={16} className="shrink-0 mt-0.5" />
            <div>
              Conversations, documents, and settings are stored only in a local SQLite
              database on this computer. No account is required, nothing is sent to any
              server, and there is no analytics or telemetry. The only time this app
              reaches the internet is when you explicitly choose to download a model in
              the Model Library.
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
