"use client";

import { useRef, useState, KeyboardEvent } from "react";
import { Paperclip, Send, Square, FileText, X } from "lucide-react";

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  streaming: boolean;
  disabled?: boolean;
  disabledReason?: string;
  attachedFileName?: string | null;
  onAttach: (file: File) => void;
  onRemoveAttachment: () => void;
}

export default function MessageInput({
  onSend,
  onStop,
  streaming,
  disabled,
  disabledReason,
  attachedFileName,
  onAttach,
  onRemoveAttachment,
}: Props) {
  const [text, setText] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function submit() {
    if (!text.trim() || streaming || disabled) return;
    onSend(text.trim());
    setText("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="border-t border-border-color p-3">
      {disabled && disabledReason && (
        <p className="text-xs text-red-500 mb-2 text-center">{disabledReason}</p>
      )}
      {attachedFileName && (
        <div className="flex items-center gap-2 mb-2 text-xs bg-surface border border-border-color rounded-lg px-2 py-1 w-fit">
          <FileText size={13} />
          {attachedFileName}
          <button onClick={onRemoveAttachment} className="text-foreground/50 hover:text-foreground">
            <X size={12} />
          </button>
        </div>
      )}
      <div className="flex items-end gap-2 rounded-2xl border border-border-color bg-surface px-3 py-2">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept=".txt,.md,.csv,.json,.pdf"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAttach(f);
            e.target.value = "";
          }}
        />
        <button
          className="p-1.5 text-foreground/50 hover:text-foreground"
          onClick={() => fileRef.current?.click()}
          title="Attach a document"
          disabled={disabled}
        >
          <Paperclip size={18} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Select a model to start chatting…" : "Message your local AI… (Enter to send, Shift+Enter for newline)"}
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 max-h-40"
          style={{ height: "auto" }}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = Math.min(el.scrollHeight, 160) + "px";
          }}
        />
        {streaming ? (
          <button
            onClick={onStop}
            className="p-2 rounded-full bg-foreground text-background"
            title="Stop generating"
          >
            <Square size={14} />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={disabled || !text.trim()}
            className="p-2 rounded-full bg-foreground text-background disabled:opacity-30"
            title="Send"
          >
            <Send size={14} />
          </button>
        )}
      </div>
      <p className="text-[11px] text-center text-foreground/40 mt-1.5">
        Runs fully offline on your device. Nothing leaves your computer.
      </p>
    </div>
  );
}
