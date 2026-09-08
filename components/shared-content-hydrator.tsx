"use client";

import {useEffect} from "react";
import {usePathname} from "next/navigation";
import {hydrateBriefFromSupabase,hydrateCampaignFromSupabase,loadBrief,loadCampaign} from "@/lib/smm-workflow";

const ONCE_PREFIX="proxsis-shared-hydrate:";

export default function SharedContentHydrator(){
 const pathname=usePathname();
 useEffect(()=>{
  let active=true;
  async function hydrate(){
   const briefMatch=pathname.match(/^\/brief\/([^/]+)/);
   if(briefMatch){
    const id=decodeURIComponent(briefMatch[1]);
    if(loadBrief(id))return;
    const marker=`${ONCE_PREFIX}brief:${id}`;
    if(sessionStorage.getItem(marker)==="done")return;
    sessionStorage.setItem(marker,"pending");
    try{
     const brief=await hydrateBriefFromSupabase(id);
     if(!active)return;
     if(brief){
      if(brief.campaign_id&&!loadCampaign(brief.campaign_id))await hydrateCampaignFromSupabase(brief.campaign_id);
      sessionStorage.setItem(marker,"done");
      window.location.reload();
     }else sessionStorage.setItem(marker,"done");
    }catch{
     sessionStorage.removeItem(marker);
    }
    return;
   }
   const campaignMatch=pathname.match(/^\/campaign\/([^/]+)/);
   if(campaignMatch){
    const id=decodeURIComponent(campaignMatch[1]);
    if(loadCampaign(id))return;
    const marker=`${ONCE_PREFIX}campaign:${id}`;
    if(sessionStorage.getItem(marker)==="done")return;
    sessionStorage.setItem(marker,"pending");
    try{
     const campaign=await hydrateCampaignFromSupabase(id);
     if(!active)return;
     if(campaign){sessionStorage.setItem(marker,"done");window.location.reload()}else sessionStorage.setItem(marker,"done");
    }catch{
     sessionStorage.removeItem(marker);
    }
   }
  }
  void hydrate();
  return()=>{active=false};
 },[pathname]);
 return null;
}
