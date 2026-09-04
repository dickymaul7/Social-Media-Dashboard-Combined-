"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, FileUp, Save, Sparkles, Trash2 } from "lucide-react";
import { useActiveBrand } from "@/components/active-brand";
import { useBrandIntelligence } from "@/components/brand-intelligence-context";
import type { BrandIntelligence as BrandIntelligenceType } from "@/lib/types";

const emptyValue: BrandIntelligenceType = {
  market_industry: "", market_context: "", market_trends: [], customer_segments: [], positioning: "", value_proposition: "",
  target_audiences: [], audience_pain_points: [], differentiation: "", tone_of_voice: "", key_messages: [], brand_pov: "",
  core_expertise: [], proof_points: [], allowed_claims: [], prohibited_claims: [], communication_dos: [], communication_donts: [],
  source_files: [], confidence_notes: [],
};

const lines = (value?: string[]) => (value ?? []).join("\n");
const parseLines = (value: string) => value.split(/\r?\n/).map(x => x.trim()).filter(Boolean);

export function BrandIntelligence() {
  const { activeBrand } = useActiveBrand();
  const { intelligence, setIntelligence, clearIntelligence, source } = useBrandIntelligence();
  const [draft, setDraft] = useState<BrandIntelligenceType>(intelligence ?? emptyValue);
  const [files, setFiles] = useState<File[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setDraft(intelligence ?? emptyValue);
    setFiles([]);
    setMessage("");
    setError("");
  }, [activeBrand.id, intelligence]);

  const completion = useMemo(() => {
    const required = [draft.market_industry, draft.market_context, lines(draft.customer_segments), lines(draft.target_audiences), lines(draft.audience_pain_points), draft.positioning, draft.value_proposition, draft.differentiation, lines(draft.core_expertise)];
    return Math.round((required.filter(value => (value ?? "").trim()).length / required.length) * 100);
  }, [draft]);

  const update = (key: keyof BrandIntelligenceType, value: string | string[] | BrandIntelligenceType["source_files"]) => setDraft(current => ({ ...current, [key]: value }));

  async function extractFiles() {
    if (!files.length) return;
    setExtracting(true); setError(""); setMessage("");
    try {
      const formData = new FormData();
      files.forEach(file => formData.append("files", file));
      formData.append("brandName", activeBrand.name);
      const response = await fetch("/api/ai/brand-intelligence/extract", { method: "POST", body: formData });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Ekstraksi Brand Intelligence gagal.");
      const extracted = payload.data as BrandIntelligenceType;
      setDraft(current => ({
        ...current,
        ...Object.fromEntries(Object.entries(extracted).filter(([, value]) => Array.isArray(value) ? value.length > 0 : Boolean(value))),
        core_expertise: extracted.core_expertise?.length ? extracted.core_expertise : (payload.data.capabilities ?? current.core_expertise),
      }));
      setMessage("AI selesai membaca file. Review hasil di bawah, lalu klik Save Brand Intelligence.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ekstraksi Brand Intelligence gagal.");
    } finally { setExtracting(false); }
  }

  return <section className="dashboard-module">
    <div className="feature-head"><div><p className="eyebrow">BRAND CONTEXT</p><h2>Brand Intelligence</h2><p>Context strategis untuk {activeBrand.name}. Content Generator akan memakai data yang disimpan di sini secara otomatis.</p></div><div className="feature-badge"><Brain size={14}/> {source === "saved" ? "Saved context" : source === "starter" ? "Starter context" : "No context"}</div></div>

    <div className="brand-intel-progress"><div><span>Intelligence completeness</span><strong>{completion}%</strong></div><div className="progress-track"><i style={{width:`${completion}%`}} /></div></div>

    <div className="brand-upload-card">
      <div className="brand-upload-copy"><div className="brand-upload-icon"><FileUp size={20}/></div><div><strong>Upload file brand</strong><p>Upload company profile, brand guideline, strategy deck yang sudah diexport ke PDF, atau file teks. AI akan mengekstrak Market, STP, Positioning, Capabilities, Proof Points, dan Claims untuk direview.</p></div></div>
      <input type="file" multiple accept=".pdf,.txt,.md,.csv,.json,.html,.xml,application/pdf,text/plain,text/csv,application/json" onChange={e=>setFiles(Array.from(e.target.files ?? []))}/>
      {files.length>0&&<div className="brand-file-list">{files.map(file=><span key={`${file.name}-${file.size}`}>{file.name}</span>)}</div>}
      <p className="brand-upload-hint">PDF memberi hasil terbaik. Untuk DOCX/PPTX/XLSX, export ke PDF terlebih dahulu. Maksimal 5 file / 12 MB per ekstraksi.</p>
      <button className="primary brand-extract" onClick={extractFiles} disabled={!files.length||extracting}><Sparkles size={14}/>{extracting?"AI sedang membaca file...":"Extract Brand Intelligence with AI"}</button>
    </div>

    {error&&<div className="source-note warning">{error}</div>}
    {message&&<div className="source-note success-note">{message}</div>}
    {(draft.confidence_notes?.length??0)>0&&<div className="confidence-box"><strong>Human review notes</strong>{draft.confidence_notes?.map(note=><p key={note}>• {note}</p>)}</div>}

    <div className="source-note">Persistence saat ini brand-scoped browser storage. Endpoint extraction memakai Gemini server-side. Authenticated Supabase persistence dan endpoint auth akan dimigrasikan pada parity slice berikutnya sebelum external multi-user rollout.</div>

    <div className="brand-intel-section"><div><p className="eyebrow">01 · UNDERSTAND MARKET</p><h3>Market</h3></div><div className="brand-intel-grid">
      <label>Industry / Market<textarea value={draft.market_industry ?? ""} onChange={e=>update("market_industry",e.target.value)} /></label>
      <label>Market Context<textarea value={draft.market_context ?? ""} onChange={e=>update("market_context",e.target.value)} /></label>
      <label className="wide-field">Market Trends <span>one per line</span><textarea value={lines(draft.market_trends)} onChange={e=>update("market_trends",parseLines(e.target.value))} /></label>
    </div></div>

    <div className="brand-intel-section"><div><p className="eyebrow">02 · STP</p><h3>Customers & Positioning</h3></div><div className="brand-intel-grid">
      <label>Customer Segments <span>one per line</span><textarea value={lines(draft.customer_segments)} onChange={e=>update("customer_segments",parseLines(e.target.value))} /></label>
      <label>Target Audiences <span>one per line</span><textarea value={lines(draft.target_audiences)} onChange={e=>update("target_audiences",parseLines(e.target.value))} /></label>
      <label className="wide-field">Audience Pain Points / Jobs-to-be-done <span>one per line</span><textarea value={lines(draft.audience_pain_points)} onChange={e=>update("audience_pain_points",parseLines(e.target.value))} /></label>
      <label>Positioning<textarea value={draft.positioning ?? ""} onChange={e=>update("positioning",e.target.value)} /></label>
      <label>Value Proposition<textarea value={draft.value_proposition ?? ""} onChange={e=>update("value_proposition",e.target.value)} /></label>
      <label className="wide-field">Differentiation<textarea value={draft.differentiation ?? ""} onChange={e=>update("differentiation",e.target.value)} /></label>
      <label className="wide-field">Brand POV<textarea value={draft.brand_pov ?? ""} onChange={e=>update("brand_pov",e.target.value)} /></label>
    </div></div>

    <div className="brand-intel-section"><div><p className="eyebrow">03 · CAPABILITIES & COMMUNICATION</p><h3>Capabilities, Evidence & Voice</h3></div><div className="brand-intel-grid">
      <label>Core Expertise / Capabilities <span>one per line</span><textarea value={lines(draft.core_expertise)} onChange={e=>update("core_expertise",parseLines(e.target.value))} /></label>
      <label>Proof Points <span>one per line</span><textarea value={lines(draft.proof_points)} onChange={e=>update("proof_points",parseLines(e.target.value))} /></label>
      <label>Tone of Voice<textarea value={draft.tone_of_voice ?? ""} onChange={e=>update("tone_of_voice",e.target.value)} /></label>
      <label>Key Messages <span>one per line</span><textarea value={lines(draft.key_messages)} onChange={e=>update("key_messages",parseLines(e.target.value))} /></label>
      <label>Allowed Claims <span>one per line</span><textarea value={lines(draft.allowed_claims)} onChange={e=>update("allowed_claims",parseLines(e.target.value))} /></label>
      <label>Prohibited Claims <span>one per line</span><textarea value={lines(draft.prohibited_claims)} onChange={e=>update("prohibited_claims",parseLines(e.target.value))} /></label>
      <label>Communication Do&apos;s <span>one per line</span><textarea value={lines(draft.communication_dos)} onChange={e=>update("communication_dos",parseLines(e.target.value))} /></label>
      <label>Communication Don&apos;ts <span>one per line</span><textarea value={lines(draft.communication_donts)} onChange={e=>update("communication_donts",parseLines(e.target.value))} /></label>
    </div></div>

    {(draft.source_files?.length??0)>0&&<div className="brand-source-files"><strong>Source files</strong>{draft.source_files?.map(file=><div key={file.name}><span>{file.name}</span><small>{file.notes}</small></div>)}</div>}

    <div className="brand-intel-actions"><button className="primary" onClick={()=>{setIntelligence(draft);setMessage("Brand Intelligence tersimpan untuk active brand.");}}><Save size={14}/> Save Brand Intelligence</button><button className="ghost danger" onClick={clearIntelligence}><Trash2 size={14}/> Reset saved context</button></div>
  </section>;
}
