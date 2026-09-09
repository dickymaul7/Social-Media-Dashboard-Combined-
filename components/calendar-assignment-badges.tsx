"use client";

import {useEffect} from "react";
import {readSession} from "@/lib/access-control";
import {loadAllBriefs} from "@/lib/smm-workflow";
import {loadExpansionCalendarItems} from "@/lib/expansion-calendar";
import {hydrateSharedTasks,loadTasks,type WorkspaceTask} from "@/lib/workspace-store";

type TeamMember={id:string;display_name:string;email:string};
const statusLabel:Record<WorkspaceTask["status"],string>={todo:"To-do",in_progress:"In Progress",review:"Review",done:"Completed"};
function authHeaders():Record<string,string>{const token=String(readSession()?.access_token||"");return token?{Authorization:`Bearer ${token}`}:{} }

export default function CalendarAssignmentBadges(){
 useEffect(()=>{let disposed=false;let timer=0;let observer:MutationObserver|null=null;
  async function decorateAll(){
   try{
    await hydrateSharedTasks();
    const response=await fetch("/api/team-members",{headers:authHeaders(),cache:"no-store"});const payload=await response.json().catch(()=>({}));const members=(response.ok&&payload?.ok?(payload.members||[]):[]) as TeamMember[];
    if(disposed)return;
    const nameByEmail=new Map(members.map(member=>[String(member.email||"").trim().toLowerCase(),member.display_name]));
    const socialTitle=new Map(loadAllBriefs().map(brief=>[brief.id,brief.working_title||"Untitled content"]));
    const expansionTitle=new Map(loadExpansionCalendarItems().map(item=>[`${item.brief_id}:${item.channel}`,item.title]));
    const assignments=new Map<string,WorkspaceTask[]>();
    for(const task of loadTasks()){
      if(!task.brief_id)continue;
      const channel=task.channel||"social";
      const title=channel==="social"?socialTitle.get(task.brief_id):expansionTitle.get(`${task.brief_id}:${channel}`);
      if(!title)continue;
      const key=`${channel}:${title.trim()}`;const list=assignments.get(key)||[];list.push(task);assignments.set(key,list);
    }
    const decorate=()=>{document.querySelectorAll<HTMLElement>(".calendar-card").forEach(card=>{
      card.querySelectorAll("[data-combined-assignment-badge]").forEach(node=>node.remove());
      const channelText=card.querySelector<HTMLElement>(".channel-pill")?.textContent?.trim().toUpperCase()||"";
      const channel=channelText==="LINKEDIN"?"linkedin":channelText==="SEO/GEO"?"seo_geo":"social";
      const title=Array.from(card.querySelectorAll("strong")).map(node=>node.textContent?.trim()).find(Boolean)||"";if(!title)return;
      const rows=assignments.get(`${channel}:${title}`)||[];if(!rows.length)return;
      const badge=document.createElement("div");badge.setAttribute("data-combined-assignment-badge","true");badge.style.cssText="margin-top:6px;border:1px solid #ead4d9;background:#fbf3f5;border-radius:8px;padding:6px 7px;font-size:9px;line-height:1.35;color:#6c303d";
      const html=rows.map(task=>{const email=String(task.assignee||"").trim().toLowerCase();const name=nameByEmail.get(email)||task.assignee||"Unassigned";return `<div><b>👤 ${name}</b><span style=\"color:#8a8185\"> · ${statusLabel[task.status]}</span></div>`}).join("");badge.innerHTML=html;card.appendChild(badge);
    })};
    decorate();timer=window.setTimeout(decorate,150);window.setTimeout(decorate,500);
    const workspace=document.querySelector(".advanced-calendar");if(workspace){observer?.disconnect();observer=new MutationObserver(()=>{window.clearTimeout(timer);timer=window.setTimeout(decorate,80)});observer.observe(workspace,{childList:true,subtree:true})}
   }catch{}
  }
  void decorateAll();const refresh=()=>void decorateAll();window.addEventListener("proxsis:calendar-changed",refresh);window.addEventListener("focus",refresh);return()=>{disposed=true;window.clearTimeout(timer);observer?.disconnect();window.removeEventListener("proxsis:calendar-changed",refresh);window.removeEventListener("focus",refresh)}
 },[]);return null;
}
