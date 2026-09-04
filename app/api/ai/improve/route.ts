import { NextResponse } from "next/server";
import { generateBrief, reviewBrief, reviewTotal, type BriefOutput } from "@/lib/ai/brief-engine";
import { loadStorytellingKnowledge } from "@/lib/ai/core";
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
    const brief=body?.brief;
    const bundle=body?.campaignBundle;
    const notes=String(body?.notes??"").trim();
    if(!brief||!bundle?.campaign)return errorJson("Brief dan campaign context wajib tersedia.");
    const idea=bundle.ideas?.find((item:any)=>item.id===brief.idea_id);
    const researchCase=bundle.cases?.find((item:any)=>item.id===idea?.research_case_id);
    if(!idea||!researchCase)return errorJson("Idea atau research case tidak ditemukan.",404);
    const sources=researchCase.mapped_sources??[];
    if(!sources.length)return errorJson("Research source tidak tersedia.",409);
    const sourceList=sources.map((s:any,index:number)=>`S${index+1} | ${s.publisher||"Web source"} | ${s.title||"Untitled"} | ${s.url}\nFACT NOTES: ${s.fact_notes||"—"}`).join("\n\n");
    const knowledge=await loadStorytellingKnowledge();
    const context={brand_profile:bundle.brand_profile,campaign:bundle.campaign,idea,researchCase,sources};
    const currentBrief:BriefOutput={content_objective:brief.content_objective,target_audience:brief.target_audience,funnel_stage:brief.funnel_stage,editorial_thesis:brief.editorial_thesis,case_evidence:brief.case_evidence,why_this_case:brief.why_this_case,tension:brief.tension,core_insight:brief.core_insight,brand_pov:brief.brand_pov,capability_bridge:brief.capability_bridge,story_arc:brief.story_arc,cta:brief.cta,fact_check_notes:brief.fact_check_notes,sections:brief.sections.map((section:any)=>({sequence_no:section.sequence_no,section_type:section.section_type,purpose:section.purpose,headline:section.headline,supporting_copy:section.supporting_copy,evidence_needed:section.evidence_needed,visual_direction:section.visual_direction,transition_to_next:section.transition_to_next}))};
    const oldScore=Number(brief.quality?.overall_score??0);
    const revisionNotes=Array.isArray(brief.quality?.required_revisions)?brief.quality.required_revisions:[];
    const improved=await generateBrief({knowledge,context,sourceList,format:(brief.recommended_format||"carousel") as "carousel"|"reels"|"single_post",revisionNotes,currentBrief,userNotes:notes});
    const review=await reviewBrief({knowledge,context,brief:improved});
    const score=reviewTotal(review);
    if(score<oldScore)return NextResponse.json({ok:true,applied:false,score,message:`Versi lama dipertahankan karena score baru ${Math.round(score)} lebih rendah dari ${Math.round(oldScore)}.`});
    const sections=improved.sections.map((section,index)=>({id:brief.sections?.[index]?.id||crypto.randomUUID(),...section,sequence_no:index+1}));
    return NextResponse.json({ok:true,applied:true,score,brief:{...brief,...improved,sections,quality:{...review,overall_score:score},human_qc:"pending",updated_at:new Date().toISOString()}});
  }catch(error){console.error("Improve brief error",error);return errorJson(error instanceof Error?error.message:"Improve gagal.",500)}
}
