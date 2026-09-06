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
export function saveCampaign(bundle:CampaignBundle){if(typeof window==="undefined")return;window.localStorage.setItem(campaignKey(bundle.campaign.id),JSON.stringify(bundle));const ids=loadCampaignIds();writeIds(campaignIndexKey,[bundle.campaign.id,...ids.filter(id=>id!==bundle.campaign.id)].slice(0,100));}
export function loadCampaign(id:string):CampaignBundle|null{if(typeof window==="undefined")return null;try{const raw=window.localStorage.getItem(campaignKey(id));return raw?JSON.parse(raw):null}catch{return null}}
export function loadCampaignIds():string[]{return readIds(campaignIndexKey)}
export function loadAllCampaigns():CampaignBundle[]{return loadCampaignIds().map(loadCampaign).filter((x):x is CampaignBundle=>Boolean(x)).sort((a,b)=>b.campaign.created_at.localeCompare(a.campaign.created_at));}
export function loadCampaignsForBrand(brandId:string):CampaignBundle[]{return loadAllCampaigns().filter(bundle=>bundle.campaign.brand_id===brandId)}
export async function hydrateCampaignsFromSupabase(brandId:string){return loadCampaignsForBrand(brandId)}
export function saveBrief(brief:BriefRecord){if(typeof window==="undefined")return;const normalized:BriefRecord=brief.human_qc==="approved"&&Boolean(brief.scheduled_for)&&brief.production_status!=="designed"?{...brief,production_status:"ready_to_design"}:brief;window.localStorage.setItem(briefKey(normalized.id),JSON.stringify(normalized));const ids=loadBriefIds();writeIds(briefIndexKey,[normalized.id,...ids.filter(id=>id!==normalized.id)].slice(0,200));window.dispatchEvent(new CustomEvent("proxsis-smm:brief-updated",{detail:{briefId:normalized.id}}));}
export function loadBrief(id:string):BriefRecord|null{if(typeof window==="undefined")return null;try{const raw=window.localStorage.getItem(briefKey(id));return raw?JSON.parse(raw):null}catch{return null}}
export function loadBriefIds():string[]{return readIds(briefIndexKey)}
export function loadAllBriefs():BriefRecord[]{return loadBriefIds().map(loadBrief).filter((x):x is BriefRecord=>Boolean(x));}
