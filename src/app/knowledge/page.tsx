"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, FileText } from "lucide-react";
import { formatBytes, formatRelativeTime } from "@/lib/utils";
import { DocumentRecord } from "@/lib/types";

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/documents");
    if (res.ok) setDocuments(await res.json());
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async load, not a sync setState
    load();
  }, []);

  async function handleUpload(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/documents", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "Upload failed" }));
      setError(data.error || "Upload failed");
      return;
    }
    await load();
  }

  async function handleDelete(id: string) {
    if (!confirm("Remove this document from the knowledge base?")) return;
    await fetch(`/api/documents/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-6 md:pl-8 pl-16">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Knowledge Base</h1>
          <p className="text-sm text-foreground/60 mt-1">
            Upload local documents so the AI can answer questions about them. Everything
            stays on this computer and is matched to your questions with local keyword
            search — nothing is sent anywhere.
          </p>
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleUpload(f);
          }}
          className="rounded-xl border-2 border-dashed border-border-color p-8 text-center"
        >
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,.csv,.json,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
              e.target.value = "";
            }}
          />
          <Upload size={24} className="mx-auto mb-2 text-foreground/40" />
          <p className="text-sm text-foreground/60 mb-3">
            Drag a file here, or click to choose one (.txt, .md, .csv, .json, .pdf — up
            to 10 MB)
          </p>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="rounded-md bg-foreground text-background text-sm px-3 py-1.5 disabled:opacity-50"
          >
            {uploading ? "Uploading…" : "Choose file"}
          </button>
          {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
        </div>

        <section className="space-y-2">
          {documents.length === 0 ? (
            <p className="text-sm text-foreground/40">No documents yet.</p>
          ) : (
            documents.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between rounded-lg border border-border-color bg-surface px-3 py-2.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={16} className="shrink-0 text-foreground/50" />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{d.filename}</div>
                    <div className="text-xs text-foreground/50">
                      {formatBytes(d.size)} &middot; {d.chunk_count} chunks &middot;{" "}
                      {formatRelativeTime(d.created_at)}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1.5 text-foreground/50 hover:text-red-500 shrink-0"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
