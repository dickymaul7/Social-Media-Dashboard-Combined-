"use client";

import { createContext, useContext, useMemo, useState } from "react";

export type BrandOption = { id: string; name: string };

export const BRAND_OPTIONS: BrandOption[] = [
  { id: "proxsis-consulting-group", name: "Proxsis Consulting Group" },
  { id: "proxsis-strategy", name: "Proxsis Strategy" },
  { id: "proxsis-infra", name: "Proxsis Infra" },
];

type ActiveBrandContextValue = {
  activeBrand: BrandOption;
  brands: BrandOption[];
  setActiveBrandId: (id: string) => void;
};

const ActiveBrandContext = createContext<ActiveBrandContextValue | null>(null);

export function ActiveBrandProvider({ children }: { children: React.ReactNode }) {
  const [activeBrandId, setActiveBrandId] = useState(BRAND_OPTIONS[0].id);
  const activeBrand = useMemo(
    () => BRAND_OPTIONS.find((brand) => brand.id === activeBrandId) ?? BRAND_OPTIONS[0],
    [activeBrandId],
  );
  const value = useMemo(() => ({ activeBrand, brands: BRAND_OPTIONS, setActiveBrandId }), [activeBrand]);
  return <ActiveBrandContext.Provider value={value}>{children}</ActiveBrandContext.Provider>;
}

export function useActiveBrand() {
  const context = useContext(ActiveBrandContext);
  if (!context) throw new Error("useActiveBrand must be used inside ActiveBrandProvider");
  return context;
}
