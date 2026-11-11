"use client";

import { ReactNode, Suspense } from "react";
import { AppProvider } from "@/lib/store";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <AppProvider>
      <div className="flex h-full">
        <Suspense fallback={null}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 h-full overflow-hidden">{children}</main>
      </div>
    </AppProvider>
  );
}
