import { NextResponse } from "next/server";
import { loadStorytellingKnowledge } from "@/lib/ai/core";
import { generateBrief, reviewBrief, reviewTotal } from "@/lib/ai/brief-engine";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration=300;
export const dynamic="force-dynamic";

function errorJson(message:string,status=400){return NextResponse.json({ok:false,error:message},{status})}
function sameOrigin(request:Request){const origin=request.headers.get("origin");const host=request.headers.get("x-forwarded-host")||request.headers.get("host");if(!origin||!host)return true;try{return new URL(origin).host===host}catch{return false}}
async function requireSessionIfConfigured(){if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return true;const supabase=await createServerSupabaseClient();const{data:{user}}=await supabase.auth.getUser();return Boolean(user)}

export async function POST(request:Request){
  try{
    if(!sameOrigin(request))return errorJson("Cross-origin request ditolak.",403);
    if(!(await requireSessionIfConfigured()))return errorJson("Session login tidak valid.",401);
    const body=await request.json().catch(()=>({}));
    const bundle=body?.bundle;
    const ideaId=String(body?.ideaId??"").trim();
    if(!bundle?.campaign||!Array.isArray(bundle?.ideas)||!ideaId)return errorJson("Campaign bundle dan ideaId wajib tersedia.");
    const idea=bundle.ideas.find((item:any)=>item.id===ideaId);
    if(!idea)return errorJson("Story Angle tidak ditemukan.",404);
    const researchCase=bundle.cases?.find((item:any)=>item.id===idea.research_case_id);
    if(!researchCase)return errorJson("Research case tidak ditemukan.",404);
    const sources=Array.isArray(researchCase.mapped_sources)?researchCase.mapped_sources:[];
    if(!sources.length)return errorJson("Research case belum memiliki source terverifikasi.",409);
    const sourceList=sources.map((s:any,index:number)=>`S${index+1} | ${s.publisher||"Web source"} | ${s.title||"Untitled"} | ${s.url}\nFACT NOTES: ${s.fact_notes||"—"}`).join("\n\n");
    const knowledge=await loadStorytellingKnowledge();
    const context={brand_profile:bundle.brand_profile,campaign:bundle.campaign,idea,researchCase,sources};
    const format=(idea.recommended_format||"carousel") as "carousel"|"reels"|"single_post";
    let finalBrief=await generateBrief({knowledge,context,sourceList,format});
    const firstReview=await reviewBrief({knowledge,context,brief:finalBrief});
    const firstScore=reviewTotal(firstReview);
    let finalReview=firstReview;let finalScore=firstScore;let revised=false;
    if(firstScore<90&&firstReview.required_revisions.length){revised=true;finalBrief=await generateBrief({knowledge,context,sourceList,format,revisionNotes:firstReview.required_revisions,currentBrief:finalBrief});finalReview=await reviewBrief({knowledge,context,brief:finalBrief});finalScore=reviewTotal(finalReview)}
    const briefId=crypto.randomUUID();
    const sections=finalBrief.sections.map((section,index)=>({...section,id:crypto.randomUUID(),sequence_no:index+1}));
    return NextResponse.json({ok:true,brief:{id:briefId,campaign_id:bundle.campaign.id,idea_id:idea.id,brand_id:bundle.campaign.brand_id??null,brand_name:bundle.campaign.brand_name,working_title:idea.working_title,recommended_format:format,...finalBrief,sections,quality:{...finalReview,overall_score:finalScore},human_qc:"pending",production_status:"draft",updated_at:new Date().toISOString()},score:finalScore,revised,passed:finalScore>=85});
  }catch(error){console.error("Full brief error",error);return errorJson(error instanceof Error?error.message:"Gagal membuat storytelling brief.",500)}
}
