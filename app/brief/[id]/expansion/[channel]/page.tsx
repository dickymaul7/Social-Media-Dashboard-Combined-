"use client";

import {useEffect,useMemo,useState} from "react";
import {useParams,useRouter} from "next/navigation";
import {ArrowLeft,CalendarDays,CheckCircle2,Copy,RefreshCw,Save,ShieldCheck} from "lucide-react";
import {loadBrief,loadCampaign} from "@/lib/smm-workflow";
import {loadExpansionCalendarItem,saveExpansionCalendarItem,type ExpansionChannel} from "@/lib/expansion-calendar";
import {getExpansionMeta,loadWorkspaceSettings,saveExpansionMeta,type ExpansionMeta} from "@/lib/workspace-store";
import {hasPermission} from "@/lib/access-control";

type Channel=ExpansionChannel;
const isChannel=(v:string):v is Channel=>v==="linkedin"||v==="seo_geo";
const keyFor=(id:string,channel:Channel)=>`proxsis-smm:expansion:${id}:${channel}`;
function formatDate(value:string){return new Intl.DateTimeFormat("id-ID",{weekday:"long",day:"numeric",month:"long",year:"numeric"}).format(new Date(`${value}T12:00:00`))}
function sameTimestamp(a?:string,b?:string){if(!a||!b)return true;const aMs=Date.parse(a),bMs=Date.parse(b);if(Number.isFinite(aMs)&&Number.isFinite(bMs))return aMs===bMs;return a===b}

