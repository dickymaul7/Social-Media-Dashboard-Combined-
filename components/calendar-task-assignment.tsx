"use client";

import {useEffect,useMemo,useState} from "react";
import {createPortal} from "react-dom";
import {readSession} from "@/lib/access-control";
import {loadAllBriefs} from "@/lib/smm-workflow";
import {loadExpansionCalendarItems} from "@/lib/expansion-calendar";
import {hydrateSharedTasks,loadTasks,upsertTask,type WorkspaceTask} from "@/lib/workspace-store";

type SelectedContent={briefId:string;brandId:string;channel:"social"|"linkedin"|"seo_geo";title:string;scheduledFor?:string};
type TeamMember={id:string;user_id:string;display_name:string;role:string;email:string;active:boolean};

function detectSelected(card:HTMLElement):SelectedContent|null{
 const channelLabel=card.querySelector<HTMLElement>(".channel-pill")?.textContent?.trim().toUpperCase();
 const title=Array.from(card.querySelectorAll("strong")).map(x=>x.textContent?.trim()).find(Boolean)||"";
 if(!title)return null;
 if(channelLabel==="SOCIAL"){
  const brief=loadAllBriefs().find(item=>item.working_title.trim()===title.trim());
  return brief?{briefId:brief.id,brandId:brief.brand_id||"",channel:"social",title:brief.working_title,scheduledFor:brief.scheduled_for}:null;
 }
 const channel=channelLabel==="LINKEDIN"?"linkedin":channelLabel==="SEO/GEO"?"seo_geo":null;
 if(!channel)return null;
 const expansion=loadExpansionCalendarItems().find(item=>item.channel===channel&&item.title.trim()===title.trim());
 return expansion?{briefId:expansion.brief_id,brandId:expansion.brand_id||"",channel,title:expansion.title,scheduledFor:expansion.scheduled_for}:null;
}

function authHeaders():Record<string,string>{const token=String(readSession()?.access_token||"");return token?{Authorization:`Bearer ${token}`}:{} }

