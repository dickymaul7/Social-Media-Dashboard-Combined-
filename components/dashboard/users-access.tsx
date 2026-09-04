"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound, Plus, ShieldCheck, Users } from "lucide-react";
import { DEFAULT_ROLE_PERMISSIONS, PERMISSION_KEYS, ROLE_KEYS, ROLE_LABELS, type RoleKey } from "@/lib/access-control";
import { loadTeamMembers,saveTeamMembers,type TeamMember } from "@/lib/team-workflow";
import { BRAND_OPTIONS } from "@/components/active-brand";

export function UsersAccess(){
  const [members,setMembers]=useState<TeamMember[]>([]);
  const [selectedId,setSelectedId]=useState("");
  const [draft,setDraft]=useState({name:"",email:"",role:"content_writer" as RoleKey});
  useEffect(()=>{const rows=loadTeamMembers();setMembers(rows);setSelectedId(rows[0]?.id||"")},[]);
  const selected=useMemo(()=>members.find(m=>m.id===selectedId)||null,[members,selectedId]);
  function persist(rows:TeamMember[]){setMembers(rows);saveTeamMembers(rows)}
  function add(e:FormEvent){e.preventDefault();if(!draft.name.trim())return;const next:TeamMember={id:crypto.randomUUID(),name:draft.name.trim(),email:draft.email.trim(),role:draft.role,brandIds:[],status:"active"};persist([...members,next]);setSelectedId(next.id);setDraft({name:"",email:"",role:"content_writer"})}
  function update(patch:Partial<TeamMember>){if(!selected)return;persist(members.map(m=>m.id===selected.id?{...m,...patch}:m))}
  function toggleBrand(id:string){if(!selected||selected.role==="super_admin")return;const brandIds=selected.brandIds.includes(id)?selected.brandIds.filter(x=>x!==id):[...selected.brandIds,id];update({brandIds})}
  const rolePerms=selected?DEFAULT_ROLE_PERMISSIONS[selected.role]:[];
  return <section className="dashboard-module"><div className="feature-head"><div><p className="eyebrow">SETTINGS</p><h2>Users & Access</h2><p>Role dan Brand Access mengikuti foundation SMM Simplified. Enforcement tetap off sampai Supabase membership + RLS diaktifkan.</p></div><span className="feature-badge"><ShieldCheck size={14}/> Foundation mode</span></div>
    <div className="access-summary"><div><Users/><span>Total Users</span><strong>{members.length}</strong></div><div><ShieldCheck/><span>Super Admin</span><strong>{members.filter(m=>m.role==="super_admin").length}</strong></div><div><KeyRound/><span>Permission Keys</span><strong>{PERMISSION_KEYS.length}</strong></div></div>
    <form className="access-add" onSubmit={add}><label>Name<input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Team member"/></label><label>Email<input type="email" value={draft.email} onChange={e=>setDraft({...draft,email:e.target.value})} placeholder="name@company.com"/></label><label>Role<select value={draft.role} onChange={e=>setDraft({...draft,role:e.target.value as RoleKey})}>{ROLE_KEYS.filter(r=>r!=="super_admin").map(role=><option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label><button className="primary"><Plus size={14}/> Add User</button></form>
    <div className="access-grid"><aside>{members.map(member=><button key={member.id} className={selectedId===member.id?"active":""} onClick={()=>setSelectedId(member.id)}><span>{member.name.slice(0,2).toUpperCase()}</span><div><strong>{member.name}</strong><small>{ROLE_LABELS[member.role]} · {member.status}</small></div></button>)}</aside>{selected?<div className="access-editor"><div className="access-editor-head"><div><h3>{selected.name}</h3><p>{selected.email||"Email belum diisi"}</p></div><select value={selected.status} onChange={e=>update({status:e.target.value as TeamMember["status"]})}><option value="active">Active</option><option value="inactive">Inactive</option></select></div><label>Role<select value={selected.role} onChange={e=>update({role:e.target.value as RoleKey,brandIds:e.target.value==="super_admin"?[]:selected.brandIds})}>{ROLE_KEYS.map(role=><option key={role} value={role}>{ROLE_LABELS[role]}</option>)}</select></label><div className="brand-access"><strong>Brand Access</strong><p>{selected.role==="super_admin"?"Super Admin memiliki akses semua brand.":"Pilih brand yang dapat diakses user."}</p>{BRAND_OPTIONS.map(brand=><label key={brand.id}><input type="checkbox" disabled={selected.role==="super_admin"} checked={selected.role==="super_admin"||selected.brandIds.includes(brand.id)} onChange={()=>toggleBrand(brand.id)}/><span>{brand.name}</span></label>)}</div><div className="permission-grid"><strong>Role Permissions</strong><p>Permission override per-user akan dipindahkan saat Supabase access-control aktif.</p><div>{PERMISSION_KEYS.map(key=><span className={rolePerms.includes(key)?"enabled":""} key={key}>{rolePerms.includes(key)?"✓":"—"} {key}</span>)}</div></div></div>:<div className="empty-feature">Select user</div>}</div>
  </section>
}