export default function ExpansionPage(){
 const {id,channel:raw}=useParams<{id:string;channel:string}>();
 const router=useRouter();
 const channel=isChannel(raw)?raw:null;
 const brief=useMemo(()=>loadBrief(id),[id]);
 const bundle=useMemo(()=>brief?loadCampaign(brief.campaign_id):null,[brief]);
 const [content,setContent]=useState<Record<string,any>|null>(null);
 const [meta,setMeta]=useState<ExpansionMeta|null>(null);
 const [loading,setLoading]=useState(false);
 const [checking,setChecking]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");
 const [scheduleDate,setScheduleDate]=useState("");
 const [scheduledFor,setScheduledFor]=useState("");
 const [permissions,setPermissions]=useState({view:true,generate:true,edit:true,qc:true,schedule:true,reschedule:true});
 const settings=useMemo(()=>loadWorkspaceSettings(),[]);
 const threshold=settings.derivative_alignment_threshold||85;

 useEffect(()=>{void Promise.all([hasPermission("brief.view"),hasPermission("brief.ai_generate"),hasPermission("brief.edit"),hasPermission("brief.qc"),hasPermission("calendar.schedule"),hasPermission("calendar.reschedule")]).then(([view,generate,edit,qc,schedule,reschedule])=>setPermissions({view,generate,edit,qc,schedule,reschedule}))},[]);

 useEffect(()=>{
  if(!channel||typeof window==="undefined")return;
  try{const rawValue=localStorage.getItem(keyFor(id,channel));if(rawValue)setContent(JSON.parse(rawValue))}catch{}
  const refreshHydratedState=()=>{
   try{
    const m=getExpansionMeta(id,channel);setMeta(m||null);
    const scheduled=loadExpansionCalendarItem(id,channel);
    if(scheduled){setScheduledFor(scheduled.scheduled_for);setScheduleDate(current=>current||scheduled.scheduled_for)}
   }catch{}
  };
  refreshHydratedState();
  window.addEventListener("proxsis-workspace:updated",refreshHydratedState);
  return()=>window.removeEventListener("proxsis-workspace:updated",refreshHydratedState);
 },[id,channel]);

 const outOfSync=Boolean(meta?.master_updated_at&&brief?.updated_at&&!sameTimestamp(meta.master_updated_at,brief.updated_at));
 const aligned=Number(meta?.alignment?.overall||0)>=threshold;
 const canQc=Boolean(permissions.qc&&meta?.alignment&&aligned&&!outOfSync);
 const schedulePermission=scheduledFor?permissions.reschedule:permissions.schedule;
 const canSchedule=Boolean(schedulePermission&&meta?.human_qc==="approved"&&aligned&&!outOfSync);
 const qcLockReason=!meta?.alignment?"Jalankan Alignment QC terlebih dahulu.":!aligned?`Alignment masih ${Number(meta.alignment.overall||0)}/100. Minimum ${threshold}.`:outOfSync?"Master Brief berubah setelah Alignment QC. Jalankan Alignment QC ulang.":!permissions.qc?"Akun ini tidak memiliki permission brief.qc.":"";
 const scheduleLockReason=meta?.human_qc!=="approved"?"Human QC belum disetujui.":!aligned?`Alignment harus minimal ${threshold}.`:outOfSync?"Master Brief berubah. Alignment dan Human QC perlu diperbarui.":!schedulePermission?`Akun ini tidak memiliki permission ${scheduledFor?"calendar.reschedule":"calendar.schedule"}.`:"";

 function persistMeta(patch:Partial<ExpansionMeta>){if(!channel||!brief)return;const next:ExpansionMeta={brief_id:id,channel,human_qc:"pending",updated_at:new Date().toISOString(),master_updated_at:brief.updated_at,...meta,...patch};saveExpansionMeta(next);setMeta(next)}
 async function generate(){if(!permissions.generate){setError("Akun ini tidak memiliki brief.ai_generate.");return}if(!channel||!brief||!bundle)return;setLoading(true);setError("");setMessage("");try{const res=await fetch("/api/ai/expansion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({channel,brief,campaignBundle:bundle})});const payload=await res.json().catch(()=>({}));if(!res.ok||!payload?.ok)throw new Error(payload?.error||"Generate gagal.");setContent(payload.content);localStorage.setItem(keyFor(id,channel),JSON.stringify(payload.content));persistMeta({human_qc:"pending",human_qc_at:undefined,alignment:undefined,master_updated_at:brief.updated_at});setMessage("Derivative content dibuat. Jalankan Alignment QC sebelum Human QC.")}catch(err){setError(err instanceof Error?err.message:"Generate gagal.")}finally{setLoading(false)}}
 useEffect(()=>{if(channel&&brief&&bundle&&!content&&!loading&&permissions.generate)void generate()},[channel,brief,bundle,permissions.generate]); // eslint-disable-line react-hooks/exhaustive-deps
 function update(key:string,value:any){if(!permissions.edit){setError("Akun ini tidak memiliki brief.edit.");return}setContent(current=>({...current,[key]:value}));persistMeta({human_qc:"pending",human_qc_at:undefined,alignment:undefined});setMessage("")}
 function save(){if(!permissions.edit){setError("Akun ini tidak memiliki brief.edit.");return}if(!channel||!content)return;localStorage.setItem(keyFor(id,channel),JSON.stringify(content));persistMeta({human_qc:"pending",human_qc_at:undefined,alignment:undefined});setMessage("Perubahan tersimpan. Alignment QC dan Human QC perlu dilakukan ulang.")}
 async function checkAlignment(){if(!permissions.qc){setError("Akun ini tidak memiliki brief.qc.");return}if(!channel||!brief||!content)return;setChecking(true);setError("");setMessage("");try{const res=await fetch("/api/ai/expansion/alignment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({channel,brief,content})});const payload=await res.json().catch(()=>({}));if(!res.ok||!payload?.ok)throw new Error(payload?.error||"Alignment QC gagal.");persistMeta({alignment:payload.alignment,human_qc:"pending",human_qc_at:undefined,master_updated_at:brief.updated_at});setMessage(Number(payload.alignment?.overall||0)>=threshold?`Alignment QC lolos threshold ${threshold}. Siap untuk Human QC.`:`Alignment belum mencapai threshold ${threshold}. Perbaiki rekomendasi sebelum Human QC.`)}catch(err){setError(err instanceof Error?err.message:"Alignment QC gagal.")}finally{setChecking(false)}}
 function approveQc(){if(!canQc){setError(qcLockReason||"Human QC belum dapat disetujui.");return}persistMeta({human_qc:"approved",human_qc_at:new Date().toISOString()});setError("");setMessage("Human QC derivative approved. Konten sekarang dapat dijadwalkan.")}
 function schedule(){if(!channel||!brief||!scheduleDate||!canSchedule){setError(scheduleLockReason||`Derivative harus lolos Alignment QC ≥${threshold}, Human QC, dan permission calendar sebelum dijadwalkan.`);return}const title=channel==="linkedin"?String(content?.hook||brief.working_title):String(content?.seo_title||content?.h1||brief.working_title);saveExpansionCalendarItem({id:`expansion-${id}-${channel}`,brief_id:id,brand_id:brief.brand_id,brand_name:brief.brand_name,channel,title,scheduled_for:scheduleDate,updated_at:new Date().toISOString()});persistMeta({scheduled_for:scheduleDate});setScheduledFor(scheduleDate);setError("");setMessage(`${channel==="linkedin"?"LinkedIn":"SEO/GEO"} dijadwalkan untuk ${formatDate(scheduleDate)} dan masuk Content Calendar.`)}
 async function copy(){if(!content)return;await navigator.clipboard.writeText(JSON.stringify(content,null,2));setMessage("Content copied.")}

 if(!permissions.view)return <main style={{padding:32,fontFamily:"Arial,sans-serif",color:"#a3152d"}}>Akun ini tidak memiliki permission brief.view.</main>;
 if(!channel||!brief||!bundle)return <main style={{padding:32,fontFamily:"Arial,sans-serif"}}><button onClick={()=>router.push(`/brief/${id}`)}>← Master Brief</button><p style={{color:"#a3152d"}}>Expansion tidak tersedia atau brief belum ditemukan.</p></main>;
 const fields=Object.entries(content||{});const score=Number(meta?.alignment?.overall||0);
 return <main style={{maxWidth:1180,margin:"0 auto",padding:"28px 24px 60px",fontFamily:"Arial,sans-serif",color:"#241f21"}}><div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap",borderBottom:"1px solid #e8e2e4",paddingBottom:18}}><div><button onClick={()=>router.push(`/brief/${id}`)} style={ghost}><ArrowLeft size={14}/> Master Brief</button><p style={{fontSize:11,fontWeight:800,letterSpacing:".12em",color:"#9a1732",margin:"18px 0 6px"}}>CONTENT EXPANSION · HUMAN EDITABLE</p><h1 style={{fontSize:30,margin:0}}>{channel==="linkedin"?"LinkedIn Native Content":"SEO + GEO Friendly Content"}</h1><p style={{color:"#756b70",maxWidth:760,lineHeight:1.6}}>Master brief tetap menjadi source of truth. Edit derivative tidak mengubah master brief.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={ghost} onClick={copy}><Copy size={14}/> Copy</button><button style={ghost} onClick={save} disabled={!permissions.edit}><Save size={14}/> Save</button><button style={primary} onClick={generate} disabled={loading||!permissions.generate}><RefreshCw size={14}/>{loading?"Generating...":"Regenerate"}</button></div></div>{outOfSync&&<div style={warn}><strong>Master Brief berubah.</strong> Derivative ini out of sync. Regenerate atau edit lalu jalankan Alignment QC ulang.</div>}{(message||error)&&<div style={{marginTop:18,padding:"12px 14px",borderRadius:10,background:error?"#fff0f1":"#eefaf3",color:error?"#a3152d":"#17633a",fontSize:13}}>{error||message}</div>}{!content?<div style={{padding:40,textAlign:"center",color:"#7b7276"}}>{loading?"DeepSeek sedang mengonversi master brief...":"Belum ada derivative content."}</div>:<div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 310px",gap:22,marginTop:22}}><section style={card}><h2 style={{marginTop:0}}>Editable Content</h2>{fields.filter(([key])=>!Array.isArray(content[key])&&typeof content[key]!=="object").map(([key,value])=><label key={key} style={label}><span>{key.replaceAll("_"," ")}</span><textarea disabled={!permissions.edit} rows={key.includes("draft")||key==="body_copy"?18:key==="outline"?10:4} value={String(value??"")} onChange={e=>update(key,e.target.value)} style={textarea}/></label>)}{fields.filter(([key])=>Array.isArray(content[key])).map(([key,value])=><label key={key} style={label}><span>{key.replaceAll("_"," ")}</span><textarea disabled={!permissions.edit} rows={Array.isArray(value)&&value.some((x:any)=>typeof x==="object")?12:6} value={Array.isArray(value)&&value.some((x:any)=>typeof x==="object")?JSON.stringify(value,null,2):(value as any[]).join("\n")} onChange={e=>{try{update(key,JSON.parse(e.target.value))}catch{if(!e.target.value.trim().startsWith("["))update(key,e.target.value.split("\n").map(x=>x.trim()).filter(Boolean))}}} style={textarea}/></label>)}</section><aside style={{display:"grid",gap:14,alignContent:"start"}}><div style={{...card,background:"#2a2426",color:"white"}}><p style={{fontSize:11,fontWeight:800,letterSpacing:".1em",color:"#e6a7b6"}}>DERIVATIVE QUALITY CONTROL</p><h3>Alignment {score||0}/100 · Threshold {threshold}</h3><p style={{fontSize:13,lineHeight:1.7,color:"#ddd4d7"}}>{meta?.alignment?.verdict||"Check apakah core message, audience, Brand POV, facts/claims dan channel fit tetap selaras dengan master."}</p><button style={{...ghost,width:"100%",justifyContent:"center"}} onClick={checkAlignment} disabled={checking||!permissions.qc}><ShieldCheck size={14}/>{checking?"Checking...":"Run Alignment QC"}</button>{meta?.alignment&&<div style={{marginTop:10,fontSize:11,lineHeight:1.6,color:"#ddd4d7"}}>{meta.alignment.risks?.slice(0,3).map((x,i)=><div key={i}>• {x}</div>)}</div>}</div><div style={card}><p style={{fontSize:11,fontWeight:800,letterSpacing:".1em",color:"#9a1732"}}>HUMAN QUALITY CONTROL</p><h3 style={{marginTop:6}}>{meta?.human_qc==="approved"?"Approved ✓":"Pending"}</h3><p style={{fontSize:12,color:"#756b70",lineHeight:1.6}}>Human QC hanya dapat disetujui jika Alignment ≥{threshold}, master belum berubah, dan user memiliki brief.qc.</p><button style={{...primary,width:"100%",justifyContent:"center"}} onClick={approveQc} disabled={!canQc||meta?.human_qc==="approved"}><CheckCircle2 size={14}/>{meta?.human_qc==="approved"?"Human QC Approved":"Tandai Lolos Human QC"}</button>{!canQc&&meta?.human_qc!=="approved"&&<p style={lockText}>{qcLockReason}</p>}</div><div style={card}><p style={{fontSize:11,fontWeight:800,letterSpacing:".1em",color:"#9a1732"}}>CONTENT CALENDAR</p><h3 style={{marginTop:6}}>{scheduledFor?"Ubah Jadwal":"Jadwalkan Konten"}</h3>{scheduledFor&&<p style={{fontSize:12,color:"#756b70"}}>Terjadwal: {formatDate(scheduledFor)}</p>}<input type="date" value={scheduleDate} onChange={e=>setScheduleDate(e.target.value)} style={{...textarea,minHeight:0,height:42,resize:"none"}}/><button style={{...primary,width:"100%",justifyContent:"center",marginTop:10}} onClick={schedule} disabled={!scheduleDate||!canSchedule}><CalendarDays size={14}/>{scheduledFor?"Simpan Ubah Jadwal":"Masukkan ke Calendar"}</button>{!canSchedule&&<p style={lockText}>{scheduleLockReason||"Pilih tanggal untuk menjadwalkan konten."}</p>}{scheduledFor&&<button style={{...ghost,width:"100%",justifyContent:"center",marginTop:8}} onClick={()=>router.push("/?section=Content%20Calendar")}><CalendarDays size={14}/> Buka Content Calendar</button>}</div></aside></div>}</main>}
const card:React.CSSProperties={border:"1px solid #e5dfe2",borderRadius:16,background:"#fff",padding:20,boxShadow:"0 6px 22px rgba(44,27,33,.05)"};
const label:React.CSSProperties={display:"grid",gap:7,marginTop:16,fontSize:12,fontWeight:700,textTransform:"capitalize"};
const textarea:React.CSSProperties={width:"100%",boxSizing:"border-box",border:"1px solid #ddd5d8",borderRadius:10,padding:12,fontFamily:"inherit",fontSize:13,lineHeight:1.6,resize:"vertical"};
const ghost:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:7,border:"1px solid #ded6d9",background:"#fff",borderRadius:9,padding:"9px 12px",cursor:"pointer",fontWeight:700,fontSize:12};
const primary:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:7,border:0,background:"#98142f",color:"#fff",borderRadius:9,padding:"10px 13px",cursor:"pointer",fontWeight:800,fontSize:12};
const warn:React.CSSProperties={marginTop:18,padding:"12px 14px",border:"1px solid #eed39a",borderRadius:10,background:"#fff8e9",color:"#805b1c",fontSize:12,lineHeight:1.6};
const lockText:React.CSSProperties={fontSize:10,color:"#9a1732",lineHeight:1.5,marginBottom:0};
