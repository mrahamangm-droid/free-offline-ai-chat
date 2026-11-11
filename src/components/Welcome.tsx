"use client";

import { Code2, PenLine, Search, Lightbulb } from "lucide-react";

const SUGGESTIONS = [
  {
    icon: Code2,
    title: "Explain this code",
    prompt: "Explain what the following code does and suggest improvements:\n\n",
  },
  {
    icon: PenLine,
    title: "Draft an email",
    prompt: "Help me draft a polite email asking for a deadline extension.",
  },
  {
    icon: Search,
    title: "Summarize a document",
    prompt: "Attach a document and ask: Summarize the key points of this document.",
  },
  {
    icon: Lightbulb,
    title: "Brainstorm ideas",
    prompt: "Brainstorm 10 creative names for a small coffee roasting business.",
  },
];

export default function Welcome({
  onPick,
  modelLabel,
}: {
  onPick: (prompt: string) => void;
  modelLabel: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold mb-1">Offline AI Chat</h1>
      <p className="text-sm text-foreground/50 mb-6">
        Private, local, and free — currently running {modelLabel}
      </p>
      <div className="grid w-full max-w-xl grid-cols-1 sm:grid-cols-2 gap-3">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.title}
            onClick={() => onPick(s.prompt)}
            className="flex items-start gap-3 rounded-xl border border-border-color bg-surface p-3 text-left text-sm hover:bg-background/60 transition-colors"
          >
            <s.icon size={18} className="mt-0.5 shrink-0" />
            <span>{s.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
