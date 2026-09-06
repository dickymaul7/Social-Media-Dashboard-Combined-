"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, FileText, Sparkles } from "lucide-react";
import { loadCampaign, saveBrief, type CampaignBundle, type BriefRecord } from "@/lib/smm-workflow";
import "./page.css";

export default function CampaignPage(){
  const {id}=useParams<{id:string}>();
  const router=useRouter();
  const [bundle,setBundle]=useState<CampaignBundle|null>(null);
  const [error,setError]=useState("");
  const [generatingId,setGeneratingId]=useState("");
  useEffect(()=>{const data=loadCampaign(id);setBundle(data);if(!data)setError("Campaign tidak ditemukan di browser storage. Generate ulang dari Quick Brief.")},[id]);

  async function generate(ideaId:string){if(!bundle)return;setGeneratingId(ideaId);setError("");try{const response=await fetch("/api/ai/brief",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ideaId,bundle})});const payload=await response.json().catch(()=>({}));if(!response.ok||!payload?.ok)throw new Error(payload?.error||"Gagal generate Full Brief.");saveBrief(payload.brief as BriefRecord);router.push(`/brief/${payload.brief.id}`)}catch(err){setError(err instanceof Error?err.message:"Gagal generate Full Brief.")}finally{setGeneratingId("")}}

  if(!bundle)return <main className="campaign-page"><a href="/content-generator" className="campaign-back"><ArrowLeft size={15}/> Quick Brief</a><div className="campaign-empty">{error||"Loading campaign..."}</div></main>;
  const {campaign,ideas,cases}=bundle;
  return <main className="campaign-page">
    <div className="campaign-top"><a href="/content-generator" className="campaign-back"><ArrowLeft size={15}/> Quick Brief</a><a href="/" className="campaign-back">Dashboard</a></div>
    <header className="campaign-header"><div><p className="eyebrow">LIVE RESEARCH COMPLETE</p><h1>Pilih satu Story Angle</h1><p>{campaign.topic} · {campaign.objective}</p></div><div className="campaign-audience"><span>Audience</span><strong>{campaign.audience}</strong></div></header>
    <div className="campaign-signal"><Sparkles size={15}/><span>5 angle dibuat dari case/evidence live. Pilih satu untuk membuat Full Storytelling Brief.</span></div>
    {error&&<div className="campaign-error">{error}</div>}
    <section className="campaign-angle-list">{ideas.map((idea,index)=>{const researchCase=cases.find(c=>c.id===idea.research_case_id);const caseSources=researchCase?.mapped_sources.slice(0,3)??[];return <article className="campaign-angle" key={idea.id}><div className="angle-main"><div className="angle-tags"><span>Angle {index+1}</span><span>{idea.recommended_format}</span>{researchCase?.selected&&<span className="flagship">Flagship case</span>}</div><h2>{idea.working_title}</h2><p>{idea.content_angle}</p><div className="angle-duo"><div><small>TENSION</small><p>{idea.tension}</p></div><div><small>CORE INSIGHT</small><p>{idea.core_insight}</p></div></div><div className="case-box"><small>REAL CASE</small><strong>{researchCase?.company_name||"Corporate case"} — {researchCase?.case_title||"Research case"}</strong><p>{researchCase?.case_summary}</p><div className="source-links">{caseSources.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.publisher}<ExternalLink size={11}/></a>)}</div></div></div><aside><button className="primary generate-brief" disabled={Boolean(generatingId)} onClick={()=>generate(idea.id)}><FileText size={15}/>{generatingId===idea.id?"Generating...":"Generate Full Brief"}</button><p>AI membuat story sequence, editorial quality review, dan auto-revise sekali bila skor awal di bawah 90.</p></aside></article>})}</section>
  </main>;
}
