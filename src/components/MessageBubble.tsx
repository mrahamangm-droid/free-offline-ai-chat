"use client";

import { useState, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { Copy, Check, Pencil, RotateCcw, User, Bot } from "lucide-react";
import { Message } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  message: Message;
  onEdit?: (id: string, newContent: string) => void;
  onRegenerate?: (id: string) => void;
  isLast: boolean;
  streaming: boolean;
}

function CopyButton({ text, className }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className={cn("p-1 text-foreground/50 hover:text-foreground", className)}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
      title="Copy"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

function MessageBubble({ message, onEdit, onRegenerate, isLast, streaming }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3 px-4 py-4", isUser ? "" : "bg-surface/50")}>
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-color",
          isUser ? "bg-background" : "bg-background"
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground/50 mb-1">
          {isUser ? "You" : message.model || "Assistant"}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full rounded-lg border border-border-color bg-background p-2 text-sm outline-none"
              rows={Math.min(10, draft.split("\n").length + 1)}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                className="rounded-md bg-foreground text-background text-xs px-3 py-1.5"
                onClick={() => {
                  setEditing(false);
                  onEdit?.(message.id, draft);
                }}
              >
                Save &amp; submit
              </button>
              <button
                className="rounded-md border border-border-color text-xs px-3 py-1.5"
                onClick={() => {
                  setDraft(message.content);
                  setEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="prose-chat text-sm leading-relaxed break-words">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {message.content || (streaming && isLast ? "…" : "")}
            </ReactMarkdown>
          </div>
        )}

        {!editing && (
          <div className="flex items-center gap-1 mt-1">
            <CopyButton text={message.content} />
            {isUser && onEdit && (
              <button
                className="p-1 text-foreground/50 hover:text-foreground"
                onClick={() => setEditing(true)}
                title="Edit"
              >
                <Pencil size={14} />
              </button>
            )}
            {!isUser && onRegenerate && isLast && !streaming && (
              <button
                className="p-1 text-foreground/50 hover:text-foreground"
                onClick={() => onRegenerate(message.id)}
                title="Regenerate"
              >
                <RotateCcw size={14} />
              </button>
            )}
            {message.edited === 1 && (
              <span className="text-[10px] text-foreground/40 ml-1">edited</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MessageBubble);
