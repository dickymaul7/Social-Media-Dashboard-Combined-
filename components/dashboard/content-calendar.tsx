"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { CalendarDays, ExternalLink } from "lucide-react";
import { useActiveBrand } from "@/components/active-brand";
import { loadAllBriefs, saveBrief, type BriefRecord } from "@/lib/smm-workflow";
import { loadExpansionCalendarItems, moveExpansionCalendarItem, type ExpansionCalendarItem } from "@/lib/expansion-calendar";

type CalendarItem = {
  id:string;
  kind:"social"|"linkedin"|"seo_geo";
  brief?:BriefRecord;
  expansion?:ExpansionCalendarItem;
  briefId:string;
  title:string;
  format:string;
  brandName:string;
  scheduledFor:string;
  humanQcStatus?:"pending"|"approved";
  score?:number;
  designStatus?:"ready_to_design"|"designed";
  designFileUrl?:string;
};

const weekdayLabels=["Sen","Sel","Rab","Kam","Jum","Sab","Min"];
const channelLabel=(kind:CalendarItem["kind"])=>kind==="linkedin"?"LINKEDIN":kind==="seo_geo"?"SEO/GEO":"SOCIAL";
function localDateString(date:Date){const local=new Date(date.getTime()-date.getTimezoneOffset()*60000);return local.toISOString().slice(0,10)}
function monthTitle(date:Date){return new Intl.DateTimeFormat("id-ID",{month:"long",year:"numeric"}).format(date)}
function formatShortDate(value:string){return new Intl.DateTimeFormat("id-ID",{day:"numeric",month:"short",year:"numeric"}).format(new Date(`${value}T12:00:00`))}
function socialItem(brief:BriefRecord):CalendarItem|null{if(!brief.scheduled_for)return null;return{id:`social-${brief.id}`,kind:"social",brief,briefId:brief.id,title:brief.working_title||"Untitled content",format:brief.recommended_format||"content",brandName:brief.brand_name||"Brand",scheduledFor:brief.scheduled_for,humanQcStatus:brief.human_qc,score:Math.round(Number(brief.quality?.overall_score||0)),designStatus:brief.production_status==="designed"?"designed":"ready_to_design",designFileUrl:brief.design_url||""}}
function expansionItem(item:ExpansionCalendarItem):CalendarItem{return{id:item.id,kind:item.channel,expansion:item,briefId:item.brief_id,title:item.title,format:item.channel==="linkedin"?"LinkedIn Post":"SEO/GEO Article",brandName:item.brand_name,scheduledFor:item.scheduled_for}}

