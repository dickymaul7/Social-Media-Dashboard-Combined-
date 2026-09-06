"use client";

import { useEffect, useState } from "react";
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

  const update = (key: keyof BrandIntelligenceType, value: string | string[]) => setDraft(current => ({ ...current, [key]: value }));

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
      const extracted = payload.data as BrandIntelligenceType & { capabilities?: string[] };
      setDraft(current => ({
        ...current,
        ...extracted,
        core_expertise: extracted.core_expertise?.length ? extracted.core_expertise : (extracted.capabilities ?? current.core_expertise),
      }));
      setMessage("AI selesai membaca file. Review hasil di form, lalu klik Save Brand Intelligence.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ekstraksi Brand Intelligence gagal.");
    } finally {
      setExtracting(false);
    }
  }

  return <section className="dashboard-module">
    <div className="feature-head"><div><p className="eyebrow">BRAND CONTEXT</p><h2>Brand Intelligence</h2><p>Context strategis untuk {activeBrand.name}. Content Generator akan memakai data ini otomatis.</p></div><div className="feature-badge"><Brain size={14}/> {source === "saved" ? "Saved context" : source === "starter" ? "Starter context" : "No context"}</div></div>

    <div className="brand-upload-card">
      <div className="brand-upload-copy"><div className="brand-upload-icon"><FileUp size={20}/></div><div><strong>Upload Brand Intelligence</strong><p>Upload company profile, brand guideline, strategy deck yang sudah diexport ke PDF, atau file teks. AI akan mengekstrak positioning, audience, pain points, capabilities, proof points, claims, dan tone of voice untuk direview.</p></div></div>
      <label className="brand-file-picker"><FileUp size={15}/><span>{files.length ? `${files.length} file dipilih` : "Pilih file"}</span><input type="file" multiple accept=".pdf,.txt,.md,.csv,.json,.html,.xml,application/pdf,text/plain,text/csv,application/json" onChange={e=>setFiles(Array.from(e.target.files ?? []))}/></label>
      {files.length>0&&<div className="brand-file-list">{files.map(file=><span key={`${file.name}-${file.size}`}>{file.name}</span>)}</div>}
      <p className="brand-upload-hint">PDF memberi hasil terbaik. Untuk DOCX/PPTX/XLSX, export ke PDF terlebih dahulu. Maksimal 5 file / total 12 MB per ekstraksi.</p>
      <button className="primary brand-extract" onClick={extractFiles} disabled={!files.length||extracting}><Sparkles size={14}/>{extracting?"AI sedang membaca file...":"Extract Brand Intelligence with AI"}</button>
    </div>

    {error&&<div className="source-note warning">{error}</div>}
    {message&&<div className="source-note success-note">{message}</div>}
    {(draft.confidence_notes?.length??0)>0&&<div className="confidence-box"><strong>Human review notes</strong>{draft.confidence_notes?.map(note=><p key={note}>• {note}</p>)}</div>}

    <div className="source-note">Hasil upload hanya menjadi draft sampai kamu klik Save Brand Intelligence. Data tetap brand-scoped seperti editor manual saat ini.</div>
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
    {(draft.source_files?.length??0)>0&&<div className="brand-source-files"><strong>Source files</strong>{draft.source_files?.map(file=><div key={file.name}><span>{file.name}</span><small>{file.notes}</small></div>)}</div>}
    <div className="brand-intel-actions"><button className="primary" onClick={()=>{setIntelligence(draft);setMessage("Brand Intelligence tersimpan untuk active brand.");}}><Save size={14}/> Save Brand Intelligence</button><button className="ghost danger" onClick={clearIntelligence}><Trash2 size={14}/> Reset saved context</button></div>
  </section>;
}
