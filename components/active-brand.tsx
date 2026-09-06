"use client";

import {createContext,useContext,useEffect,useMemo,useState} from "react";
import {loadBrands,type WorkspaceBrand} from "@/lib/workspace-store";

export type BrandOption={id:string;name:string};
export const BRAND_OPTIONS:BrandOption[]=[{id:"proxsis-consulting-group",name:"Proxsis Consulting Group"},{id:"proxsis-strategy",name:"Proxsis Strategy"},{id:"proxsis-infra",name:"Proxsis Infra"}];
type ActiveBrandContextValue={activeBrand:BrandOption;brands:BrandOption[];setActiveBrandId:(id:string)=>void;refreshBrands:()=>void};
const ActiveBrandContext=createContext<ActiveBrandContextValue|null>(null);
const ACTIVE_KEY="proxsis-workspace:active-brand:v1";
export function ActiveBrandProvider({children}:{children:React.ReactNode}){const [brands,setBrands]=useState<BrandOption[]>(BRAND_OPTIONS);const [activeBrandId,setId]=useState(BRAND_OPTIONS[0].id);function refreshBrands(){const next=loadBrands().filter((b:WorkspaceBrand)=>b.status!=="inactive").map(b=>({id:b.id,name:b.name}));setBrands(next.length?next:BRAND_OPTIONS);setId(current=>(next.some(b=>b.id===current)?current:(next[0]?.id||BRAND_OPTIONS[0].id)))}useEffect(()=>{refreshBrands();try{const saved=localStorage.getItem(ACTIVE_KEY);if(saved)setId(saved)}catch{}const onUpdate=()=>refreshBrands();window.addEventListener("proxsis-workspace:updated",onUpdate as EventListener);window.addEventListener("storage",onUpdate);return()=>{window.removeEventListener("proxsis-workspace:updated",onUpdate as EventListener);window.removeEventListener("storage",onUpdate)}},[]);function setActiveBrandId(id:string){setId(id);try{localStorage.setItem(ACTIVE_KEY,id)}catch{}}const activeBrand=useMemo(()=>brands.find(b=>b.id===activeBrandId)||brands[0]||BRAND_OPTIONS[0],[brands,activeBrandId]);const value=useMemo(()=>({activeBrand,brands,setActiveBrandId,refreshBrands}),[activeBrand,brands]);return <ActiveBrandContext.Provider value={value}>{children}</ActiveBrandContext.Provider>}
export function useActiveBrand(){const context=useContext(ActiveBrandContext);if(!context)throw new Error("useActiveBrand must be used inside ActiveBrandProvider");return context}
