export type WorkspaceBrand={id:string;name:string;website?:string;status?:"active"|"inactive";created_at?:string};
export type WorkspaceRole="super_admin"|"manager"|"content_writer"|"designer"|"viewer";
export type WorkspaceUser={id:string;name:string;email:string;role:WorkspaceRole;brand_ids:string[];permissions:string[];status:"active"|"inactive"};
export type WorkspaceTask={id:string;brand_id:string;title:string;description?:string;brief_id?:string;channel?:"social"|"linkedin"|"seo_geo";assignee?:string;due_date?:string;status:"todo"|"in_progress"|"review"|"done";priority:"low"|"medium"|"high";created_at:string;updated_at:string};
export type ExpansionMeta={brief_id:string;channel:"linkedin"|"seo_geo";scheduled_for?:string;human_qc:"pending"|"approved";human_qc_at?:string;alignment?:{overall:number;core_message:number;audience:number;brand_pov:number;facts_claims:number;channel_fit:number;verdict:string;risks:string[];recommendations:string[]};master_updated_at?:string;updated_at:string};

const KEYS={brands:"proxsis-workspace:brands:v1",users:"proxsis-workspace:users:v1",tasks:"proxsis-workspace:tasks:v1",expansionMeta:"proxsis-workspace:expansion-meta:v1"};
const DEFAULT_BRANDS:WorkspaceBrand[]=[{id:"proxsis-consulting-group",name:"Proxsis Consulting Group",status:"active"},{id:"proxsis-strategy",name:"Proxsis Strategy",status:"active"},{id:"proxsis-infra",name:"Proxsis Infra",status:"active"}];
const DEFAULT_USERS:WorkspaceUser[]=[{id:"local-admin",name:"Workspace Admin",email:"admin@local",role:"super_admin",brand_ids:[],permissions:["*"],status:"active"}];

function read<T>(key:string,fallback:T):T{if(typeof window==="undefined")return fallback;try{const raw=window.localStorage.getItem(key);return raw?JSON.parse(raw):fallback}catch{return fallback}}
function write<T>(key:string,value:T){if(typeof window==="undefined")return;window.localStorage.setItem(key,JSON.stringify(value));window.dispatchEvent(new CustomEvent("proxsis-workspace:updated",{detail:{key}}));}
export function supabaseConfigured(){return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}
async function remoteUpsert(table:string,payload:unknown,onConflict="id"){const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)return;try{await fetch(`${url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,{method:"POST",headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json",Prefer:"resolution=merge-duplicates"},body:JSON.stringify(payload)})}catch{}}

export function loadBrands(){return read<WorkspaceBrand[]>(KEYS.brands,DEFAULT_BRANDS)}
export function saveBrands(items:WorkspaceBrand[]){write(KEYS.brands,items);void remoteUpsert("brands",items)}
export function upsertBrand(item:WorkspaceBrand){const all=loadBrands();const next=[item,...all.filter(x=>x.id!==item.id)];saveBrands(next);return next}
export function removeBrand(id:string){const next=loadBrands().filter(x=>x.id!==id);saveBrands(next);return next}

export function loadUsers(){return read<WorkspaceUser[]>(KEYS.users,DEFAULT_USERS)}
export function saveUsers(items:WorkspaceUser[]){write(KEYS.users,items);void remoteUpsert("workspace_users",items)}
export function upsertUser(item:WorkspaceUser){const next=[item,...loadUsers().filter(x=>x.id!==item.id)];saveUsers(next);return next}

export function loadTasks(){return read<WorkspaceTask[]>(KEYS.tasks,[])}
export function saveTasks(items:WorkspaceTask[]){write(KEYS.tasks,items);void remoteUpsert("workspace_tasks",items)}
export function upsertTask(item:WorkspaceTask){const next=[item,...loadTasks().filter(x=>x.id!==item.id)];saveTasks(next);return next}
export function removeTask(id:string){const next=loadTasks().filter(x=>x.id!==id);saveTasks(next);return next}

export function expansionMetaKey(briefId:string,channel:"linkedin"|"seo_geo"){return `${briefId}:${channel}`}
export function loadExpansionMeta(){return read<Record<string,ExpansionMeta>>(KEYS.expansionMeta,{})}
export function getExpansionMeta(briefId:string,channel:"linkedin"|"seo_geo"){return loadExpansionMeta()[expansionMetaKey(briefId,channel)]||null}
export function saveExpansionMeta(meta:ExpansionMeta){const all=loadExpansionMeta();all[expansionMetaKey(meta.brief_id,meta.channel)]=meta;write(KEYS.expansionMeta,all);void remoteUpsert("content_expansion_meta",meta,"brief_id,channel");return meta}

export const ROLE_PRESETS:Record<WorkspaceRole,string[]>={
 super_admin:["*"],
 manager:["brief.read","brief.write","calendar.manage","tasks.manage","brand.read","analytics.read","reports.read"],
 content_writer:["brief.read","brief.write","expansion.write","calendar.read","tasks.read","brand.read"],
 designer:["brief.read","calendar.read","design.manage","tasks.write","brand.read"],
 viewer:["brief.read","calendar.read","tasks.read","brand.read","analytics.read","reports.read"],
};
