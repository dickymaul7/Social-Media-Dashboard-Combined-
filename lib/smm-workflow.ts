import { createClient } from "@/lib/supabase/client";

export type ResearchSource = { ref:string; title:string; url:string; publisher:string; content?:string; score?:number };
export type ResearchCase = { id:string; key:string; company_name:string; case_title:string; case_summary:string; business_problem:string; tension:string; decision_or_move:string; mechanism:string; outcome:string; executive_implication:string; confidence:string; selected:boolean; topic_relevance_score?:number; campaign_alignment_score?:number; mapped_sources:Array<{ref:string;source_type:string;fact_notes:string;publisher:string;title:string;url:string}> };
export type StoryIdea = { id:string; index:number; research_case_id:string; working_title:string; content_angle:string; tension:string; core_insight:string; recommended_format:string; campaign_relevance:string; status:string };
export type CampaignRecord = { id:string; brand_id:string|null; brand_name:string; website:string; topic:string; objective:string; audience:string; cta:string; preferred_format:string; desired_perception:string; business_problem:string; key_message:string; funnel_stage:string; created_at:string };
export type CampaignBundle = { campaign:CampaignRecord; brand_profile:Record<string,unknown>; cases:ResearchCase[]; ideas:StoryIdea[]; sources:ResearchSource[]; queries:string[] };

export type BriefSection = { id:string; sequence_no:number; section_type:"slide"|"scene"; purpose:string; headline:string; supporting_copy:string; evidence_needed:string; visual_direction:string; transition_to_next:string };
export type QualityReview = { overall_score:number; reviewer_notes:string; required_revisions:string[]; [key:string]:unknown };
export type BriefRecord = { id:string; campaign_id:string; idea_id:string; brand_id:string|null; brand_name:string; working_title:string; recommended_format:string; content_objective:string; target_audience:string; funnel_stage:string; editorial_thesis:string; case_evidence:string; why_this_case:string; tension:string; core_insight:string; brand_pov:string; capability_bridge:string; story_arc:string; cta:string; fact_check_notes:string; sections:BriefSection[]; quality?:QualityReview; human_qc:"pending"|"approved"; scheduled_for?:string; production_status?:"draft"|"ready_to_design"|"designed"; design_url?:string; updated_at:string };

const campaignKey=(id:string)=>`proxsis-smm:campaign:${id}`;
const campaignIndexKey="proxsis-smm:campaign-index:v1";
const briefKey=(id:string)=>`proxsis-smm:brief:${id}`;
const briefIndexKey="proxsis-smm:brief-index:v1";

function readIds(key:string):string[]{if(typeof window==="undefined")return[];try{const parsed=JSON.parse(window.localStorage.getItem(key)||"[]");return Array.isArray(parsed)?parsed.filter((id):id is string=>typeof id==="string"):[]}catch{return[]}}
function writeIds(key:string,ids:string[]){if(typeof window==="undefined")return;window.localStorage.setItem(key,JSON.stringify(ids));}
function supabaseConfigured(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)}

async function getAuthenticatedClient(){
  if(!supabaseConfigured())return null;
  try{
    const supabase=createClient();
    const {data:{user}}=await supabase.auth.getUser();
    return user?{supabase,user}:null;
  }catch{return null}
}

export async function mirrorCampaignToSupabase(bundle:CampaignBundle){
  if(!bundle.campaign.brand_id)return;
  const auth=await getAuthenticatedClient();
  if(!auth)return;
  const {error}=await auth.supabase.from("smm_campaigns").upsert({
    id:bundle.campaign.id,
    brand_id:bundle.campaign.brand_id,
    created_by:auth.user.id,
    topic:bundle.campaign.topic||"",
    payload:bundle,
    created_at:bundle.campaign.created_at,
    updated_at:new Date().toISOString(),
  },{onConflict:"id"});
  if(error)console.warn("Supabase campaign mirror skipped:",error.message);
}

