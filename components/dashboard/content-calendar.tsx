"use client";

import { FormEvent, useEffect, useMemo, useState, type DragEvent } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, ExternalLink, MoveRight, Plus } from "lucide-react";
import { useActiveBrand } from "@/components/active-brand";
import { CalendarItem, loadCalendar, saveCalendarItems } from "@/lib/social-dashboard/workspace-storage";
import { loadAllBriefs, saveBrief, type BriefRecord } from "@/lib/smm-workflow";

const weekdays=["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
function localDateString(date:Date){const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);return local.toISOString().slice(0,10)}
function monthTitle(date:Date){return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(date)}
function shortDate(value:string){return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${value}T12:00:00`))}

export function ContentCalendar() {
  const { activeBrand } = useActiveBrand();
  const [items,setItems]=useState<CalendarItem[]>([]);
  const [briefs,setBriefs]=useState<BriefRecord[]>([]);
  const [draft,setDraft]=useState({date:"",type:"Reel",title:""});
  const [month,setMonth]=useState(()=>{const now=new Date();return new Date(now.getFullYear(),now.getMonth(),1)});
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [quickMoveDate,setQuickMoveDate]=useState("");
  const [message,setMessage]=useState("");

  function reload(){setItems(loadCalendar(activeBrand.id));setBriefs(loadAllBriefs().filter(brief=>brief.brand_id===activeBrand.id||brief.brand_name===activeBrand.name))}
  useEffect(()=>reload(),[activeBrand.id,activeBrand.name]);

  const submit=(event:FormEvent)=>{event.preventDefault();if(!draft.date||!draft.title.trim())return;const next=[...items,{id:`calendar-${Date.now()}`,...draft,title:draft.title.trim()}].sort((a,b)=>a.date.localeCompare(b.date));setItems(next);saveCalendarItems(activeBrand.id,next);setDraft({date:"",type:"Reel",title:""})};

  const scheduled=briefs.filter(brief=>Boolean(brief.scheduled_for));
  const cells=useMemo(()=>{const year=month.getFullYear(),mi=month.getMonth(),first=new Date(year,mi,1),days=new Date(year,mi+1,0).getDate(),leading=(first.getDay()+6)%7,total=Math.ceil((leading+days)/7)*7;return Array.from({length:total},(_,index)=>{const day=index-leading+1;if(day<1||day>days)return null;const date=new Date(year,mi,day);return{day,dateString:localDateString(date)}})},[month]);
  const briefsByDate=useMemo(()=>{const map=new Map<string,BriefRecord[]>();for(const brief of scheduled){const date=brief.scheduled_for!;map.set(date,[...(map.get(date)??[]),brief])}return map},[scheduled]);
  const selected=briefs.find(brief=>brief.id===selectedId)??null;

  function updateBrief(next:BriefRecord,msg?:string){saveBrief(next);setBriefs(current=>current.map(b=>b.id===next.id?next:b));if(msg)setMessage(msg)}
  function moveBrief(briefId:string,date:string){const brief=briefs.find(b=>b.id===briefId);if(!brief)return;updateBrief({...brief,scheduled_for:date,updated_at:new Date().toISOString()},`Jadwal dipindahkan ke ${shortDate(date)}.`);if(selectedId===briefId)setQuickMoveDate(date)}
  function onDragStart(event:DragEvent<HTMLElement>,briefId:string){event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",briefId)}
  function onDrop(event:DragEvent<HTMLElement>,date:string){event.preventDefault();const briefId=event.dataTransfer.getData("text/plain");if(briefId)moveBrief(briefId,date)}
  function selectBrief(brief:BriefRecord){setSelectedId(brief.id);setQuickMoveDate(brief.scheduled_for||"");setMessage("")}
  function setStatus(status:"draft"|"ready_to_design"|"designed"){if(selected)updateBrief({...selected,production_status:status,updated_at:new Date().toISOString()},`Production status: ${status.replaceAll("_"," ")}.`)}
  function setDesignUrl(url:string){if(selected)updateBrief({...selected,design_url:url,updated_at:new Date().toISOString()})}

  return <section className="panel production-calendar-module">
    <div className="panel-head"><div><h2>Content Calendar</h2><p>Planning queue + production calendar untuk {activeBrand.name}.</p></div><span className="data-note">{scheduled.length} scheduled · {items.length} planned</span></div>
    <div className="calendar-split">
      <div>
        <div className="calendar-month-head"><button onClick={()=>setMonth(current=>new Date(current.getFullYear(),current.getMonth()-1,1))}><ChevronLeft size={15}/></button><div><strong>{monthTitle(month)}</strong><span>Scheduled Full Briefs</span></div><button onClick={()=>setMonth(current=>new Date(current.getFullYear(),current.getMonth()+1,1))}><ChevronRight size={15}/></button><button className="today-btn" onClick={()=>{const now=new Date();setMonth(new Date(now.getFullYear(),now.getMonth(),1))}}>Today</button></div>
        <div className="calendar-weekdays">{weekdays.map(day=><span key={day}>{day}</span>)}</div>
        <div className="month-grid">{cells.map((cell,index)=>cell?<div className="calendar-day" key={cell.dateString} onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(e,cell.dateString)}><span>{cell.day}</span><div>{(briefsByDate.get(cell.dateString)??[]).map(brief=><button draggable onDragStart={e=>onDragStart(e,brief.id)} onClick={()=>selectBrief(brief)} className={`production-card-mini ${brief.production_status||"draft"}`} key={brief.id}><b>{brief.working_title}</b><small>{brief.recommended_format} · {Math.round(brief.quality?.overall_score??0)}/100</small></button>)}</div></div>:<div className="calendar-day empty" key={`empty-${index}`}/>)}</div>
      </div>
      <aside className="calendar-side">{selected?<><p className="eyebrow">SELECTED BRIEF</p><h3>{selected.working_title}</h3><p>{selected.scheduled_for?shortDate(selected.scheduled_for):"Belum dijadwalkan"}</p><a href={`/brief/${selected.id}`}>Open Full Brief <ExternalLink size={12}/></a><label>Quick Move<input type="date" value={quickMoveDate} onChange={e=>setQuickMoveDate(e.target.value)}/></label><button className="ghost quick-move" disabled={!quickMoveDate} onClick={()=>moveBrief(selected.id,quickMoveDate)}><MoveRight size={14}/> Move</button><label>Design Status<select value={selected.production_status||"draft"} onChange={e=>setStatus(e.target.value as "draft"|"ready_to_design"|"designed")}><option value="draft">Draft</option><option value="ready_to_design">Ready to Design</option><option value="designed">Designed</option></select></label><label>Design File URL<div className="design-link-input"><input value={selected.design_url||""} onChange={e=>setDesignUrl(e.target.value)} placeholder="https://canva.com/..."/>{selected.design_url&&<a href={selected.design_url} target="_blank" rel="noreferrer"><ExternalLink size={13}/></a>}</div></label>{message&&<div className="calendar-message">{message}</div>}</>:<div className="calendar-empty-side"><CalendarDays size={26}/><strong>Pilih scheduled brief</strong><p>Klik card di kalender untuk Quick Move, design status, dan design-file link.</p></div>}</aside>
    </div>
    <div className="planner-divider"><span>Manual Planning Queue</span></div>
    <form className="calendar-form" onSubmit={submit}><label>Date<input type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label><label>Format<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}><option>Reel</option><option>Carousel</option><option>Image</option><option>Story</option></select></label><label className="wide-field">Topic / working title<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="e.g. Diagnostic framework untuk CEO"/></label><button className="primary" type="submit"><Plus size={16}/> Add content</button></form>
    <div className="calendar-list">{items.length?items.map(item=><div key={item.id}><span className="calendar-date">{new Date(`${item.date}T00:00:00`).toLocaleDateString("id-ID",{weekday:"short",day:"numeric",month:"short"})}</span><span className={`type-pill ${item.type.toLowerCase()}`}>{item.type}</span><strong>{item.title}</strong></div>):<div className="empty-feature"><CalendarDays size={24}/><span>Belum ada manual planning item untuk brand ini.</span></div>}</div>
  </section>;
}
