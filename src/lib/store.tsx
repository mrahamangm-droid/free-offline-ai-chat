"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { Conversation, OllamaModel } from "./types";

interface AppSettings {
  theme: string;
  defaultModel: string;
  defaultPersona: string;
  ragEnabled: string;
}

interface AppState {
  conversations: Conversation[];
  refreshConversations: () => Promise<void>;
  settings: AppSettings;
  refreshSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  installedModels: OllamaModel[];
  ollamaReachable: boolean;
  refreshModels: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

const DEFAULT_SETTINGS: AppSettings = {
  theme: "system",
  defaultModel: "",
  defaultPersona: "default",
  ragEnabled: "true",
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [installedModels, setInstalledModels] = useState<OllamaModel[]>([]);
  const [ollamaReachable, setOllamaReachable] = useState(false);

  const refreshConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    if (res.ok) setConversations(await res.json());
  }, []);

  const refreshSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    if (res.ok) setSettings(await res.json());
  }, []);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) setSettings(await res.json());
  }, []);

  const refreshModels = useCallback(async () => {
    const res = await fetch("/api/models");
    if (res.ok) {
      const data = await res.json();
      setInstalledModels(data.installed ?? []);
      setOllamaReachable(Boolean(data.ollamaReachable));
    }
  }, []);

  useEffect(() => {
    // Initial app-wide data load; each setState happens only after its async
    // fetch resolves, not synchronously in the effect body.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshConversations();
    refreshSettings();
    refreshModels();
  }, [refreshConversations, refreshSettings, refreshModels]);

  return (
    <AppContext.Provider
      value={{
        conversations,
        refreshConversations,
        settings,
        refreshSettings,
        updateSettings,
        installedModels,
        ollamaReachable,
        refreshModels,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
