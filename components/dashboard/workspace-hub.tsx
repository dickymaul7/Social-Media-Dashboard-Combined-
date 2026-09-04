"use client";

import { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, Plus, X } from "lucide-react";
import { useActiveBrand } from "@/components/active-brand";
import { loadWorkspaceLinks, saveWorkspaceLinks, WorkspaceLink } from "@/lib/social-dashboard/workspace-storage";

export function WorkspaceHub() {
  const { activeBrand } = useActiveBrand();
  const [links, setLinks] = useState<WorkspaceLink[]>([]);
  const [draft, setDraft] = useState({ label: "", url: "", category: "Planning" });

  useEffect(() => setLinks(loadWorkspaceLinks(activeBrand.id)), [activeBrand.id]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.label.trim() || !draft.url.trim()) return;
    const next = [...links, { id: `link-${Date.now()}`, label: draft.label.trim(), url: draft.url.trim(), category: draft.category.trim() || "Planning" }];
    setLinks(next); saveWorkspaceLinks(activeBrand.id, next); setDraft({ label: "", url: "", category: "Planning" });
  };

  const remove = (id: string) => {
    const next = links.filter(link => link.id !== id);
    setLinks(next); saveWorkspaceLinks(activeBrand.id, next);
  };

  return <section className="panel"><div className="panel-head"><div><h2>Workspace Hub</h2><p>Shared working links for {activeBrand.name}. Current storage is brand-scoped migration fallback.</p></div><span className="data-note">{links.length} links</span></div>
    <form className="workspace-form" onSubmit={submit}><label>Label<input value={draft.label} onChange={e=>setDraft({...draft,label:e.target.value})} placeholder="e.g. Monthly report"/></label><label>URL<input value={draft.url} onChange={e=>setDraft({...draft,url:e.target.value})} placeholder="https://..."/></label><label>Category<input value={draft.category} onChange={e=>setDraft({...draft,category:e.target.value})} placeholder="Planning, Analytics, Assets"/></label><button className="primary" type="submit"><Plus size={16}/> Add link</button></form>
    <div className="workspace-grid">{links.map(link=><article key={link.id}><div className="workspace-link-head"><span>{link.category}</span><button onClick={()=>remove(link.id)} aria-label={`Remove ${link.label}`}><X size={14}/></button></div><h3>{link.label}</h3><a href={link.url} target="_blank" rel="noreferrer">Open workspace <ArrowUpRight size={14}/></a></article>)}</div>
  </section>;
}
