"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Brain, Search, Sparkles } from "lucide-react";
import { useActiveBrand } from "@/components/active-brand";
import { useBrandIntelligence } from "@/components/brand-intelligence-context";
import { buildBrandContext, resolveAudience } from "@/lib/brand-intelligence";
import { saveCampaign, type CampaignBundle } from "@/lib/smm-workflow";
import "./page.css";

type Format = "auto"|"carousel"|"reels"|"single_post";

export default function ContentGeneratorPage() {
  const router=useRouter();
  const {activeBrand,brands,setActiveBrandId}=useActiveBrand();
  const {intelligence,hasIntelligence,source}=useBrandIntelligence();
  const draftKey=`proxsis-smm:quick-brief:${activeBrand.id}`;
  const [topic,setTopic]=useState("");
  const [audience,setAudience]=useState("");
  const [objective,setObjective]=useState("");
  const [cta,setCta]=useState("");
  const [format,setFormat]=useState<Format>("auto");
  const [extraContext,setExtraContext]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [draftReady,setDraftReady]=useState(false);
  const resolvedAudience=useMemo(()=>resolveAudience(audience,intelligence),[audience,intelligence]);

  useEffect(()=>{
    try{const raw=window.localStorage.getItem(draftKey);if(raw){const d=JSON.parse(raw);setTopic(d.topic??"");setAudience(d.audience??"");setObjective(d.objective??"");setCta(d.cta??"");setFormat(["carousel","reels","single_post"].includes(d.format)?d.format:"auto");setExtraContext(d.extraContext??"")}}
    catch{}
    finally{setDraftReady(true)}
  },[draftKey]);

  useEffect(()=>{if(!draftReady)return;try{window.localStorage.setItem(draftKey,JSON.stringify({topic,audience,objective,cta,format,extraContext}))}catch{}},[draftKey,draftReady,topic,audience,objective,cta,format,extraContext]);

  function clearDraft(){setTopic("");setAudience("");setObjective("");setCta("");setFormat("auto");setExtraContext("");setError("");try{window.localStorage.removeItem(draftKey)}catch{}}

  async function generate(){
    if(!topic.trim()){setError("Topik / program wajib diisi.");return}
    if(!hasIntelligence||!intelligence){setError(`Brand Intelligence untuk ${activeBrand.name} belum tersedia.`);return}
    if(!resolvedAudience){setError("Target audience belum tersedia. Isi di Brand Intelligence atau Quick Brief.");return}
    setLoading(true);setError("");
    try{
      const response=await fetch("/api/ai/angles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brandId:activeBrand.id,brandName:activeBrand.name,topic:topic.trim(),audience:resolvedAudience,objective:objective.trim()||"Membangun awareness dan consideration yang relevan dengan positioning serta kebutuhan audience brand.",cta:cta.trim(),preferredFormat:format,extraContext:extraContext.trim(),brandIntelligence:intelligence})});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok||!payload?.ok)throw new Error(payload?.error||"Generate Story Angles gagal.");
      const bundle:CampaignBundle={campaign:payload.campaign,brand_profile:payload.brand_profile,cases:payload.cases,ideas:payload.ideas,sources:payload.sources,queries:payload.queries};
      saveCampaign(bundle);
      router.push(`/campaign/${payload.campaignId}`);
    }catch(err){setError(err instanceof Error?err.message:"Generate Story Angles gagal.")}
    finally{setLoading(false)}
  }

  return <div className="generator-page">
    <div className="generator-topline"><a href="/" className="generator-back"><ArrowLeft size={15}/> Dashboard</a><select value={activeBrand.id} onChange={e=>setActiveBrandId(e.target.value)}>{brands.map(brand=><option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></div>
    <div className="generator-header"><div><p className="eyebrow">BRIEF STUDIO · LIVE RESEARCH</p><h1>Quick Brief</h1><p className="muted">5 input utama → live research → 5 case-led Story Angles.</p></div><div className={hasIntelligence?"intel-badge":"intel-badge missing"}><Brain size={16}/>{hasIntelligence?`Brand Intelligence ${source}`:"Brand Intelligence missing"}</div></div>
    {!hasIntelligence&&<div className="generator-warning">Isi atau upload Brand Intelligence untuk {activeBrand.name} terlebih dahulu dari dashboard.</div>}
    <div className="generator-grid">
      <section className="panel form-panel"><div className="panel-head"><div><h2>Campaign Brief</h2><p>Draft tersimpan otomatis per active brand.</p></div><button className="ghost clear-draft" onClick={clearDraft}>Kosongkan</button></div>
        <label>1. Topic / Program<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Contoh: AI untuk Human Capital"/></label>
        <label>2. Target Audience <span className="optional">optional — fallback dari Brand Intelligence</span><input value={audience} onChange={e=>setAudience(e.target.value)} placeholder={resolvedAudience||"Contoh: HR Director, HC Manager"}/></label>
        <label>3. Objective <span className="optional">optional — default awareness + consideration</span><input value={objective} onChange={e=>setObjective(e.target.value)} placeholder="Contoh: membangun urgency terkait AI governance"/></label>
        <label>4. CTA <span className="optional">optional</span><input value={cta} onChange={e=>setCta(e.target.value)} placeholder="Contoh: pelajari program / konsultasi"/></label>
        <div className="form-row"><label>5. Preferred Format<select value={format} onChange={e=>setFormat(e.target.value as Format)}><option value="auto">Auto</option><option value="carousel">Carousel</option><option value="reels">Reels</option><option value="single_post">Single Post</option></select></label><label>Research mode<div className="research-mode"><Search size={14}/> Gemini + Tavily</div></label></div>
        <label>Advanced Context <span className="optional">optional</span><textarea value={extraContext} onChange={e=>setExtraContext(e.target.value)} placeholder="Campaign nuance, mandatory message, event context, restrictions..."/></label>
        {error&&<div className="generator-error">{error}</div>}
        <button className="primary generate" onClick={generate} disabled={!hasIntelligence||loading}><Sparkles size={16}/>{loading?"Researching cases & building angles...":"Generate 5 Story Angles"}<ArrowRight size={16}/></button>
      </section>
      <aside className="panel intel-panel"><div className="panel-head"><div><h2>Active Brand Intelligence</h2><p>{activeBrand.name} · injected automatically</p></div></div><div className="intel-box">{buildBrandContext(intelligence).split("\n").map(x=><p key={x}>{x}</p>)}</div><div className="research-note"><strong>Output standard</strong><p>Case/Evidence → Tension → Mechanism → Insight → Brand POV. AI wajib memakai sumber live dan menolak angle generik.</p></div></aside>
    </div>
  </div>;
}
