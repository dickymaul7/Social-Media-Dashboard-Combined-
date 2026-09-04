import { NextResponse } from "next/server";
import { average, clampScore, compactJson, createStructuredJson, loadStorytellingKnowledge } from "@/lib/ai/core";
import { angleSynthesisSchema, queryPlanSchema } from "@/lib/ai/schemas";
import { normalizeSources, tavilySearch } from "@/lib/ai/tavily";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { BrandIntelligence } from "@/lib/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

type QuickBrief = {
  brandId?: string;
  brandName: string;
  website?: string;
  topic: string;
  audience: string;
  objective: string;
  cta?: string;
  preferredFormat?: "auto" | "carousel" | "reels" | "single_post";
  extraContext?: string;
  brandIntelligence?: BrandIntelligence | null;
};

type QueryPlan = { queries: string[] };
type Synthesis = {
  brand_profile:{positioning:string;value_proposition:string;audience_pain_points:string[];tone_of_voice:string;key_messages:string[];brand_pov:string;core_expertise:string[];communication_dos:string[];communication_donts:string[]};
  campaign:{desired_perception:string;business_problem:string;key_message:string;funnel_stage:"awareness"|"consideration"|"conversion"};
  cases:Array<{key:string;company_name:string;case_title:string;case_summary:string;business_problem:string;tension:string;decision_or_move:string;mechanism:string;outcome:string;executive_implication:string;relevance_score:number;credibility_score:number;tension_score:number;executive_value_score:number;brand_fit_score:number;confidence:"low"|"medium"|"high";sources:Array<{ref:string;source_type:string;fact_notes:string}>}>;
  ideas:Array<{case_key:string;working_title:string;content_angle:string;tension:string;core_insight:string;recommended_format:"carousel"|"reels"|"single_post";campaign_relevance:string}>;
};

function errorJson(message:string,status=400){return NextResponse.json({ok:false,error:message},{status});}
function sameOrigin(request:Request){const origin=request.headers.get("origin");const host=request.headers.get("x-forwarded-host")||request.headers.get("host");if(!origin||!host)return true;try{return new URL(origin).host===host}catch{return false}}
async function requireSessionIfConfigured(){if(!process.env.NEXT_PUBLIC_SUPABASE_URL||!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)return true;const supabase=await createServerSupabaseClient();const{data:{user}}=await supabase.auth.getUser();return Boolean(user)}
function formatLabel(format:QuickBrief["preferredFormat"]){if(format==="carousel")return"Utamakan carousel.";if(format==="reels")return"Utamakan Reels.";if(format==="single_post")return"Utamakan single post.";return"Pilih format terbaik per angle berdasarkan kekuatan cerita."}

