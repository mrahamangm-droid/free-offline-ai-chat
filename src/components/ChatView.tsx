"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Download, FileText, X } from "lucide-react";
import { useApp } from "@/lib/store";
import { getPersona, PERSONAS } from "@/lib/personas";
import { ConversationWithMessages, Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";
import Welcome from "./Welcome";

export default function ChatView({ conversationId }: { conversationId: string | null }) {
  const { installedModels, settings, refreshConversations, ollamaReachable } = useApp();
  const router = useRouter();

  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [modelOverride, setModelOverride] = useState<string | null>(null);
  const [personaOverride, setPersonaOverride] = useState<string | null>(null);
  const [useRagOverride, setUseRagOverride] = useState<boolean | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [pickerOpen, setPickerOpen] = useState<"model" | "persona" | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const model =
    modelOverride ?? conversation?.model ?? settings.defaultModel ?? installedModels[0]?.name ?? "";
  const personaId = personaOverride ?? conversation?.persona ?? settings.defaultPersona ?? "default";
  const useRag = useRagOverride ?? settings.ragEnabled !== "false";

  const loadConversation = useCallback(async () => {
    if (!conversationId) {
      setConversation(null);
      setMessages([]);
      return;
    }
    const res = await fetch(`/api/conversations/${conversationId}`);
    if (res.ok) {
      const data: ConversationWithMessages = await res.json();
      setConversation(data);
      setMessages(data.messages);
    }
  }, [conversationId]);

  useEffect(() => {
    // Initial fetch of this conversation's messages; setState happens only
    // after the async request resolves, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function ensureConversation(): Promise<string> {
    if (conversationId) return conversationId;
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ persona: personaId, model }),
    });
    const conv = await res.json();
    await refreshConversations();
    router.push(`/?c=${conv.id}`);
    return conv.id;
  }

  async function uploadAttachment(): Promise<string | null> {
    if (!attachedFile) return null;
    const form = new FormData();
    form.append("file", attachedFile);
    const res = await fetch("/api/documents", { method: "POST", body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(err.error || "Upload failed");
    }
    const data = await res.json();
    setAttachedFile(null);
    return data.filename as string;
  }

  async function streamAssistantReply(convId: string, body: Record<string, unknown>) {
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const tempId = `pending-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        conversation_id: convId,
        role: "assistant",
        content: "",
        model,
        created_at: Date.now(),
        edited: 0,
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error(`Request failed: ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, content: acc } : m))
        );
      }
    } catch {
      // aborted or network error — fall through to reload from DB which has
      // whatever partial content was already persisted server-side.
    } finally {
      setStreaming(false);
      abortRef.current = null;
      await loadConversation();
      await refreshConversations();
    }
  }

  async function handleSend(text: string) {
    const convId = await ensureConversation();
    let content = text;
    try {
      const filename = await uploadAttachment();
      if (filename) content = `[Attached document: ${filename}]\n\n${text}`;
    } catch (err) {
      alert((err as Error).message);
      return;
    }

    setMessages((prev) => [
      ...prev,
      {
        id: `temp-user-${Date.now()}`,
        conversation_id: convId,
        role: "user",
        content,
        created_at: Date.now(),
        edited: 0,
      },
    ]);

    await streamAssistantReply(convId, { conversationId: convId, content, model, useRag });
  }

  async function handleEdit(id: string, newContent: string) {
    if (!conversationId) return;
    await fetch(`/api/messages/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newContent, truncateAfter: true }),
    });
    await loadConversation();
    await streamAssistantReply(conversationId, { conversationId, model, useRag });
  }

  async function handleRegenerate(assistantId: string) {
    if (!conversationId) return;
    await fetch(`/api/messages/${assistantId}?cascade=true`, { method: "DELETE" });
    setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    await streamAssistantReply(conversationId, { conversationId, model, useRag });
  }

  function handleStop() {
    abortRef.current?.abort();
  }

  const noModels = installedModels.length === 0;
  const activePersona = getPersona(personaId);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-border-color px-4 py-2.5 md:pl-4 pl-14">
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => setPickerOpen(pickerOpen === "model" ? null : "model")}
            className="flex items-center gap-1 text-sm font-medium rounded-lg px-2 py-1 hover:bg-surface"
          >
            {model || "No model"} <ChevronDown size={14} />
          </button>
          <button
            onClick={() => setPickerOpen(pickerOpen === "persona" ? null : "persona")}
            className="flex items-center gap-1 text-xs text-foreground/60 rounded-lg px-2 py-1 hover:bg-surface border border-border-color"
          >
            {activePersona.name} <ChevronDown size={12} />
          </button>

          {pickerOpen === "model" && (
            <div className="absolute top-9 left-0 z-20 w-56 rounded-lg border border-border-color bg-surface shadow-lg p-1">
              {installedModels.map((m) => (
                <button
                  key={m.name}
                  onClick={() => {
                    setModelOverride(m.name);
                    setPickerOpen(null);
                  }}
                  className="w-full text-left text-sm rounded-md px-2 py-1.5 hover:bg-background"
                >
                  {m.name}
                </button>
              ))}
              {noModels && (
                <p className="text-xs text-foreground/50 p-2">
                  No models installed. Visit Model Library.
                </p>
              )}
            </div>
          )}
          {pickerOpen === "persona" && (
            <div className="absolute top-9 left-24 z-20 w-64 rounded-lg border border-border-color bg-surface shadow-lg p-1">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPersonaOverride(p.id);
                    setPickerOpen(null);
                    if (conversationId) {
                      fetch(`/api/conversations/${conversationId}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ persona: p.id }),
                      });
                    }
                  }}
                  className="w-full text-left rounded-md px-2 py-1.5 hover:bg-background"
                >
                  <div className="text-sm">{p.name}</div>
                  <div className="text-xs text-foreground/50">{p.description}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-foreground/60">
            <input
              type="checkbox"
              checked={useRag}
              onChange={(e) => setUseRagOverride(e.target.checked)}
            />
            Use documents
          </label>
          {conversationId && (
            <div className="relative">
              <button
                onClick={() => setExportOpen((v) => !v)}
                className="p-1.5 text-foreground/60 hover:text-foreground"
                title="Export conversation"
              >
                <Download size={16} />
              </button>
              {exportOpen && (
                <div className="absolute right-0 top-8 z-20 w-32 rounded-lg border border-border-color bg-surface shadow-lg p-1">
                  {["md", "txt", "json"].map((fmt) => (
                    <a
                      key={fmt}
                      href={`/api/export/${conversationId}?format=${fmt}`}
                      className="block text-sm rounded-md px-2 py-1.5 hover:bg-background"
                      onClick={() => setExportOpen(false)}
                    >
                      Export .{fmt}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <Welcome onPick={(p) => handleSend(p)} modelLabel={model || "no model"} />
        ) : (
          <div className="mx-auto max-w-3xl">
            {messages.map((m, i) => (
              <MessageBubble
                key={m.id}
                message={m}
                isLast={i === messages.length - 1}
                streaming={streaming}
                onEdit={m.role === "user" ? handleEdit : undefined}
                onRegenerate={m.role === "assistant" ? handleRegenerate : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-3xl">
        {attachedFile && (
          <div className="flex items-center gap-2 px-4 pt-2 text-xs">
            <FileText size={13} />
            {attachedFile.name}
            <button onClick={() => setAttachedFile(null)}>
              <X size={12} />
            </button>
          </div>
        )}
        <MessageInput
          onSend={handleSend}
          onStop={handleStop}
          streaming={streaming}
          disabled={noModels || !ollamaReachable}
          disabledReason={
            !ollamaReachable
              ? "Ollama isn't running. Start it, then reload."
              : noModels
              ? "No models installed yet. Visit Model Library to download one."
              : undefined
          }
          attachedFileName={attachedFile?.name ?? null}
          onAttach={setAttachedFile}
          onRemoveAttachment={() => setAttachedFile(null)}
        />
      </div>
    </div>
  );
}
