"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, ListTodo, Plus, UserRound } from "lucide-react";
import { useActiveBrand } from "@/components/active-brand";
import { loadAllBriefs } from "@/lib/smm-workflow";
import { loadTeamMembers,loadTeamTasks,saveTeamTasks,type TeamTask } from "@/lib/team-workflow";

export function TeamTasks(){
  const {activeBrand}=useActiveBrand();
  const [tasks,setTasks]=useState<TeamTask[]>([]);
  const [members,setMembers]=useState(loadTeamMembers());
  const [briefs,setBriefs]=useState(loadAllBriefs());
  const [draft,setDraft]=useState({briefId:"",assignedTo:"owner",priority:"medium" as TeamTask["priority"],dueDate:""});
  function reload(){setTasks(loadTeamTasks());setMembers(loadTeamMembers());setBriefs(loadAllBriefs())}
  useEffect(()=>reload(),[activeBrand.id]);
  const brandBriefs=briefs.filter(b=>b.brand_id===activeBrand.id||b.brand_name===activeBrand.name);
  const brandTasks=tasks.filter(task=>brandBriefs.some(b=>b.id===task.briefId));
  const counts=useMemo(()=>({todo:brandTasks.filter(t=>t.status==="todo").length,in_progress:brandTasks.filter(t=>t.status==="in_progress").length,review:brandTasks.filter(t=>t.status==="review").length,completed:brandTasks.filter(t=>t.status==="completed").length}),[brandTasks]);
  function submit(e:FormEvent){e.preventDefault();if(!draft.briefId||!draft.assignedTo)return;const next=[{id:crypto.randomUUID(),briefId:draft.briefId,assignedTo:draft.assignedTo,status:"todo" as const,priority:draft.priority,dueDate:draft.dueDate,updatedAt:new Date().toISOString()},...tasks];setTasks(next);saveTeamTasks(next);setDraft({...draft,briefId:"",dueDate:""})}
  function updateTask(id:string,patch:Partial<TeamTask>){const next=tasks.map(t=>t.id===id?{...t,...patch,updatedAt:new Date().toISOString()}:t);setTasks(next);saveTeamTasks(next)}
  const memberMap=new Map(members.map(m=>[m.id,m]));const briefMap=new Map(briefs.map(b=>[b.id,b]));
  return <section className="dashboard-module"><div className="feature-head"><div><p className="eyebrow">TEAM COMMAND CENTER</p><h2>Team Tasks</h2><p>Assign Full Brief ke writer/designer/reviewer dan pantau status pekerjaan untuk {activeBrand.name}.</p></div><span className="feature-badge"><UserRound size={14}/> {members.filter(m=>m.status==="active").length} active members</span></div>
    <div className="task-score-grid"><div><ListTodo/><span>To-do</span><strong>{counts.todo}</strong></div><div><Clock3/><span>In Progress</span><strong>{counts.in_progress}</strong></div><div><UserRound/><span>Review</span><strong>{counts.review}</strong></div><div><CheckCircle2/><span>Completed</span><strong>{counts.completed}</strong></div></div>
    <form className="task-form" onSubmit={submit}><label>Full Brief<select value={draft.briefId} onChange={e=>setDraft({...draft,briefId:e.target.value})}><option value="">Select brief</option>{brandBriefs.map(b=><option key={b.id} value={b.id}>{b.working_title}</option>)}</select></label><label>Assignee<select value={draft.assignedTo} onChange={e=>setDraft({...draft,assignedTo:e.target.value})}>{members.filter(m=>m.status==="active").map(m=><option key={m.id} value={m.id}>{m.name} · {m.role}</option>)}</select></label><label>Priority<select value={draft.priority} onChange={e=>setDraft({...draft,priority:e.target.value as TeamTask["priority"]})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><label>Due Date<input type="date" value={draft.dueDate} onChange={e=>setDraft({...draft,dueDate:e.target.value})}/></label><button className="primary"><Plus size={14}/> Assign Task</button></form>
    <div className="task-list">{brandTasks.length?brandTasks.map(task=>{const brief=briefMap.get(task.briefId),member=memberMap.get(task.assignedTo);return <article key={task.id}><div><span className={`priority ${task.priority}`}>{task.priority}</span><h3>{brief?.working_title||"Brief"}</h3><p>{member?.name||"Unassigned"} · due {task.dueDate||"—"}</p></div><div><select value={task.assignedTo} onChange={e=>updateTask(task.id,{assignedTo:e.target.value})}>{members.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select><select value={task.status} onChange={e=>updateTask(task.id,{status:e.target.value as TeamTask["status"]})}><option value="todo">To-do</option><option value="in_progress">In Progress</option><option value="review">Review</option><option value="completed">Completed</option></select>{brief&&<a href={`/brief/${brief.id}`}>Open Brief →</a>}</div></article>}):<div className="empty-feature"><ListTodo size={23}/><span>Belum ada task untuk Full Brief brand ini.</span></div>}</div>
  </section>
}
