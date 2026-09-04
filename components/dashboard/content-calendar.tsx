"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import { useActiveBrand } from "@/components/active-brand";
import { CalendarItem, loadCalendar, saveCalendarItems } from "@/lib/social-dashboard/workspace-storage";

export function ContentCalendar() {
  const { activeBrand } = useActiveBrand();
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [draft, setDraft] = useState({ date: "", type: "Reel", title: "" });

  useEffect(() => setItems(loadCalendar(activeBrand.id)), [activeBrand.id]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.date || !draft.title.trim()) return;
    const next = [...items, { id: `calendar-${Date.now()}`, ...draft, title: draft.title.trim() }].sort((a,b)=>a.date.localeCompare(b.date));
    setItems(next); saveCalendarItems(activeBrand.id, next); setDraft({ date: "", type: "Reel", title: "" });
  };

  return <section className="panel"><div className="panel-head"><div><h2>Content Calendar</h2><p>Planning queue for {activeBrand.name}. Data is isolated per active brand.</p></div><span className="data-note">{items.length} planned</span></div>
    <form className="calendar-form" onSubmit={submit}><label>Date<input type="date" value={draft.date} onChange={e=>setDraft({...draft,date:e.target.value})}/></label><label>Format<select value={draft.type} onChange={e=>setDraft({...draft,type:e.target.value})}><option>Reel</option><option>Carousel</option><option>Image</option><option>Story</option></select></label><label className="wide-field">Topic / working title<input value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})} placeholder="e.g. Diagnostic framework untuk CEO"/></label><button className="primary" type="submit"><Plus size={16}/> Add content</button></form>
    <div className="calendar-list">{items.length ? items.map(item=><div key={item.id}><span className="calendar-date">{new Date(`${item.date}T00:00:00`).toLocaleDateString("id-ID",{weekday:"short",day:"numeric",month:"short"})}</span><span className={`type-pill ${item.type.toLowerCase()}`}>{item.type}</span><strong>{item.title}</strong></div>) : <div className="empty-feature"><CalendarDays size={24}/><span>Belum ada konten terjadwal untuk brand ini.</span></div>}</div>
  </section>;
}
