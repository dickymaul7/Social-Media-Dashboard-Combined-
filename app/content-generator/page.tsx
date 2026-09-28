"use client";

import {useEffect,useMemo,useState} from "react";
import {useRouter} from "next/navigation";
import {ArrowLeft,ArrowRight,Brain,CalendarRange,Clock3,Search,Sparkles} from "lucide-react";
import {useActiveBrand} from "@/components/active-brand";
import {useBrandIntelligence} from "@/components/brand-intelligence-context";
import {buildBrandContext,resolveAudience} from "@/lib/brand-intelligence";
import {hydrateCampaignsFromSupabase,loadCampaignsForBrand,saveCampaign,type CampaignBundle} from "@/lib/smm-workflow";
import {loadWorkspaceSettings} from "@/lib/workspace-store";
import {hasPermission} from "@/lib/access-control";
import {buildMonthlyBatchPlan,currentLocalMonth,formatPlanMonth,parseCampaignIdeas,scheduleMonthlyDates} from "@/lib/monthly-content-plan";
import "./page.css";
import "./monthly.css";

type Format="auto"|"carousel"|"reels"|"single_post";
type GeneratorMode="quick"|"monthly";

export default function ContentGeneratorPage(){
 const router=useRouter();
 const {activeBrand,brands,setActiveBrandId}=useActiveBrand();
 const {intelligence,hasIntelligence,source}=useBrandIntelligence();
 const settings=useMemo(()=>loadWorkspaceSettings(),[]);
 const draftKey=`proxsis-smm:quick-brief:${activeBrand.id}`;
 const [mode,setMode]=useState<GeneratorMode>("quick");
 const [topic,setTopic]=useState("");
 const [campaignIdeas,setCampaignIdeas]=useState("");
 const [planMonth,setPlanMonth]=useState(currentLocalMonth);
 const [monthlyContentCount,setMonthlyContentCount]=useState(30);
 const [audience,setAudience]=useState("");
 const [objective,setObjective]=useState("");
 const [cta,setCta]=useState("");
 const [format,setFormat]=useState<Format>(settings.default_format);
 const [storyAngleCount,setStoryAngleCount]=useState(5);
 const [extraContext,setExtraContext]=useState("");
 const [loading,setLoading]=useState(false);
 const [progress,setProgress]=useState("");
 const [error,setError]=useState("");
 const [draftReady,setDraftReady]=useState(false);
 const [history,setHistory]=useState<CampaignBundle[]>([]);
 const [permissions,setPermissions]=useState({view:true,create:true,generate:true});
 const resolvedAudience=useMemo(()=>resolveAudience(audience,intelligence),[audience,intelligence]);
 const parsedCampaigns=useMemo(()=>parseCampaignIdeas(campaignIdeas),[campaignIdeas]);
 const batchPlan=useMemo(()=>buildMonthlyBatchPlan(parsedCampaigns,monthlyContentCount),[parsedCampaigns,monthlyContentCount]);

 useEffect(()=>{void Promise.all([hasPermission("brief.view"),hasPermission("brief.create"),hasPermission("brief.ai_generate")]).then(([view,create,generate])=>setPermissions({view,create,generate}))},[]);
 useEffect(()=>{
  let active=true;setDraftReady(false);
  try{
   const raw=window.localStorage.getItem(draftKey);
   if(raw){
    const d=JSON.parse(raw);
    setMode(d.mode==="monthly"?"monthly":"quick");setTopic(d.topic??"");setCampaignIdeas(d.campaignIdeas??"");setPlanMonth(/^\d{4}-\d{2}$/.test(d.planMonth)?d.planMonth:currentLocalMonth());setMonthlyContentCount(Math.min(30,Math.max(1,Math.round(Number(d.monthlyContentCount||30)))));setAudience(d.audience??"");setObjective(d.objective??settings.default_objective);setCta(d.cta??settings.default_cta);setFormat(["carousel","reels","single_post","auto"].includes(d.format)?d.format:settings.default_format);const count=Math.round(Number(d.storyAngleCount||5));setStoryAngleCount(Number.isFinite(count)?Math.min(10,Math.max(1,count)):5);setExtraContext(d.extraContext??"");
   }else{
    setMode("quick");setTopic("");setCampaignIdeas("");setPlanMonth(currentLocalMonth());setMonthlyContentCount(30);setAudience("");setObjective(settings.default_objective);setCta(settings.default_cta);setFormat(settings.default_format);setStoryAngleCount(5);setExtraContext("");
   }
   setHistory(loadCampaignsForBrand(activeBrand.id).slice(0,40));
  }catch{setHistory([])}finally{setDraftReady(true)}
  void hydrateCampaignsFromSupabase(activeBrand.id).then(items=>{if(active)setHistory(items.slice(0,40))});
  return()=>{active=false};
 },[draftKey,activeBrand.id,settings.default_cta,settings.default_format,settings.default_objective]);
 useEffect(()=>{if(!draftReady)return;try{window.localStorage.setItem(draftKey,JSON.stringify({mode,topic,campaignIdeas,planMonth,monthlyContentCount,audience,objective,cta,format,storyAngleCount,extraContext}))}catch{}},[draftKey,draftReady,mode,topic,campaignIdeas,planMonth,monthlyContentCount,audience,objective,cta,format,storyAngleCount,extraContext]);

 const historyItems=useMemo(()=>{
  const monthly=new Map<string,{id:string;month:string;campaigns:Set<string>;contents:number;createdAt:string}>();
  const quick:CampaignBundle[]=[];
  for(const bundle of history){
   const planId=bundle.campaign.monthly_plan_id;
   if(!planId){quick.push(bundle);continue}
   const current=monthly.get(planId)??{id:planId,month:bundle.campaign.monthly_plan_month||"",campaigns:new Set<string>(),contents:0,createdAt:bundle.campaign.created_at};
   current.campaigns.add(bundle.campaign.monthly_campaign_name||bundle.campaign.topic);current.contents+=bundle.ideas.length;
   if(bundle.campaign.created_at>current.createdAt)current.createdAt=bundle.campaign.created_at;
   monthly.set(planId,current);
  }
  return [
   ...Array.from(monthly.values()).map(item=>({key:`monthly-${item.id}`,title:`Plan Konten ${formatPlanMonth(item.month)}`,meta:`${item.campaigns.size} campaign · ${item.contents} konten`,href:`/monthly-plan/${item.id}`,createdAt:item.createdAt,monthly:true})),
   ...quick.map(bundle=>({key:bundle.campaign.id,title:bundle.campaign.topic,meta:`${bundle.ideas.length} angles`,href:`/campaign/${bundle.campaign.id}`,createdAt:bundle.campaign.created_at,monthly:false})),
  ].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,8);
 },[history]);

 function clearDraft(){
  if(!permissions.create){setError("Akun ini tidak memiliki brief.create.");return}
  setTopic("");setCampaignIdeas("");setPlanMonth(currentLocalMonth());setMonthlyContentCount(30);setAudience("");setObjective(settings.default_objective);setCta(settings.default_cta);setFormat(settings.default_format);setStoryAngleCount(5);setExtraContext("");setProgress("");setError("");
  try{window.localStorage.removeItem(draftKey)}catch{}
 }

 async function requestAngles(topicValue:string,count:number,context:string){
  const response=await fetch("/api/ai/angles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({brandId:activeBrand.id,brandName:activeBrand.name,topic:topicValue,audience:resolvedAudience,objective:objective.trim()||settings.default_objective,cta:cta.trim()||settings.default_cta,preferredFormat:format,storyAngleCount:count,extraContext:context,brandIntelligence:intelligence,qualityThreshold:settings.story_qc_threshold})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||!payload?.ok)throw new Error(payload?.error||"Generate Story Angles gagal.");
  return payload;
 }

 async function generateQuick(){
  if(!topic.trim())throw new Error("Topik / program wajib diisi.");
  const payload=await requestAngles(topic.trim(),storyAngleCount,extraContext.trim());
  const bundle:CampaignBundle={campaign:payload.campaign,brand_profile:payload.brand_profile,cases:payload.cases,ideas:payload.ideas,sources:payload.sources,queries:payload.queries};
  saveCampaign(bundle);setHistory(loadCampaignsForBrand(activeBrand.id).slice(0,40));router.push(`/campaign/${payload.campaignId}`);
 }

 async function generateMonthly(){
  if(!parsedCampaigns.length)throw new Error("Masukkan minimal satu ide campaign, satu campaign per baris.");
  if(parsedCampaigns.length>10)throw new Error("Maksimal 10 ide campaign dalam satu monthly plan.");
  if(monthlyContentCount<parsedCampaigns.length)throw new Error("Jumlah konten tidak boleh lebih sedikit daripada jumlah campaign.");
  if(!/^\d{4}-\d{2}$/.test(planMonth))throw new Error("Pilih bulan publikasi.");
  const planId=crypto.randomUUID(),generated:CampaignBundle[]=[];
  const priorTitles=new Map<string,string[]>();
  for(let index=0;index<batchPlan.length;index++){
   const batch=batchPlan[index];
   setProgress(`Riset campaign ${index+1} dari ${batchPlan.length}: ${batch.topic} · ${batch.count} konten`);
   const avoid=priorTitles.get(batch.topic)??[];
   const monthlyContext=[extraContext.trim(),`MONTHLY PLAN: ${formatPlanMonth(planMonth)}. Campaign ${batch.campaignIndex+1}: ${batch.topic}. Batch ${batch.batchIndex} dari ${batch.batchTotal}. Buat angle yang saling berbeda dan membentuk variasi awareness, consideration, dan conversion.`,avoid.length?`Jangan mengulang judul/angle yang sudah dibuat: ${avoid.join(" | ")}`:""].filter(Boolean).join("\n\n");
   const payload=await requestAngles(batch.topic,batch.count,monthlyContext);
   const bundle:CampaignBundle={campaign:{...payload.campaign,monthly_plan_id:planId,monthly_plan_month:planMonth,monthly_campaign_name:batch.topic,monthly_batch_index:index+1,monthly_total_contents:monthlyContentCount},brand_profile:payload.brand_profile,cases:payload.cases,ideas:payload.ideas,sources:payload.sources,queries:payload.queries};
   generated.push(bundle);priorTitles.set(batch.topic,[...avoid,...bundle.ideas.map(idea=>idea.working_title)]);
  }
  const byCampaign=parsedCampaigns.map(topic=>generated.filter(bundle=>bundle.campaign.monthly_campaign_name===topic).flatMap(bundle=>bundle.ideas.map(idea=>({bundle,idea}))));
  const publishingOrder:Array<{bundle:CampaignBundle;idea:CampaignBundle["ideas"][number]}>=[];
  for(let cursor=0;publishingOrder.length<monthlyContentCount;cursor++)for(const group of byCampaign)if(group[cursor])publishingOrder.push(group[cursor]);
  const dates=scheduleMonthlyDates(planMonth,monthlyContentCount);
  publishingOrder.forEach((entry,index)=>{entry.idea.scheduled_for=dates[index]});
  generated.forEach(saveCampaign);
  setHistory(loadCampaignsForBrand(activeBrand.id).slice(0,40));
  router.push(`/monthly-plan/${planId}`);
 }

 async function generate(){
  if(!permissions.create||!permissions.generate){setError("Akun ini tidak memiliki permission untuk membuat/generate brief.");return}
  if(!hasIntelligence||!intelligence){setError(`Brand Intelligence untuk ${activeBrand.name} belum tersedia.`);return}
  if(!resolvedAudience){setError("Target audience belum tersedia. Isi di Brand Intelligence atau Campaign Brief.");return}
  setLoading(true);setError("");setProgress("");
  try{if(mode==="monthly")await generateMonthly();else await generateQuick()}
  catch(err){setError(err instanceof Error?err.message:"Generate Story Angles gagal.")}
  finally{setLoading(false);setProgress("")}
 }

 if(!permissions.view)return <main className="generator-page"><div className="generator-warning">Akun ini tidak memiliki permission brief.view.</div></main>;
 return <div className="generator-page">
  <div className="generator-topline"><a href="/" className="generator-back"><ArrowLeft size={15}/> Dashboard</a><select value={activeBrand.id} onChange={e=>setActiveBrandId(e.target.value)}>{brands.map(brand=><option key={brand.id} value={brand.id}>{brand.name}</option>)}</select></div>
  <div className="generator-header"><div><p className="eyebrow">BRIEF STUDIO · LIVE RESEARCH</p><h1>{mode==="monthly"?"Monthly Content Plan":"Quick Brief"}</h1><p className="muted">{mode==="monthly"?"Beberapa ide campaign → live research per campaign → hingga 30 konten terjadwal dalam satu bulan.":"5 input utama → Topic Lock → live research Indonesia + global → hingga 10 case-led Story Angles."}</p></div><div className={hasIntelligence?"intel-badge":"intel-badge missing"}><Brain size={16}/>{hasIntelligence?`Brand Intelligence ${source}`:"Brand Intelligence missing"}</div></div>
  <div className="generator-mode" role="tablist" aria-label="Mode Content Generator"><button className={mode==="quick"?"active":""} onClick={()=>setMode("quick")} role="tab" aria-selected={mode==="quick"}><Sparkles size={15}/><span><strong>Quick Brief</strong><small>1 campaign · hingga 10 konten</small></span></button><button className={mode==="monthly"?"active":""} onClick={()=>setMode("monthly")} role="tab" aria-selected={mode==="monthly"}><CalendarRange size={15}/><span><strong>1 Bulan Penuh</strong><small>Multi-campaign · hingga 30 konten</small></span></button></div>
  {!hasIntelligence&&<div className="generator-warning">Isi atau upload Brand Intelligence untuk {activeBrand.name} terlebih dahulu dari dashboard.</div>}
  {(!permissions.create||!permissions.generate)&&<div className="generator-warning">Akun ini read-only untuk Brief Studio. brief.create dan brief.ai_generate diperlukan untuk generate Story Angles.</div>}
  <div className="generator-grid"><section className="panel form-panel"><div className="panel-head"><div><h2>{mode==="monthly"?"Monthly Campaign Brief":"Campaign Brief"}</h2><p>Draft tersimpan otomatis per active brand.</p></div><button className="ghost clear-draft" onClick={clearDraft} disabled={!permissions.create}>Kosongkan</button></div>
   {mode==="quick"?<label>1. Topic / Program <span className="topic-lock">Topic Lock</span><input disabled={!permissions.create} value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Contoh: AI untuk Human Capital"/></label>:<><label>1. Ide Campaign <span className="topic-lock">SATU PER BARIS</span><textarea className="campaign-ideas" disabled={!permissions.create} value={campaignIdeas} onChange={e=>setCampaignIdeas(e.target.value)} placeholder={"Contoh:\nAI Governance untuk HR\nFuture Skills untuk Manager\nProgram Training AI for Human Capital"}/></label><div className="monthly-counter"><span>{parsedCampaigns.length} campaign</span><span>{monthlyContentCount} konten</span><span>{batchPlan.length} proses riset</span></div><div className="form-row"><label>Bulan Publikasi<input type="month" disabled={!permissions.create} value={planMonth} onChange={e=>setPlanMonth(e.target.value)}/></label><label>Jumlah Konten <span className="optional">maks. 30</span><input type="number" min={1} max={30} disabled={!permissions.create} value={monthlyContentCount} onChange={e=>setMonthlyContentCount(Math.min(30,Math.max(1,Number(e.target.value)||1)))}/></label></div></>}
   <label>2. Target Audience <span className="optional">optional — fallback dari Brand Intelligence</span><input disabled={!permissions.create} value={audience} onChange={e=>setAudience(e.target.value)} placeholder={resolvedAudience||"Contoh: HR Director, HC Manager"}/></label>
   <label>3. Objective <span className="optional">workspace default tersedia</span><input disabled={!permissions.create} value={objective} onChange={e=>setObjective(e.target.value)} placeholder="Contoh: membangun urgency terkait AI governance"/></label>
   <label>4. CTA <span className="optional">workspace default tersedia</span><input disabled={!permissions.create} value={cta} onChange={e=>setCta(e.target.value)} placeholder="Contoh: pelajari program / konsultasi"/></label>
   <div className="form-row"><label>5. Preferred Format<select disabled={!permissions.create} value={format} onChange={e=>setFormat(e.target.value as Format)}><option value="auto">Auto</option><option value="carousel">Carousel</option><option value="reels">Reels</option><option value="single_post">Single Post</option></select></label>{mode==="quick"?<label>Story Angles<select disabled={!permissions.create} value={storyAngleCount} onChange={e=>setStoryAngleCount(Math.min(10,Math.max(1,Number(e.target.value)||5)))}>{Array.from({length:10},(_,i)=>i+1).map(count=><option key={count} value={count}>{count} angle{count>1?"s":""}</option>)}</select></label>:<label>Distribusi<div className="research-mode"><CalendarRange size={14}/> Otomatis sepanjang bulan</div></label>}</div>
   <div className="form-row"><label>Research mode<div className="research-mode"><Search size={14}/> DeepSeek + Tavily + Indonesia News</div></label><label>Editorial target<div className="research-mode"><Sparkles size={14}/> Case-first · anti AI-slop</div></label></div>
   <label>Advanced Context <span className="optional">optional</span><textarea disabled={!permissions.create} value={extraContext} onChange={e=>setExtraContext(e.target.value)} placeholder="Campaign nuance, mandatory message, event context, restrictions..."/></label>
   {progress&&<div className="generation-progress"><span/><div><strong>Monthly plan sedang dibuat</strong><p>{progress}</p></div></div>}
   {error&&<div className="generator-error">{error}</div>}
   <button className="primary generate" onClick={generate} disabled={!hasIntelligence||loading||!permissions.create||!permissions.generate}><Sparkles size={16}/>{loading?(mode==="monthly"?"Menyusun monthly plan...":`Researching cases & generating ${storyAngleCount} angles...`):(mode==="monthly"?`Generate ${monthlyContentCount} Konten untuk ${formatPlanMonth(planMonth)}`:`Generate ${storyAngleCount} Story Angles`)}<ArrowRight size={16}/></button>
  </section><aside className="panel intel-panel"><div className="panel-head"><div><h2>Active Brand Intelligence</h2><p>{activeBrand.name} · injected automatically</p></div></div><div className="intel-box">{buildBrandContext(intelligence).split("\n").map(x=><p key={x}>{x}</p>)}</div><div className="research-note"><strong>{mode==="monthly"?"Multi-Campaign Topic Lock":"Topic Lock aktif"}</strong><p>{mode==="monthly"?"Setiap baris diproses sebagai campaign terpisah. Sistem membagi maksimal 10 angle per proses, mencegah pengulangan, lalu menyebarkan tanggal publikasi sepanjang bulan.":"Brand Intelligence hanya menjadi guardrail. AI tidak boleh mengganti topik user dengan expertise brand lain. Analogous case boleh dipakai jika mechanism/decision pattern relevan dan evidence jelas."}</p></div></aside></div>
  <section className="panel campaign-history"><div className="panel-head"><div><h2>Campaign History</h2><p>Quick Brief dan Monthly Plan terbaru untuk {activeBrand.name}.</p></div><span className="data-note">{historyItems.length} saved</span></div>{historyItems.length?<div className="history-list">{historyItems.map(item=><button key={item.key} onClick={()=>router.push(item.href)}>{item.monthly?<CalendarRange size={15}/>:<Clock3 size={15}/>}<div><strong>{item.title}</strong><span>{new Date(item.createdAt).toLocaleString("id-ID",{day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})} · {item.meta}</span></div><ArrowRight size={15}/></button>)}</div>:<div className="history-empty">Belum ada campaign tersimpan untuk active brand ini.</div>}</section>
 </div>;
}
