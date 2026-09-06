"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type BrandOption = { id: string; name: string };

export const BRAND_OPTIONS: BrandOption[] = [
  { id: "proxsis-consulting-group", name: "Proxsis Consulting Group" },
  { id: "proxsis-strategy", name: "Proxsis Strategy" },
  { id: "proxsis-infra", name: "Proxsis Infra" },
];

const ACTIVE_BRAND_KEY="proxsis-dashboard:active-brand:v1";

type ActiveBrandContextValue = {
  activeBrand: BrandOption;
  brands: BrandOption[];
  setActiveBrandId: (id: string) => void;
  hydrated: boolean;
};

const ActiveBrandContext = createContext<ActiveBrandContextValue | null>(null);

export function ActiveBrandProvider({ children }: { children: React.ReactNode }) {
  const [activeBrandId, setActiveBrandIdState] = useState(BRAND_OPTIONS[0].id);
  const [hydrated,setHydrated]=useState(false);

  useEffect(()=>{
    try{
      const saved=window.localStorage.getItem(ACTIVE_BRAND_KEY);
      if(saved&&BRAND_OPTIONS.some(brand=>brand.id===saved))setActiveBrandIdState(saved);
    }catch{}
    finally{setHydrated(true)}
  },[]);

  function setActiveBrandId(id:string){
    const valid=BRAND_OPTIONS.some(brand=>brand.id===id)?id:BRAND_OPTIONS[0].id;
    setActiveBrandIdState(valid);
    try{window.localStorage.setItem(ACTIVE_BRAND_KEY,valid)}catch{}
  }

  const activeBrand = useMemo(
    () => BRAND_OPTIONS.find((brand) => brand.id === activeBrandId) ?? BRAND_OPTIONS[0],
    [activeBrandId],
  );
  const value = useMemo(() => ({ activeBrand, brands: BRAND_OPTIONS, setActiveBrandId, hydrated }), [activeBrand, hydrated]);
  return <ActiveBrandContext.Provider value={value}>{children}</ActiveBrandContext.Provider>;
}

export function useActiveBrand() {
  const context = useContext(ActiveBrandContext);
  if (!context) throw new Error("useActiveBrand must be used inside ActiveBrandProvider");
  return context;
}