export async function POST(request:Request){
  try{
    if(!sameOrigin(request))return errorJson("Cross-origin request ditolak.",403);
    if(!(await requireSessionIfConfigured()))return errorJson("Session login tidak valid. Silakan sign in ulang.",401);
    const body=(await request.json().catch(()=>({}))) as Partial<QuickBrief>;
    const input:QuickBrief={
      brandId:String(body.brandId??"").trim(),brandName:String(body.brandName??"").trim(),website:String(body.website??"").trim(),topic:String(body.topic??"").trim(),audience:String(body.audience??"").trim(),objective:String(body.objective??"").trim(),cta:String(body.cta??"").trim(),preferredFormat:body.preferredFormat??"auto",extraContext:String(body.extraContext??"").trim(),brandIntelligence:body.brandIntelligence??null,
    };
    if(!input.brandName||!input.topic||!input.audience||!input.objective)return errorJson("Brand, topik/program, target audience, dan objective wajib terisi.");
    if(!process.env.GEMINI_API_KEY?.trim())return errorJson("GEMINI_API_KEY belum dikonfigurasi.",503);
    if(!process.env.TAVILY_API_KEY?.trim())return errorJson("TAVILY_API_KEY belum dikonfigurasi.",503);

    const knowledge=await loadStorytellingKnowledge();
    const today=new Date().toISOString().slice(0,10);
    const queryPlan=await createStructuredJson<QueryPlan>({schema:queryPlanSchema as unknown as Record<string,unknown>,system:"Kamu adalah search strategist untuk riset case study B2B. Tugasmu hanya membuat query pencarian presisi.",user:`TANGGAL: ${today}\n\nQUICK CAMPAIGN BRIEF:\n${compactJson(input)}\n\nBuat tepat 4 query web untuk menemukan kasus perusahaan/organisasi nyata yang relevan. Query harus mencari nama perusahaan, kejadian konkret, konsekuensi, keputusan, dan mechanism. Prioritaskan: recent incident/tension; official evidence; implementation/turnaround; benchmark case kuat.`,temperature:0.2});
    const queries=(queryPlan.queries??[]).map(q=>q.trim()).filter(Boolean).slice(0,4);
    if(queries.length<4)return errorJson("AI gagal membuat search query yang cukup.",502);
    const batches=await Promise.all(queries.map(async query=>({query,results:await tavilySearch(query)})));
    const webSources=normalizeSources(batches);
    if(webSources.length<5)return errorJson("Source live research terlalu sedikit. Coba perjelas topik atau objective.",502);
    const sourceCatalog=webSources.map(s=>`${s.ref} | ${s.publisher} | ${s.title} | ${s.url}\nSNIPPET: ${s.content}`).join("\n\n");

    const synthesis=await createStructuredJson<Synthesis>({schema:angleSynthesisSchema as unknown as Record<string,unknown>,system:"Kamu adalah gabungan senior B2B researcher, content strategist, dan executive storyteller. Semua output human-facing wajib Bahasa Indonesia. Tolak konten generik.",user:`EDITORIAL KNOWLEDGE BASE:\n${knowledge}\n\nQUICK INPUT:\n${compactJson(input)}\n\nACTIVE BRAND INTELLIGENCE:\n${compactJson(input.brandIntelligence)}\n\nLIVE WEB SOURCES — fakta kasus hanya boleh berasal dari katalog ini:\n${sourceCatalog}\n\nTUGAS:\n1. Bentuk brand profile editorial yang konservatif.\n2. Turunkan campaign logic.\n3. Pilih 3-4 kasus nyata dengan tension + mechanism kuat, idealnya >=2 source refs.\n4. Buat tepat 5 content angles case-led dan non-generic.\n\nATURAN: wajib Case/Evidence → Tension → Mechanism → Insight → Brand POV. Jangan membuat angka, quote, motive, legal finding, atau sebab-akibat tanpa dukungan sumber. Audience: ${input.audience}. ${formatLabel(input.preferredFormat)} Extra context: ${input.extraContext||"Tidak ada."}`,temperature:0.35});

    const sourceMap=new Map(webSources.map(source=>[source.ref,source]));
    const cases=synthesis.cases.map(item=>{
      const mapped=item.sources.map(source=>({...source,source:sourceMap.get(source.ref)})).filter(row=>Boolean(row.source));
      const score=average([clampScore(item.relevance_score),clampScore(item.credibility_score),clampScore(item.tension_score),clampScore(item.executive_value_score),clampScore(item.brand_fit_score)]);
      return {id:crypto.randomUUID(),...item,score,mapped_sources:mapped.map(row=>({ref:row.ref,source_type:row.source_type,fact_notes:row.fact_notes,publisher:row.source!.publisher,title:row.source!.title,url:row.source!.url})),selected:false};
    });
    const eligible=cases.filter(item=>item.mapped_sources.length>=2&&item.confidence!=="low");
    if(eligible.length<2)return errorJson("AI belum menemukan minimal dua kasus yang cukup terverifikasi. Coba perjelas topik campaign.",502);
    const best=[...eligible].sort((a,b)=>b.score-a.score)[0];
    cases.forEach(item=>{item.selected=item.id===best.id});
    const caseByKey=new Map(cases.map(item=>[item.key,item]));
    const ideas=synthesis.ideas.slice(0,5).map((idea,index)=>{
      const researchCase=caseByKey.get(idea.case_key)||best;
      const preferred=input.preferredFormat&&input.preferredFormat!=="auto"?input.preferredFormat:idea.recommended_format;
      return {id:crypto.randomUUID(),index:index+1,research_case_id:researchCase.id,working_title:idea.working_title,content_angle:idea.content_angle,tension:idea.tension,core_insight:idea.core_insight,recommended_format:preferred,campaign_relevance:idea.campaign_relevance,status:"idea"};
    });
    if(ideas.length!==5)return errorJson("AI tidak mengembalikan tepat 5 Story Angles.",502);
    const campaignId=crypto.randomUUID();
    return NextResponse.json({ok:true,campaignId,campaign:{id:campaignId,brand_id:input.brandId||null,brand_name:input.brandName,website:input.website||"",topic:input.topic,objective:input.objective,audience:input.audience,cta:input.cta||"",preferred_format:input.preferredFormat||"auto",desired_perception:synthesis.campaign.desired_perception,business_problem:synthesis.campaign.business_problem,key_message:synthesis.campaign.key_message,funnel_stage:synthesis.campaign.funnel_stage,created_at:new Date().toISOString()},brand_profile:synthesis.brand_profile,cases,ideas,sources:webSources,queries});
  }catch(error){console.error("Story angles error",error);return errorJson(error instanceof Error?error.message:"Gagal menghasilkan storytelling angles.",500)}
}
