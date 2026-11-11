"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ChatView from "@/components/ChatView";

function ChatPageInner() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get("c");
  return <ChatView key={conversationId ?? "new"} conversationId={conversationId} />;
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}
