import { NextResponse } from "next/server";
import { compactJson, createStructuredJson, loadStorytellingKnowledge } from "@/lib/ai/core";

export const maxDuration=300;
export const dynamic="force-dynamic";

type Channel="linkedin"|"seo_geo";

const linkedinSchema={type:"object",required:["hook","editorial_thesis","body_copy","key_takeaway","cta","visual_direction","hashtags","research_gaps","quality_notes"],properties:{hook:{type:"string"},editorial_thesis:{type:"string"},body_copy:{type:"string"},key_takeaway:{type:"string"},cta:{type:"string"},visual_direction:{type:"string"},hashtags:{type:"array",items:{type:"string"},minItems:3,maxItems:8},research_gaps:{type:"array",items:{type:"string"},maxItems:8},quality_notes:{type:"array",items:{type:"string"},maxItems:8}}};
const seoGeoSchema={type:"object",required:["primary_keyword","secondary_keywords","search_intent","seo_title","meta_description","slug","article_angle","direct_answer","entity_context","questions_to_answer","h1","outline","key_takeaways","faq","internal_link_suggestions","cta","article_draft","research_gaps","geo_notes"],properties:{primary_keyword:{type:"string"},secondary_keywords:{type:"array",items:{type:"string"},minItems:3,maxItems:12},search_intent:{type:"string"},seo_title:{type:"string"},meta_description:{type:"string"},slug:{type:"string"},article_angle:{type:"string"},direct_answer:{type:"string"},entity_context:{type:"array",items:{type:"string"},maxItems:10},questions_to_answer:{type:"array",items:{type:"string"},minItems:3,maxItems:10},h1:{type:"string"},outline:{type:"string"},key_takeaways:{type:"array",items:{type:"string"},minItems:3,maxItems:8},faq:{type:"array",items:{type:"object",required:["question","answer"],properties:{question:{type:"string"},answer:{type:"string"}}},maxItems:8},internal_link_suggestions:{type:"array",items:{type:"string"},maxItems:8},cta:{type:"string"},article_draft:{type:"string"},research_gaps:{type:"array",items:{type:"string"},maxItems:10},geo_notes:{type:"array",items:{type:"string"},maxItems:10}}};

function errorJson(message:string,status=400){return NextResponse.json({ok:false,error:message},{status})}
function sameOrigin(request:Request){const origin=request.headers.get("origin");const host=request.headers.get("x-forwarded-host")||request.headers.get("host");if(!origin||!host)return true;try{return new URL(origin).host===host}catch{return false}}

export async function POST(request:Request){
 try{
  if(!sameOrigin(request))return errorJson("Cross-origin request ditolak.",403);
  const body=await request.json().catch(()=>({}));
  const channel=String(body?.channel||"") as Channel;
  const brief=body?.brief;
  const campaignBundle=body?.campaignBundle;
  if(channel!=="linkedin"&&channel!=="seo_geo")return errorJson("Channel expansion tidak valid.");
  if(!brief?.id||!campaignBundle?.campaign)return errorJson("Master brief dan campaign context wajib tersedia.");
  if(brief.human_qc!=="approved")return errorJson("Master brief harus lolos Human QC sebelum dikonversi.",409);
  const knowledge=await loadStorytellingKnowledge();
  const idea=campaignBundle.ideas?.find((item:any)=>item.id===brief.idea_id);
  const researchCase=campaignBundle.cases?.find((item:any)=>item.id===idea?.research_case_id);
  const sourceContext=researchCase?.mapped_sources??[];
  const master={brief,campaign:campaignBundle.campaign,brand_profile:campaignBundle.brand_profile,idea,researchCase,sources:sourceContext};
  const rules=`MASTER BRIEF adalah source of truth. Pertahankan core message, tension, mechanism, audience, Brand POV, CTA intent, dan batas evidence. Jangan menambah angka, kutipan, outcome, perusahaan, causal claim, atau fakta baru yang tidak tersedia. Jika butuh fakta tambahan, taruh di research_gaps. Bedakan FACT, INTERPRETATION, dan BRAND POV. Hindari AI slop, filler, keyword stuffing, dan promosi terlalu dini. Gunakan standar storytelling berikut sebagai guardrail:\n${knowledge}`;
  if(channel==="linkedin"){
   const result=await createStructuredJson<any>({schema:linkedinSchema as Record<string,unknown>,system:"Kamu adalah elite B2B LinkedIn strategist, executive storyteller, dan editorial director. Tulis native LinkedIn post yang terasa manusiawi, tajam, evidence-led, dan relevan bagi decision maker.",user:`MASTER CONTENT:\n${compactJson(master)}\n\nRULES:\n${rules}\n\nBuat versi LinkedIn yang BUKAN ringkasan carousel. Mulai dari satu thesis yang tajam. Hook 1-3 kalimat dengan specificity, contradiction, tension, atau business stakes yang legitimate. Body harus mengikuti alur Hook → Context/Tension → Case/Mechanism → Insight → Executive Relevance → Brand POV → CTA. Gunakan paragraf pendek dan ritme baca natural. Jangan memakai pola generik seperti “di era...”, “5 alasan...”, atau pertanyaan kosong. Key takeaway harus bisa dibawa ke diskusi internal oleh manager/head/director. Visual direction harus konkret. Hashtag hanya 3-8 yang benar-benar relevan.`,temperature:0.32});
   return NextResponse.json({ok:true,channel,content:result,generated_at:new Date().toISOString()});
  }
  const result=await createStructuredJson<any>({schema:seoGeoSchema as Record<string,unknown>,system:"Kamu adalah elite B2B SEO strategist, GEO/answer-engine editor, entity-aware content architect, dan evidence-led long-form writer.",user:`MASTER CONTENT:\n${compactJson(master)}\n\nRULES:\n${rules}\n\nBuat artikel SEO + GEO Friendly yang lebih kuat daripada sekadar keyword optimization. WAJIB: primary keyword dan semantic secondary keywords natural; search intent eksplisit; direct_answer 40-80 kata yang menjawab inti topik secara mandiri; entity_context menjelaskan perusahaan/konsep/role/istilah penting agar tidak ambigu; questions_to_answer mencakup pertanyaan yang mungkin ditanyakan pengguna/AI answer engine; outline H2/H3 berbasis intent dan mechanism; key_takeaways ringkas dan faktual; FAQ dengan jawaban langsung; article_draft sekitar 1.200-1.800 kata jika evidence memadai; gunakan definisi singkat hanya bila membantu intent, lalu prioritaskan case, mechanism, business implication, dan decision guidance. Buat artikel mudah dikutip answer engines: paragraf jelas, jawaban langsung, entity naming konsisten, tidak keyword stuffing. Jangan mengarang schema markup atau URL internal. internal_link_suggestions berupa topik/halaman. geo_notes jelaskan alasan konten mudah dipahami/dikutip AI systems dan apa yang masih kurang. Jika evidence kurang, nyatakan pada research_gaps dan jangan mengarang.`,temperature:0.28});
  return NextResponse.json({ok:true,channel,content:result,generated_at:new Date().toISOString()});
 }catch(error){console.error("Content expansion error",error);return errorJson(error instanceof Error?error.message:"Gagal mengonversi master brief.",500)}
}