export default function CalendarTaskAssignment(){
 const[target,setTarget]=useState<HTMLElement|null>(null);const[selected,setSelected]=useState<SelectedContent|null>(null);const[members,setMembers]=useState<TeamMember[]>([]);const[assignee,setAssignee]=useState("");const[dueDate,setDueDate]=useState("");const[priority,setPriority]=useState<WorkspaceTask["priority"]>("medium");const[message,setMessage]=useState("");const[error,setError]=useState("");const[loadingMembers,setLoadingMembers]=useState(false);
 useEffect(()=>{let disposed=false;let frame=0;const find=()=>{if(disposed)return;const node=document.querySelector<HTMLElement>(".calendar-detail");if(node){setTarget(node);return}frame=requestAnimationFrame(find)};find();return()=>{disposed=true;cancelAnimationFrame(frame)}},[]);
 useEffect(()=>{let active=true;async function loadMembers(){setLoadingMembers(true);setError("");try{const response=await fetch("/api/team-members",{headers:authHeaders(),cache:"no-store"});const payload=await response.json().catch(()=>({}));if(!response.ok||!payload?.ok)throw new Error(payload?.error||"Gagal memuat member tim.");if(active)setMembers((payload.members||[]) as TeamMember[])}catch(err){if(active)setError(err instanceof Error?err.message:"Gagal memuat member tim.")}finally{if(active)setLoadingMembers(false)}}void loadMembers();const refresh=()=>void loadMembers();window.addEventListener("proxsis-workspace:updated",refresh as EventListener);window.addEventListener("focus",refresh);return()=>{active=false;window.removeEventListener("proxsis-workspace:updated",refresh as EventListener);window.removeEventListener("focus",refresh)}},[]);
 useEffect(()=>{const click=(event:MouseEvent)=>{const card=(event.target as HTMLElement|null)?.closest<HTMLElement>(".calendar-card");if(!card)return;const content=detectSelected(card);setSelected(content);setMessage("");setError("");if(!content){setAssignee("");setDueDate("");return}const existing=loadTasks().find(task=>task.brief_id===content.briefId&&(task.channel===content.channel||(!task.channel&&content.channel==="social")));setAssignee(existing?.assignee||"");setDueDate(existing?.due_date||content.scheduledFor||"");setPriority(existing?.priority||"medium")};document.addEventListener("click",click);return()=>document.removeEventListener("click",click)},[]);
 const existing=useMemo(()=>selected?loadTasks().find(task=>task.brief_id===selected.briefId&&(task.channel===selected.channel||(!task.channel&&selected.channel==="social")))||null:null,[selected,message]);
 async function assign(){if(!selected||!assignee)return;const now=new Date().toISOString();const task:WorkspaceTask={id:existing?.id||crypto.randomUUID(),brand_id:selected.brandId,title:existing?.title||`${selected.channel==="social"?"Social":selected.channel==="linkedin"?"LinkedIn":"SEO/GEO"}: ${selected.title}`,description:existing?.description||"Production task assigned from Content Calendar.",brief_id:selected.briefId,channel:selected.channel,assignee,due_date:dueDate||undefined,status:existing?.status||"todo",priority,created_at:existing?.created_at||now,updated_at:now};upsertTask(task);await hydrateSharedTasks();const member=members.find(item=>item.email===assignee);setMessage(`Task berhasil di-assign ke ${member?.display_name||assignee} dan akan muncul di My Tasks akun tersebut.`);window.dispatchEvent(new Event("proxsis:calendar-changed"))}
 if(!target)return null;
 return createPortal(<div style={{borderTop:"1px solid #e7dfe2",marginTop:18,paddingTop:18}}><div style={{fontSize:11,fontWeight:800,letterSpacing:".08em",color:"#8b777e"}}>TASK ASSIGNMENT</div>{!selected?<p style={{fontSize:12,color:"#756b70",lineHeight:1.5}}>Klik kartu content untuk assign ke member tim.</p>:<div style={{display:"grid",gap:10,marginTop:10}}><div style={{fontSize:12,fontWeight:800,lineHeight:1.45}}>{selected.title}</div><label style={label}>ASSIGNEE<select value={assignee} onChange={e=>setAssignee(e.target.value)} style={input} disabled={loadingMembers}><option value="">{loadingMembers?"Memuat member tim...":"Pilih member tim"}</option>{members.map(member=><option key={member.id} value={member.email}>{member.display_name} · {member.role.replaceAll("_"," ")}</option>)}</select></label><div style={{fontSize:10,color:"#756b70"}}>{members.length} active member dari shared SMM team_members</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><label style={label}>DUE DATE<input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} style={input}/></label><label style={label}>PRIORITY<select value={priority} onChange={e=>setPriority(e.target.value as WorkspaceTask["priority"])} style={input}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div><button onClick={()=>void assign()} disabled={!assignee||loadingMembers} style={{border:0,borderRadius:10,padding:"11px 14px",background:"#98142f",color:"white",fontWeight:800,cursor:assignee&&!loadingMembers?"pointer":"not-allowed",opacity:assignee&&!loadingMembers?1:.5}}>{existing?"Update Assignment":"Assign Task"}</button>{message&&<div style={{background:"#eef8f1",color:"#267347",borderRadius:9,padding:10,fontSize:11,lineHeight:1.5}}>{message}</div>}{error&&<div style={{background:"#fff0f1",color:"#a3152d",borderRadius:9,padding:10,fontSize:11,lineHeight:1.5}}>{error}</div>}<a href="/tasks" style={{fontSize:11,color:"#6d303e",fontWeight:700,textDecoration:"none",textAlign:"center"}}>Open Team / My Tasks →</a></div>}</div>,target)
}
const label:React.CSSProperties={display:"grid",gap:6,fontSize:10,fontWeight:800,letterSpacing:".04em",color:"#7a666d"};const input:React.CSSProperties={width:"100%",boxSizing:"border-box",border:"1px solid #d9cdd2",borderRadius:9,padding:"9px 10px",fontSize:11,background:"white"};
