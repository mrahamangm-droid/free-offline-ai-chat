"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  MessageSquare,
  Boxes,
  BookOpen,
  Settings,
  Pencil,
  Trash2,
  Menu,
  X,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useApp } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const { conversations, refreshConversations, ollamaReachable } = useApp();
  const [query, setQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = searchParams.get("c");

  const filtered = useMemo(() => {
    if (!query.trim()) return conversations;
    const q = query.toLowerCase();
    return conversations.filter((c) => c.title.toLowerCase().includes(q));
  }, [conversations, query]);

  async function handleNewChat() {
    const res = await fetch("/api/conversations", { method: "POST", body: "{}" });
    const conv = await res.json();
    await refreshConversations();
    router.push(`/?c=${conv.id}`);
    setMobileOpen(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    await refreshConversations();
    if (activeId === id) router.push("/");
  }

  async function commitRename(id: string) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (!title) return;
    await fetch(`/api/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    await refreshConversations();
  }

  const navItems = [
    { href: "/models", label: "Model Library", icon: Boxes },
    { href: "/knowledge", label: "Knowledge Base", icon: BookOpen },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const content = (
    <div className="flex h-full w-72 flex-col border-r border-border-color bg-surface">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <MessageSquare size={20} className="shrink-0" />
          <span>Offline AI Chat</span>
        </div>
        <button
          className="md:hidden p-1 text-foreground/60 hover:text-foreground"
          onClick={() => setMobileOpen(false)}
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-3">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 rounded-lg border border-border-color px-3 py-2 text-sm hover:bg-background transition-colors"
        >
          <Plus size={16} /> New chat
        </button>
      </div>

      <div className="px-3 mt-2">
        <div className="flex items-center gap-2 rounded-lg border border-border-color px-2 py-1.5">
          <Search size={14} className="text-foreground/50" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 mt-2 space-y-0.5">
        {filtered.map((c) => (
          <div
            key={c.id}
            className={cn(
              "group flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm cursor-pointer",
              activeId === c.id ? "bg-background" : "hover:bg-background/60"
            )}
          >
            {renamingId === c.id ? (
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => commitRename(c.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitRename(c.id);
                  if (e.key === "Escape") setRenamingId(null);
                }}
                className="flex-1 bg-transparent border-b border-border-color outline-none text-sm"
              />
            ) : (
              <Link
                href={`/?c=${c.id}`}
                onClick={() => setMobileOpen(false)}
                className="flex-1 truncate"
                title={c.title}
              >
                {c.title}
              </Link>
            )}
            <button
              className="opacity-0 group-hover:opacity-100 p-1 text-foreground/50 hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                setRenamingId(c.id);
                setRenameValue(c.title);
              }}
            >
              <Pencil size={13} />
            </button>
            <button
              className="opacity-0 group-hover:opacity-100 p-1 text-foreground/50 hover:text-red-500"
              onClick={(e) => {
                e.preventDefault();
                handleDelete(c.id);
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-foreground/40 px-2 py-4 text-center">
            No conversations yet.
          </p>
        )}
      </div>

      <div className="border-t border-border-color px-2 py-2 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-background/60",
              pathname === item.href && "bg-background"
            )}
          >
            <item.icon size={16} />
            {item.label}
          </Link>
        ))}
        <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-foreground/50">
          {ollamaReachable ? (
            <>
              <Wifi size={13} className="text-green-500" /> Local AI connected
            </>
          ) : (
            <>
              <WifiOff size={13} className="text-red-500" /> Ollama not running
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="md:hidden fixed top-3 left-3 z-40 p-2 rounded-lg bg-surface border border-border-color"
        onClick={() => setMobileOpen(true)}
      >
        <Menu size={18} />
      </button>
      <div className="hidden md:block h-full">{content}</div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0">{content}</div>
        </div>
      )}
    </>
  );
}
