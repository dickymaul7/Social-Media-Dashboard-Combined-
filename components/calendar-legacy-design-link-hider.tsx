"use client";

import {useEffect} from "react";

export default function CalendarLegacyDesignLinkHider(){
 useEffect(()=>{
  let disposed=false;
  const hide=()=>{
   if(disposed)return;
   const labels=Array.from(document.querySelectorAll("label")).filter(node=>node.textContent?.trim().toUpperCase()==="LINK FILE DESIGN");
   for(const label of labels){
    const input=label.nextElementSibling as HTMLElement|null;
    const save=input?.nextElementSibling as HTMLElement|null;
    const open=save?.nextElementSibling as HTMLElement|null;
    (label as HTMLElement).style.display="none";
    if(input)input.style.display="none";
    if(save)save.style.display="none";
    if(open&&open.tagName==="A")open.style.display="none";
   }
  };
  const observer=new MutationObserver(hide);observer.observe(document.body,{childList:true,subtree:true});hide();
  return()=>{disposed=true;observer.disconnect()};
 },[]);
 return null;
}