export async function mirrorBriefToSupabase(brief:BriefRecord){
  if(!brief.brand_id)return;
  const auth=await getAuthenticatedClient();
  if(!auth)return;
  const {error}=await auth.supabase.from("smm_briefs").upsert({
    id:brief.id,
    campaign_id:brief.campaign_id,
    brand_id:brief.brand_id,
    created_by:auth.user.id,
    scheduled_for:brief.scheduled_for||null,
    human_qc_status:brief.human_qc,
    production_status:brief.production_status||"draft",
    payload:brief,
    updated_at:brief.updated_at||new Date().toISOString(),
  },{onConflict:"id"});
  if(error)console.warn("Supabase brief mirror skipped:",error.message);
}

export async function hydrateCampaignsFromSupabase(brandId:string){
  const auth=await getAuthenticatedClient();
  if(!auth)return loadCampaignsForBrand(brandId);
  const {data,error}=await auth.supabase.from("smm_campaigns").select("payload").eq("brand_id",brandId).order("created_at",{ascending:false}).limit(100);
  if(error)return loadCampaignsForBrand(brandId);
  for(const row of data??[]){const bundle=row.payload as CampaignBundle;if(bundle?.campaign?.id)saveCampaignLocal(bundle)}
  return loadCampaignsForBrand(brandId);
}

export async function hydrateBriefsFromSupabase(brandId:string){
  const auth=await getAuthenticatedClient();
  if(!auth)return loadAllBriefs().filter(brief=>brief.brand_id===brandId);
  const {data,error}=await auth.supabase.from("smm_briefs").select("payload").eq("brand_id",brandId).order("updated_at",{ascending:false}).limit(200);
  if(error)return loadAllBriefs().filter(brief=>brief.brand_id===brandId);
  for(const row of data??[]){const brief=row.payload as BriefRecord;if(brief?.id)saveBriefLocal(brief)}
  return loadAllBriefs().filter(brief=>brief.brand_id===brandId);
}

function saveCampaignLocal(bundle:CampaignBundle){
  if(typeof window==="undefined")return;
  window.localStorage.setItem(campaignKey(bundle.campaign.id),JSON.stringify(bundle));
  const ids=loadCampaignIds();
  writeIds(campaignIndexKey,[bundle.campaign.id,...ids.filter(id=>id!==bundle.campaign.id)].slice(0,100));
}

export function saveCampaign(bundle:CampaignBundle){saveCampaignLocal(bundle);void mirrorCampaignToSupabase(bundle)}
export function loadCampaign(id:string):CampaignBundle|null{if(typeof window==="undefined")return null;try{const raw=window.localStorage.getItem(campaignKey(id));return raw?JSON.parse(raw):null}catch{return null}}
export function loadCampaignIds():string[]{return readIds(campaignIndexKey)}
export function loadAllCampaigns():CampaignBundle[]{return loadCampaignIds().map(loadCampaign).filter((x):x is CampaignBundle=>Boolean(x)).sort((a,b)=>b.campaign.created_at.localeCompare(a.campaign.created_at));}
export function loadCampaignsForBrand(brandId:string):CampaignBundle[]{return loadAllCampaigns().filter(bundle=>bundle.campaign.brand_id===brandId)}

function saveBriefLocal(brief:BriefRecord){
  if(typeof window==="undefined")return;
  window.localStorage.setItem(briefKey(brief.id),JSON.stringify(brief));
  const ids=loadBriefIds();
  if(!ids.includes(brief.id))writeIds(briefIndexKey,[brief.id,...ids].slice(0,200));
}
export function saveBrief(brief:BriefRecord){saveBriefLocal(brief);void mirrorBriefToSupabase(brief)}
export function loadBrief(id:string):BriefRecord|null{if(typeof window==="undefined")return null;try{const raw=window.localStorage.getItem(briefKey(id));return raw?JSON.parse(raw):null}catch{return null}}
export function loadBriefIds():string[]{return readIds(briefIndexKey)}
export function loadAllBriefs():BriefRecord[]{return loadBriefIds().map(loadBrief).filter((x):x is BriefRecord=>Boolean(x));}
