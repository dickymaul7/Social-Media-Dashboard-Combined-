"use client";

import { useEffect, useState } from "react";
import { Brain, Save, Trash2 } from "lucide-react";
import { useActiveBrand } from "@/components/active-brand";
import { useBrandIntelligence } from "@/components/brand-intelligence-context";
import type { BrandIntelligence as BrandIntelligenceType } from "@/lib/types";

const emptyValue: BrandIntelligenceType = {
  positioning: "", value_proposition: "", target_audiences: [], audience_pain_points: [], tone_of_voice: "",
  key_messages: [], brand_pov: "", core_expertise: [], communication_dos: [], communication_donts: [],
};

const lines = (value?: string[]) => (value ?? []).join("\n");
const parseLines = (value: string) => value.split("\n").map(x => x.trim()).filter(Boolean);

export function BrandIntelligence() {
  const { activeBrand } = useActiveBrand();
  const { intelligence, setIntelligence, clearIntelligence, source } = useBrandIntelligence();
  const [draft, setDraft] = useState<BrandIntelligenceType>(intelligence ?? emptyValue);

  useEffect(() => setDraft(intelligence ?? emptyValue), [activeBrand.id, intelligence]);

  const update = (key: keyof BrandIntelligenceType, value: string | string[]) => setDraft(current => ({ ...current, [key]: value }));

  return <section className="dashboard-module">
    <div className="feature-head"><div><p className="eyebrow">BRAND CONTEXT</p><h2>Brand Intelligence</h2><p>Context strategis untuk {activeBrand.name}. Content Generator akan memakai data ini otomatis.</p></div><div className="feature-badge"><Brain size={14}/> {source === "saved" ? "Saved context" : source === "starter" ? "Starter context" : "No context"}</div></div>
    <div className="source-note">Persistence saat ini brand-scoped browser storage. Schema Supabase sudah disiapkan sebelumnya; authenticated database persistence akan diaktifkan setelah auth/RLS membership siap.</div>
    <div className="brand-intel-grid">
      <label>Positioning<textarea value={draft.positioning ?? ""} onChange={e=>update("positioning",e.target.value)} /></label>
      <label>Value Proposition<textarea value={draft.value_proposition ?? ""} onChange={e=>update("value_proposition",e.target.value)} /></label>
      <label>Target Audiences <span>one per line</span><textarea value={lines(draft.target_audiences)} onChange={e=>update("target_audiences",parseLines(e.target.value))} /></label>
      <label>Audience Pain Points <span>one per line</span><textarea value={lines(draft.audience_pain_points)} onChange={e=>update("audience_pain_points",parseLines(e.target.value))} /></label>
      <label>Tone of Voice<textarea value={draft.tone_of_voice ?? ""} onChange={e=>update("tone_of_voice",e.target.value)} /></label>
      <label>Key Messages <span>one per line</span><textarea value={lines(draft.key_messages)} onChange={e=>update("key_messages",parseLines(e.target.value))} /></label>
      <label>Brand POV<textarea value={draft.brand_pov ?? ""} onChange={e=>update("brand_pov",e.target.value)} /></label>
      <label>Core Expertise <span>one per line</span><textarea value={lines(draft.core_expertise)} onChange={e=>update("core_expertise",parseLines(e.target.value))} /></label>
      <label>Communication Do&apos;s <span>one per line</span><textarea value={lines(draft.communication_dos)} onChange={e=>update("communication_dos",parseLines(e.target.value))} /></label>
      <label>Communication Don&apos;ts <span>one per line</span><textarea value={lines(draft.communication_donts)} onChange={e=>update("communication_donts",parseLines(e.target.value))} /></label>
    </div>
    <div className="brand-intel-actions"><button className="primary" onClick={()=>setIntelligence(draft)}><Save size={14}/> Save Brand Intelligence</button><button className="ghost danger" onClick={clearIntelligence}><Trash2 size={14}/> Reset saved context</button></div>
  </section>;
}
