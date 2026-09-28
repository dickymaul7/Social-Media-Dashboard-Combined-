"use client";

import {useEffect,useMemo,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import {ArrowLeft,CalendarDays,CheckCircle2,ExternalLink,FileText,Sparkles} from "lucide-react";
import {hasPermission} from "@/lib/access-control";
import {formatPlanMonth} from "@/lib/monthly-content-plan";
import {hydrateAllBriefsFromSupabase,hydrateAllCampaignsFromSupabase,loadAllBriefs,loadMonthlyPlan,saveBrief,type BriefRecord,type CampaignBundle,type StoryIdea} from "@/lib/smm-workflow";
import "./page.css";

type PlanItem={bundle:CampaignBundle;idea:StoryIdea;brief?:BriefRecord};

function dateLabel(date?:string){
 if(!date)return "Belum dijadwalkan";
 return new Intl.DateTimeFormat("id-ID",{weekday:"short",day:"numeric",month:"short",year:"numeric"}).format(new Date(`${date}T12:00:00`));
}

export default function MonthlyPlanPage(){
 const {id}=useParams<{id:string}>();
 const router=useRouter();
 const [bundles,setBundles]=useState<CampaignBundle[]>([]);
 const [briefs,setBriefs]=useState<BriefRecord[]>([]);
 const [loading,setLoading]=useState(true);
 const [generatingId,setGeneratingId]=useState("");
 const [bulkProgress,setBulkProgress]=useState<{done:number;total:number}|null>(null);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [canGenerate,setCanGenerate]=useState(true);

 function refresh(){setBundles(loadMonthlyPlan(id));setBriefs(loadAllBriefs())}
 useEffect(()=>{
  let active=true;refresh();
  void Promise.all([hydrateAllCampaignsFromSupabase(),hydrateAllBriefsFromSupabase(),hasPermission("brief.ai_generate")]).then(([,remoteBriefs,generate])=>{if(!active)return;setBundles(loadMonthlyPlan(id));setBriefs(remoteBriefs);setCanGenerate(generate);setLoading(false)}).catch(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[id]); // eslint-disable-line react-hooks/exhaustive-deps

 const items=useMemo<PlanItem[]>(()=>bundles.flatMap(bundle=>bundle.ideas.map(idea=>({bundle,idea,brief:briefs.find(brief=>brief.idea_id===idea.id)}))).sort((a,b)=>(a.idea.scheduled_for||"").localeCompare(b.idea.scheduled_for||"")),[bundles,briefs]);
 const month=bundles[0]?.campaign.monthly_plan_month||"";
 const brandName=bundles[0]?.campaign.brand_name||"Brand";
 const campaignCount=new Set(bundles.map(bundle=>bundle.campaign.monthly_campaign_name||bundle.campaign.topic)).size;
 const completed=items.filter(item=>item.brief).length;

 async function createBrief(item:PlanItem,navigate=false){
  const response=await fetch("/api/ai/brief",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ideaId:item.idea.id,bundle:item.bundle})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||!payload?.ok)throw new Error(payload?.error||"Gagal generate Full Brief.");
  const brief=payload.brief as BriefRecord;saveBrief(brief);setBriefs(current=>[brief,...current.filter(entry=>entry.id!==brief.id&&entry.idea_id!==brief.idea_id)]);
  if(navigate)router.push(`/brief/${brief.id}`);
  return brief;
 }

 async function generateOne(item:PlanItem){
  if(!canGenerate){setError("Akun ini tidak memiliki brief.ai_generate.");return}
  if(item.brief){router.push(`/brief/${item.brief.id}`);return}
  setGeneratingId(item.idea.id);setError("");setMessage("");
  try{await createBrief(item,true)}catch(err){setError(err instanceof Error?err.message:"Gagal generate Full Brief.")}finally{setGeneratingId("")}
 }

 async function generateAll(){
  if(!canGenerate){setError("Akun ini tidak memiliki brief.ai_generate.");return}
  const pending=items.filter(item=>!item.brief);
  if(!pending.length){setMessage("Semua Full Brief pada monthly plan ini sudah dibuat.");return}
  setError("");setMessage("");setBulkProgress({done:0,total:pending.length});
  let done=0;
  try{
   for(const item of pending){setGeneratingId(item.idea.id);await createBrief(item);done++;setBulkProgress({done,total:pending.length})}
   setMessage(`${done} Full Brief berhasil dibuat dan dijadwalkan. Seluruh brief tetap berstatus Human QC Pending.`);
  }catch(err){setError(`${done} brief berhasil dibuat sebelum proses berhenti. ${err instanceof Error?err.message:"Generate Full Brief gagal."}`)}
  finally{setGeneratingId("");setBulkProgress(null)}
 }

 if(loading&&!bundles.length)return <main className="monthly-page"><div className="monthly-empty">Memuat monthly plan...</div></main>;
 if(!bundles.length)return <main className="monthly-page"><a className="monthly-back" href="/content-generator"><ArrowLeft size={15}/> Content Generator</a><div className="monthly-empty">Monthly plan tidak ditemukan. Buka kembali dari Campaign History atau generate ulang.</div></main>;

 return <main className="monthly-page">
  <div className="monthly-top"><a className="monthly-back" href="/content-generator"><ArrowLeft size={15}/> Content Generator</a><a className="monthly-back" href="/?section=Content%20Calendar"><CalendarDays size={15}/> Content Calendar</a></div>
  <header className="monthly-header"><div><p className="eyebrow">MONTHLY CONTENT PLAN</p><h1>{formatPlanMonth(month)}</h1><p>{brandName} · {campaignCount} campaign · {items.length} konten</p></div><div className="monthly-actions"><div><span>Full Brief</span><strong>{completed}/{items.length}</strong></div><button className="primary" disabled={!canGenerate||Boolean(bulkProgress)||completed===items.length} onClick={generateAll}><Sparkles size={15}/>{bulkProgress?`${bulkProgress.done}/${bulkProgress.total} dibuat...`:completed===items.length?"Semua Brief Selesai":"Generate Semua Full Brief"}</button></div></header>
  <div className="monthly-note"><CalendarDays size={16}/><p>Setiap konten sudah mendapat tanggal publikasi. Full Brief yang dibuat akan masuk ke Content Calendar dengan status <strong>Human QC Pending</strong>, sehingga alur review tetap sama seperti Quick Brief.</p></div>
  {message&&<div className="monthly-alert success">{message}</div>}{error&&<div className="monthly-alert error">{error}</div>}
  <section className="monthly-summary"><div><span>Campaign</span><strong>{campaignCount}</strong></div><div><span>Konten</span><strong>{items.length}</strong></div><div><span>Full Brief</span><strong>{completed}</strong></div><div><span>Menunggu Brief</span><strong>{items.length-completed}</strong></div></section>
  <section className="monthly-list">{items.map((item,index)=>{const campaign=item.bundle.campaign.monthly_campaign_name||item.bundle.campaign.topic;const researchCase=item.bundle.cases.find(entry=>entry.id===item.idea.research_case_id);return <article className="monthly-card" key={item.idea.id}><div className="monthly-number"><span>{String(index+1).padStart(2,"0")}</span><small>{dateLabel(item.idea.scheduled_for)}</small></div><div className="monthly-content"><div className="monthly-tags"><span>{campaign}</span><span>{item.idea.recommended_format}</span>{item.brief&&<span className="done"><CheckCircle2 size={11}/> Full Brief siap</span>}</div><h2>{item.idea.working_title}</h2><p>{item.idea.content_angle}</p>{researchCase&&<small className="monthly-case">Case: {researchCase.company_name} — {researchCase.case_title}</small>}</div><div className="monthly-card-action">{item.brief?<a className="primary" href={`/brief/${item.brief.id}`}><FileText size={14}/> Buka Full Brief</a>:<button className="primary" disabled={Boolean(generatingId)||Boolean(bulkProgress)} onClick={()=>generateOne(item)}><Sparkles size={14}/>{generatingId===item.idea.id?"Generating...":"Generate Full Brief"}</button>}{researchCase?.mapped_sources?.[0]?.url&&<a className="source-link" href={researchCase.mapped_sources[0].url} target="_blank" rel="noreferrer">Sumber utama <ExternalLink size={11}/></a>}</div></article>})}</section>
 </main>;
}
