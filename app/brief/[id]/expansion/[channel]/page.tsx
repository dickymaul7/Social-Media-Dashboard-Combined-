"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Copy, RefreshCw, Save } from "lucide-react";
import { loadBrief, loadCampaign } from "@/lib/smm-workflow";

type Channel="linkedin"|"seo_geo";
const isChannel=(v:string):v is Channel=>v==="linkedin"||v==="seo_geo";
const keyFor=(id:string,channel:Channel)=>`proxsis-smm:expansion:${id}:${channel}`;

export default function ExpansionPage(){
 const {id,channel:raw}=useParams<{id:string;channel:string}>();
 const router=useRouter();
 const channel=isChannel(raw)?raw:null;
 const brief=useMemo(()=>loadBrief(id),[id]);
 const bundle=useMemo(()=>brief?loadCampaign(brief.campaign_id):null,[brief]);
 const [content,setContent]=useState<Record<string,any>|null>(null);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const [message,setMessage]=useState("");

 useEffect(()=>{if(!channel||typeof window==="undefined")return;try{const rawValue=localStorage.getItem(keyFor(id,channel));if(rawValue)setContent(JSON.parse(rawValue))}catch{}},[id,channel]);
 async function generate(){if(!channel||!brief||!bundle)return;setLoading(true);setError("");setMessage("");try{const res=await fetch("/api/ai/expansion",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({channel,brief,campaignBundle:bundle})});const payload=await res.json().catch(()=>({}));if(!res.ok||!payload?.ok)throw new Error(payload?.error||"Generate gagal.");setContent(payload.content);localStorage.setItem(keyFor(id,channel),JSON.stringify(payload.content));setMessage("Derivative content berhasil dibuat dan disimpan di browser.")}catch(err){setError(err instanceof Error?err.message:"Generate gagal.")}finally{setLoading(false)}}
 useEffect(()=>{if(channel&&brief&&bundle&&!content&&!loading)void generate()},[channel,brief,bundle]); // eslint-disable-line react-hooks/exhaustive-deps
 function update(key:string,value:any){setContent(current=>({...current,[key]:value}));setMessage("")}
 function save(){if(!channel||!content)return;localStorage.setItem(keyFor(id,channel),JSON.stringify(content));setMessage("Perubahan tersimpan.")}
 async function copy(){if(!content)return;await navigator.clipboard.writeText(JSON.stringify(content,null,2));setMessage("Content copied.")}
 if(!channel||!brief||!bundle)return <main style={{padding:32,fontFamily:"Arial,sans-serif"}}><button onClick={()=>router.push(`/brief/${id}`)}>← Master Brief</button><p style={{color:"#a3152d"}}>Expansion tidak tersedia atau brief belum ditemukan.</p></main>;
 const fields=Object.entries(content||{});
 return <main style={{maxWidth:1180,margin:"0 auto",padding:"28px 24px 60px",fontFamily:"Arial,sans-serif",color:"#241f21"}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap",borderBottom:"1px solid #e8e2e4",paddingBottom:18}}>
   <div><button onClick={()=>router.push(`/brief/${id}`)} style={ghost}><ArrowLeft size={14}/> Master Brief</button><p style={{fontSize:11,fontWeight:800,letterSpacing:".12em",color:"#9a1732",margin:"18px 0 6px"}}>CONTENT EXPANSION · HUMAN EDITABLE</p><h1 style={{fontSize:30,margin:0}}>{channel==="linkedin"?"LinkedIn Native Content":"SEO + GEO Friendly Content"}</h1><p style={{color:"#756b70",maxWidth:760,lineHeight:1.6}}>Master brief tetap menjadi source of truth. Adaptasi ini boleh diubah secara manual tanpa mengubah master brief.</p></div>
   <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button style={ghost} onClick={copy}><Copy size={14}/> Copy</button><button style={ghost} onClick={save}><Save size={14}/> Save</button><button style={primary} onClick={generate} disabled={loading}><RefreshCw size={14}/>{loading?"Generating...":"Regenerate"}</button></div>
  </div>
  {(message||error)&&<div style={{marginTop:18,padding:"12px 14px",borderRadius:10,background:error?"#fff0f1":"#eefaf3",color:error?"#a3152d":"#17633a",fontSize:13}}>{error||message}</div>}
  {!content?<div style={{padding:40,textAlign:"center",color:"#7b7276"}}>{loading?"DeepSeek sedang mengonversi master brief...":"Belum ada derivative content."}</div>:
  <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) 300px",gap:22,marginTop:22}}>
   <section style={card}><h2 style={{marginTop:0}}>Editable Content</h2>{fields.filter(([key])=>!Array.isArray(content[key])&&typeof content[key]!=="object").map(([key,value])=><label key={key} style={label}><span>{key.replaceAll("_"," ")}</span><textarea rows={key.includes("draft")||key==="body_copy"?18:key==="outline"?10:4} value={String(value??"")} onChange={e=>update(key,e.target.value)} style={textarea}/></label>)}
   {fields.filter(([key])=>Array.isArray(content[key])).map(([key,value])=><label key={key} style={label}><span>{key.replaceAll("_"," ")}</span><textarea rows={Array.isArray(value)&&value.some((x:any)=>typeof x==="object")?12:6} value={Array.isArray(value)&&value.some((x:any)=>typeof x==="object")?JSON.stringify(value,null,2):(value as any[]).join("\n")} onChange={e=>{try{update(key,JSON.parse(e.target.value))}catch{if(!e.target.value.trim().startsWith("["))update(key,e.target.value.split("\n").map(x=>x.trim()).filter(Boolean))}}} style={textarea}/></label>)}
   </section>
   <aside style={{display:"grid",gap:14,alignContent:"start"}}><div style={{...card,background:"#2a2426",color:"white"}}><p style={{fontSize:11,fontWeight:800,letterSpacing:".1em",color:"#e6a7b6"}}>QUALITY STANDARD</p><h3>{channel==="linkedin"?"Native, not repurposed.":"Searchable + quotable."}</h3><p style={{fontSize:13,lineHeight:1.7,color:"#ddd4d7"}}>{channel==="linkedin"?"Hook, rhythm, executive relevance, case mechanism, dan CTA ditulis ulang khusus LinkedIn.":"SEO intent, semantic coverage, direct answers, entity clarity, FAQ, evidence boundaries, dan answer-engine readability diprioritaskan bersama."}</p></div><div style={card}><h3>Master Brief</h3><p style={{fontSize:13,lineHeight:1.6}}><strong>{brief.working_title}</strong><br/>{brief.brand_name}<br/>{brief.target_audience}</p><button style={primary} onClick={()=>router.push(`/brief/${id}`)}>Buka Master Brief</button></div></aside>
  </div>}
 </main>;
}

const card:React.CSSProperties={border:"1px solid #e5dfe2",borderRadius:16,background:"#fff",padding:20,boxShadow:"0 6px 22px rgba(44,27,33,.05)"};
const label:React.CSSProperties={display:"grid",gap:7,marginTop:16,fontSize:12,fontWeight:700,textTransform:"capitalize"};
const textarea:React.CSSProperties={width:"100%",boxSizing:"border-box",border:"1px solid #ddd5d8",borderRadius:10,padding:12,fontFamily:"inherit",fontSize:13,lineHeight:1.6,resize:"vertical"};
const ghost:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:7,border:"1px solid #ded6d9",background:"#fff",borderRadius:9,padding:"9px 12px",cursor:"pointer",fontWeight:700,fontSize:12};
const primary:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:7,border:0,background:"#98142f",color:"#fff",borderRadius:9,padding:"10px 13px",cursor:"pointer",fontWeight:800,fontSize:12};
