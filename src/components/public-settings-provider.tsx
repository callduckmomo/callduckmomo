"use client";

import { createContext, useContext } from "react";
import type { LayoutPublicSettings } from "@/lib/settings/public-keys";

const PublicSettingsContext = createContext<LayoutPublicSettings | null>(null);

export function PublicSettingsProvider({
  settings,
  children,
}: {
  settings: LayoutPublicSettings;
  children: React.ReactNode;
}) {
  return (
    <PublicSettingsContext.Provider value={settings}>
      {children}
    </PublicSettingsContext.Provider>
  );
}

export function usePublicSettings(): LayoutPublicSettings {
  const ctx = useContext(PublicSettingsContext);
  if (!ctx) {
    throw new Error("usePublicSettings must be used within PublicSettingsProvider");
  }
  return ctx;
}
