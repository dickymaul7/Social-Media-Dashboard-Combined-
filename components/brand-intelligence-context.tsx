"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useActiveBrand } from "@/components/active-brand";
import type { BrandIntelligence } from "@/lib/types";

const STARTER_INTELLIGENCE: Record<string, BrandIntelligence> = {
  "proxsis-consulting-group": {
    positioning: "Strategic corporate learning and capability partner.",
    value_proposition: "Menghubungkan kebutuhan bisnis dengan pengembangan kapabilitas organisasi.",
    target_audiences: ["Business leaders", "HR leaders", "L&D professionals"],
    audience_pain_points: ["Kesenjangan kapabilitas", "Program learning yang sulit diukur dampaknya"],
    tone_of_voice: "Strategis, evidence-led, praktis.",
    key_messages: ["Learning harus terhubung dengan business impact."],
    brand_pov: "Corporate learning bukan sekadar training activity; harus menjadi business capability.",
    core_expertise: ["Corporate learning", "Leadership", "Organizational capability"],
    communication_dos: [],
    communication_donts: [],
  },
};

type BrandIntelligenceContextValue = {
  intelligence: BrandIntelligence | null;
  setIntelligence: (value: BrandIntelligence) => void;
  clearIntelligence: () => void;
  hasIntelligence: boolean;
  source: "saved" | "starter" | "empty";
};

const BrandIntelligenceContext = createContext<BrandIntelligenceContextValue | null>(null);

function storageKey(brandId: string) {
  return `combined:brand-intelligence:${brandId}`;
}

export function BrandIntelligenceProvider({ children }: { children: React.ReactNode }) {
  const { activeBrand } = useActiveBrand();
  const [saved, setSaved] = useState<Record<string, BrandIntelligence | null>>({});
  const [hydrated, setHydrated] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (hydrated[activeBrand.id]) return;
    const raw = window.localStorage.getItem(storageKey(activeBrand.id));
    let value: BrandIntelligence | null = null;
    if (raw) {
      try { value = JSON.parse(raw) as BrandIntelligence; } catch { value = null; }
    }
    setSaved(current => ({ ...current, [activeBrand.id]: value }));
    setHydrated(current => ({ ...current, [activeBrand.id]: true }));
  }, [activeBrand.id, hydrated]);

  const starter = STARTER_INTELLIGENCE[activeBrand.id] ?? null;
  const savedValue = saved[activeBrand.id] ?? null;
  const intelligence = savedValue ?? starter;
  const source: BrandIntelligenceContextValue["source"] = savedValue ? "saved" : starter ? "starter" : "empty";

  const value = useMemo<BrandIntelligenceContextValue>(() => ({
    intelligence,
    hasIntelligence: Boolean(intelligence),
    source,
    setIntelligence: (next) => {
      window.localStorage.setItem(storageKey(activeBrand.id), JSON.stringify(next));
      setSaved(current => ({ ...current, [activeBrand.id]: next }));
    },
    clearIntelligence: () => {
      window.localStorage.removeItem(storageKey(activeBrand.id));
      setSaved(current => ({ ...current, [activeBrand.id]: null }));
    },
  }), [activeBrand.id, intelligence, source]);

  return <BrandIntelligenceContext.Provider value={value}>{children}</BrandIntelligenceContext.Provider>;
}

export function useBrandIntelligence() {
  const context = useContext(BrandIntelligenceContext);
  if (!context) throw new Error("useBrandIntelligence must be used inside BrandIntelligenceProvider");
  return context;
}