export function ContentCalendar(){
 const {activeBrand}=useActiveBrand();
 const [month,setMonth]=useState(()=>{const now=new Date();return new Date(now.getFullYear(),now.getMonth(),1)});
 const [items,setItems]=useState<CalendarItem[]>([]);
 const [draggingId,setDraggingId]=useState<string|null>(null);
 const [dragOverDate,setDragOverDate]=useState<string|null>(null);
 const [movingId,setMovingId]=useState<string|null>(null);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [quickMoveDate,setQuickMoveDate]=useState("");
 const [designFileUrl,setDesignFileUrl]=useState("");
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");

 function loadCalendar(){const social=loadAllBriefs().filter(b=>b.brand_id===activeBrand.id&&Boolean(b.scheduled_for)).map(socialItem).filter((x):x is CalendarItem=>Boolean(x));const expansions=loadExpansionCalendarItems().filter(x=>x.brand_id===activeBrand.id).map(expansionItem);const next=[...social,...expansions].sort((a,b)=>a.scheduledFor.localeCompare(b.scheduledFor));setItems(next);if(selectedId&&!next.some(x=>x.id===selectedId))setSelectedId(null)}
 useEffect(()=>{loadCalendar();const onChange=()=>loadCalendar();window.addEventListener("storage",onChange);window.addEventListener("focus",onChange);window.addEventListener("proxsis:calendar-changed",onChange);return()=>{window.removeEventListener("storage",onChange);window.removeEventListener("focus",onChange);window.removeEventListener("proxsis:calendar-changed",onChange)}},[activeBrand.id]); // eslint-disable-line react-hooks/exhaustive-deps
 const calendarCells=useMemo(()=>{const year=month.getFullYear(),mi=month.getMonth(),first=new Date(year,mi,1),days=new Date(year,mi+1,0).getDate(),leading=(first.getDay()+6)%7,total=Math.ceil((leading+days)/7)*7;return Array.from({length:total},(_,i)=>{const day=i-leading+1;if(day<1||day>days)return null;return{dateString:localDateString(new Date(year,mi,day)),dayNumber:day}})},[month]);
 const itemsByDate=useMemo(()=>{const map=new Map<string,CalendarItem[]>();for(const item of items){const arr=map.get(item.scheduledFor)||[];arr.push(item);map.set(item.scheduledFor,arr)}return map},[items]);
 const selectedItem=items.find(x=>x.id===selectedId)||null;
 const prefix=`${month.getFullYear()}-${String(month.getMonth()+1).padStart(2,"0")}`;
 const monthItems=items.filter(x=>x.scheduledFor.startsWith(prefix));
 function chooseItem(item:CalendarItem){setSelectedId(item.id);setQuickMoveDate(item.scheduledFor);setDesignFileUrl(item.designFileUrl||"");setMessage("");setError("")}
 function persistSocial(next:BriefRecord){saveBrief(next);setItems(current=>current.map(item=>item.kind==="social"&&item.briefId===next.id?(socialItem(next)||item):item))}
 async function moveItem(itemId:string,date:string){const current=items.find(x=>x.id===itemId);if(!current||!date||current.scheduledFor===date){setDraggingId(null);setDragOverDate(null);return}setMovingId(itemId);setMessage("");setError("");try{if(current.kind==="social"&&current.brief){persistSocial({...current.brief,scheduled_for:date,updated_at:new Date().toISOString()})}else{moveExpansionCalendarItem(current.id,date);setItems(list=>list.map(x=>x.id===current.id?{...x,scheduledFor:date}:x))}if(selectedId===itemId)setQuickMoveDate(date);setMessage(`Jadwal ${channelLabel(current.kind)} dipindahkan ke ${formatShortDate(date)}.`)}catch{setError("Gagal memindahkan jadwal.")}finally{setMovingId(null);setDraggingId(null);setDragOverDate(null)}}
 function onDragStart(e:DragEvent<HTMLElement>,id:string){setDraggingId(id);e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",id)}
 function onDrop(e:DragEvent<HTMLElement>,date:string){e.preventDefault();const id=e.dataTransfer.getData("text/plain")||draggingId;if(id)void moveItem(id,date)}
 function setDesignStatus(item:CalendarItem,next:"ready_to_design"|"designed"){if(!item.brief)return;persistSocial({...item.brief,production_status:next,updated_at:new Date().toISOString()});setMessage(next==="designed"?"Status diubah menjadi Designed.":"Status diubah menjadi Ready to Design.")}
 function saveDesignFile(item:CalendarItem){if(!item.brief)return;const value=designFileUrl.trim();if(value&&!/^https?:\/\//i.test(value)){setError("Link design harus diawali http:// atau https://");return}persistSocial({...item.brief,design_url:value,updated_at:new Date().toISOString()});setMessage(value?"Link file design tersimpan.":"Link file design dihapus.")}
 function openHref(item:CalendarItem){return item.kind==="social"?`/brief/${item.briefId}`:`/brief/${item.briefId}/expansion/${item.kind}`}
 return <section className="panel advanced-calendar">
  <div className="calendar-toolbar"><div><h2>Content Calendar</h2><p>Social, LinkedIn, dan SEO/GEO content yang dijadwalkan muncul bersama untuk {activeBrand.name}.</p></div><div className="calendar-nav"><button className="ghost" onClick={()=>setMonth(m=>new Date(m.getFullYear(),m.getMonth()-1,1))}>← Bulan lalu</button><button className="ghost" onClick={()=>{const n=new Date();setMonth(new Date(n.getFullYear(),n.getMonth(),1))}}>Hari ini</button><button className="ghost" onClick={()=>setMonth(m=>new Date(m.getFullYear(),m.getMonth()+1,1))}>Bulan berikut →</button></div></div>
  <div className="calendar-legend"><span className="channel-pill social">SOCIAL</span><span className="channel-pill linkedin">LINKEDIN</span><span className="channel-pill seo">SEO/GEO</span></div>
  {(message||error)&&<div className="calendar-alerts">{message&&<div className="calendar-success">{message}</div>}{error&&<div className="calendar-error">{error}</div>}</div>}
  <div className="calendar-workspace"><div className="calendar-main"><div className="calendar-month-head"><div><h3>{monthTitle(month)}</h3><span>{monthItems.length} content terjadwal bulan ini</span></div><span className="data-note">{items.length} scheduled</span></div><div className="calendar-weekdays">{weekdayLabels.map(x=><div key={x}>{x}</div>)}</div><div className="calendar-grid">{calendarCells.map((cell,index)=>{if(!cell)return <div className="calendar-cell blank" key={`blank-${index}`}/>;const dayItems=itemsByDate.get(cell.dateString)||[],today=cell.dateString===localDateString(new Date());return <div key={cell.dateString} className={`calendar-cell ${dragOverDate===cell.dateString?"drag-over":""}`} onDragOver={e=>{e.preventDefault();setDragOverDate(cell.dateString)}} onDragLeave={()=>{if(dragOverDate===cell.dateString)setDragOverDate(null)}} onDrop={e=>onDrop(e,cell.dateString)}><div className="calendar-day-head"><span className={today?"today":""}>{cell.dayNumber}</span>{dayItems.length>0&&<small>{dayItems.length}</small>}</div><div className="calendar-day-items">{dayItems.map(item=><article key={item.id} draggable onDragStart={e=>onDragStart(e,item.id)} onDragEnd={()=>{setDraggingId(null);setDragOverDate(null)}} onClick={()=>chooseItem(item)} className={`calendar-card ${selectedId===item.id?"selected":""} ${draggingId===item.id?"dragging":""}`}><div className="calendar-card-top"><span>{item.brandName}</span>{movingId===item.id&&<small>saving...</small>}</div><span className={`channel-pill ${item.kind==="social"?"social":item.kind==="linkedin"?"linkedin":"seo"}`}>{channelLabel(item.kind)}</span><strong>{item.title}</strong><div className="calendar-pills"><span>{item.format}</span>{item.kind==="social"&&<><span className={item.humanQcStatus==="approved"?"qc-ok":"qc-pending"}>{item.humanQcStatus==="approved"?"QC ✓":"QC ulang"}</span><span className={item.designStatus==="designed"?"designed":"ready"}>{item.designStatus==="designed"?"Designed ✓":"Ready to Design"}</span>{item.designFileUrl&&<span className="file-pill">File ↗</span>}</>}</div></article>)}</div></div>})}</div></div>
   <aside className="calendar-side"><div className="calendar-tip"><p>MULTI-CHANNEL CALENDAR</p><h3>Satu kalender untuk seluruh content workflow.</h3><span>Social, LinkedIn, dan SEO/GEO dapat dijadwalkan dan digeser langsung antar tanggal.</span></div><div className="calendar-detail"><h3>Quick Move</h3>{!selectedItem?<p>Klik kartu untuk melihat detail dan memindahkan tanggal.</p>:<><span className={`channel-pill ${selectedItem.kind==="social"?"social":selectedItem.kind==="linkedin"?"linkedin":"seo"}`}>{channelLabel(selectedItem.kind)}</span><small>{selectedItem.brandName}</small><strong className="selected-title">{selectedItem.title}</strong><p>Saat ini: {formatShortDate(selectedItem.scheduledFor)}{selectedItem.score!==undefined?` · AI Quality ${selectedItem.score}/100`:""}</p><input type="date" value={quickMoveDate} onChange={e=>setQuickMoveDate(e.target.value)}/><button className="primary calendar-full-btn" onClick={()=>void moveItem(selectedItem.id,quickMoveDate)} disabled={!quickMoveDate||movingId===selectedItem.id}>{movingId===selectedItem.id?"Memindahkan...":"Pindahkan Tanggal"}</button>{selectedItem.kind==="social"&&<div className="calendar-design"><div className="design-row"><div><small>DESIGN STATUS</small><b>{selectedItem.designStatus==="designed"?"Designed ✓":"Ready to Design"}</b></div><button className="ghost" onClick={()=>setDesignStatus(selectedItem,selectedItem.designStatus==="designed"?"ready_to_design":"designed")}>{selectedItem.designStatus==="designed"?"Set Ready":"Mark Designed"}</button></div><label>LINK FILE DESIGN</label><input type="url" value={designFileUrl} onChange={e=>setDesignFileUrl(e.target.value)} placeholder="Canva / Drive / Figma / lainnya"/><button className="ghost calendar-full-btn" onClick={()=>saveDesignFile(selectedItem)}>Simpan Link Design</button>{selectedItem.designFileUrl&&<a className="calendar-design-link" href={selectedItem.designFileUrl} target="_blank" rel="noreferrer"><ExternalLink size={14}/> Buka File Design</a>}</div>}<a className="calendar-open-brief" href={openHref(selectedItem)}>{selectedItem.kind==="social"?"Buka Full Brief":"Buka Derivative Content"} →</a></>}</div><div className="calendar-workflow"><div><h3>Channel Labels</h3><span>{items.length} scheduled</span></div><p><b>SOCIAL</b> — master social brief.</p><p><b>LINKEDIN</b> — LinkedIn-native derivative.</p><p><b>SEO/GEO</b> — search & answer-engine content.</p></div></aside>
  </div>
  {!items.length&&<div className="empty-feature calendar-empty"><CalendarDays size={24}/><span>Belum ada content terjadwal untuk brand ini.</span></div>}
 </section>
}
