import {fetchWorkspaceRows,syncWorkspaceRecord} from "@/lib/workspace-store";
export type ExpansionChannel="linkedin"|"seo_geo";
export type ExpansionCalendarItem={id:string;brief_id:string;brand_id:string|null;brand_name:string;channel:ExpansionChannel;title:string;scheduled_for:string;updated_at:string};
const INDEX_KEY="proxsis-smm:expansion-calendar:v1";
function readAll():ExpansionCalendarItem[]{if(typeof window==="undefined")return[];try{const parsed=JSON.parse(window.localStorage.getItem(INDEX_KEY)||"[]");return Array.isArray(parsed)?parsed:[]}catch{return[]}}
function writeAll(items:ExpansionCalendarItem[]){if(typeof window==="undefined")return;window.localStorage.setItem(INDEX_KEY,JSON.stringify(items));window.dispatchEvent(new Event("proxsis:calendar-changed"))}
function mergeRows(rows:ExpansionCalendarItem[]){const local=readAll();for(const row of rows){const i=local.findIndex(x=>x.id===row.id);if(i>=0)local[i]=row;else local.push(row)}writeAll(local);return loadExpansionCalendarItems()}
export function loadExpansionCalendarItems(){return readAll().sort((a,b)=>a.scheduled_for.localeCompare(b.scheduled_for))}
export function loadExpansionCalendarItem(briefId:string,channel:ExpansionChannel){return readAll().find(item=>item.brief_id===briefId&&item.channel===channel)||null}
export function saveExpansionCalendarItem(item:ExpansionCalendarItem){const items=readAll();const index=items.findIndex(current=>current.brief_id===item.brief_id&&current.channel===item.channel);if(index>=0)items[index]=item;else items.push(item);writeAll(items);void syncWorkspaceRecord("expansion_calendar",item)}
export function moveExpansionCalendarItem(id:string,scheduledFor:string){const items=readAll();const index=items.findIndex(item=>item.id===id);if(index<0)return null;items[index]={...items[index],scheduled_for:scheduledFor,updated_at:new Date().toISOString()};writeAll(items);void syncWorkspaceRecord("expansion_calendar",items[index]);return items[index]}
export async function hydrateExpansionCalendarFromSupabase(brandId:string){const rows=await fetchWorkspaceRows<ExpansionCalendarItem>("expansion_calendar",`select=*&brand_id=eq.${encodeURIComponent(brandId)}&order=scheduled_for.asc&limit=200`);return rows.length?mergeRows(rows):loadExpansionCalendarItems()}
export async function hydrateAllExpansionCalendarFromSupabase(){const rows=await fetchWorkspaceRows<ExpansionCalendarItem>("expansion_calendar","select=*&order=scheduled_for.asc&limit=1000");return rows.length?mergeRows(rows):loadExpansionCalendarItems()}
