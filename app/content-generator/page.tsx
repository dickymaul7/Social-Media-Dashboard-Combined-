"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Brain, Sparkles } from "lucide-react";
import { useActiveBrand } from "@/components/active-brand";
import { useBrandIntelligence } from "@/components/brand-intelligence-context";
import { buildBrandContext, resolveAudience } from "@/lib/brand-intelligence";
import "./page.css";

export default function ContentGeneratorPage() {
  const { activeBrand, brands, setActiveBrandId } = useActiveBrand();
  const { intelligence, hasIntelligence, source } = useBrandIntelligence();
  const [topic,setTopic]=useState("");
  const [audience,setAudience]=useState("");
  const [objective,setObjective]=useState("");
  const [format,setFormat]=useState<"auto"|"carousel"|"reels"|"single_post">("auto");
  const [angles,setAngles]=useState(5);
  const [result,setResult]=useState<string[]>([]);
  const resolvedAudience=useMemo(()=>resolveAudience(audience,intelligence),[audience,intelligence]);

  function generate() {
    if (!topic.trim() || !objective.trim() || !intelligence) return;
    const titles=[
      `Apa yang terjadi ketika ${topic} tidak lagi dipandang sebagai sekadar program?`,
      `Mengapa ${topic} sering gagal memberi dampak yang diharapkan?`,
      `Keputusan di balik ${topic} yang jarang dibahas perusahaan`,
      `Dari aktivitas ke business impact: pelajaran dari ${topic}`,
      `Satu pertanyaan penting sebelum perusahaan menjalankan ${topic}`,
      `Risiko terbesar saat ${topic} dijalankan tanpa konteks bisnis yang jelas`,
      `Apa yang perlu diubah agar ${topic} menghasilkan outcome, bukan hanya aktivitas?`,
      `Cara melihat ${topic} dari perspektif keputusan manajemen`,
      `Sinyal bahwa pendekatan lama terhadap ${topic} sudah tidak cukup`,
      `Menghubungkan ${topic} dengan prioritas organisasi: apa yang sering terlewat?`,
    ];
    const pov = intelligence.brand_pov || intelligence.positioning || "Brand POV belum diisi";
    setResult(titles.slice(0,angles).map((title,i)=>`${title} — angle ${i+1}. Audience: ${resolvedAudience || "Audience belum ditentukan"}. POV: ${pov}`));
  }

  return <div className="generator-page">
    <div className="generator-topline"><a href="/" className="generator-back"><ArrowLeft size={15}/> Dashboard</a><select value={activeBrand.id} onChange={e=>{setActiveBrandId(e.target.value);setResult([])}}>{brands.map(brand=><option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></div>
    <div className="generator-header"><div><p className="eyebrow">AI CONTENT STRATEGY</p><h1>Content Generator</h1><p className="muted">Active brand: {activeBrand.name}. Story angles use the selected brand intelligence automatically.</p></div><div className={hasIntelligence?"intel-badge":"intel-badge missing"}><Brain size={16}/>{hasIntelligence ? `Brand Intelligence ${source === "saved" ? "saved" : "starter"}` : "Brand Intelligence missing"}</div></div>
    {!hasIntelligence && <div className="generator-warning">Brand Intelligence untuk {activeBrand.name} belum tersedia. Kembali ke dashboard → Brand Intelligence dan isi context terlebih dahulu.</div>}
    <div className="generator-grid">
      <section className="panel form-panel"><div className="panel-head"><div><h2>Campaign Brief</h2><p>Only campaign-specific inputs are needed.</p></div></div>
        <label>Topic / Program<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Contoh: AI untuk HR"/></label>
        <label>Target Audience <span className="optional">optional — uses Brand Intelligence</span><input value={audience} onChange={e=>setAudience(e.target.value)} placeholder="Kosongkan untuk memakai audience Brand Intelligence"/></label>
        <label>Objective<input value={objective} onChange={e=>setObjective(e.target.value)} placeholder="Contoh: meningkatkan awareness"/></label>
        <div className="form-row"><label>Format<select value={format} onChange={e=>setFormat(e.target.value as typeof format)}><option value="auto">Auto</option><option value="carousel">Carousel</option><option value="reels">Reels</option><option value="single_post">Single Post</option></select></label><label>Story Angles<select value={angles} onChange={e=>setAngles(Number(e.target.value))}>{[3,5,7,10].map(n=><option key={n}>{n}</option>)}</select></label></div>
        <button className="primary generate" onClick={generate} disabled={!hasIntelligence}><Sparkles size={16}/> Buat Story Angles <ArrowRight size={16}/></button>
      </section>
      <aside className="panel intel-panel"><div className="panel-head"><div><h2>Active Brand Intelligence</h2><p>{activeBrand.name} · used automatically</p></div></div><div className="intel-box">{buildBrandContext(intelligence).split("\n").map(x=><p key={x}>{x}</p>)}</div></aside>
    </div>
    {result.length>0&&<section className="panel results-panel"><div className="panel-head"><div><h2>Story Angles</h2><p>{result.length} strategic angles generated for {activeBrand.name}</p></div></div><div className="angle-list">{result.map((x,i)=><div className="angle-card" key={`${x}-${i}`}><span>{String(i+1).padStart(2,"0")}</span><div><b>{x}</b><small>Brand-aligned · {format} · objective: {objective}</small></div></div>)}</div></section>}
  </div>
}
