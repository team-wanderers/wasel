"use client";

import { createContext, useContext } from "react";

const MapKeyContext = createContext("");

export function MapKeyProvider({
  apiKey,
  children,
}: {
  apiKey: string;
  children: React.ReactNode;
}) {
  return <MapKeyContext.Provider value={apiKey}>{children}</MapKeyContext.Provider>;
}

export function useMapKey() {
  return useContext(MapKeyContext);
}
