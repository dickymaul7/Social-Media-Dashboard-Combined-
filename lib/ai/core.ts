import fs from "node:fs/promises";
import path from "node:path";

export function getAIModel(){return process.env.DEEPSEEK_MODEL?.trim()||"deepseek-v4-flash"}

async function readOptionalKnowledge(...segments:string[]){
 try{return await fs.readFile(path.join(process.cwd(),...segments),"utf8")}catch{return""}
}

export async function loadStorytellingKnowledge(){
 const base=await fs.readFile(path.join(process.cwd(),"public","knowledge","storytelling_knowledge_base.md"),"utf8");
 const modules=await Promise.all([
  readOptionalKnowledge("public","knowledge","smm_simplified_skill_addendum.md"),
  readOptionalKnowledge("public","knowledge","copywriting-skills","corporate_case_contrast.md"),
 ]);
 return [base,...modules.filter(Boolean)].join("\n\n---\n\n");
}

export function compactJson(value:unknown){return JSON.stringify(value,null,2)}
function stripCodeFences(text:string){return text.trim().replace(/^```json\s*/i,"").replace(/^```\s*/i,"").replace(/```$/i,"").trim()}
function extractFirstJson(text:string){const cleaned=stripCodeFences(text);try{JSON.parse(cleaned);return cleaned}catch{}const starts=[cleaned.indexOf("{"),cleaned.indexOf("[")].filter(n=>n>=0).sort((a,b)=>a-b);if(!starts.length)return cleaned;const start=starts[0],opening=cleaned[start],closing=opening==="{"?"}":"]";let depth=0,inString=false,escaped=false;for(let i=start;i<cleaned.length;i++){const ch=cleaned[i];if(inString){if(escaped)escaped=false;else if(ch==="\\")escaped=true;else if(ch==='"')inString=false;continue}if(ch==='"'){inString=true;continue}if(ch===opening)depth++;if(ch===closing){depth--;if(depth===0)return cleaned.slice(start,i+1)}}return cleaned}
function parseJson<T>(text:string):T{return JSON.parse(extractFirstJson(text)) as T}
async function callDeepSeekJson({apiKey,model,system,user,temperature}:{apiKey:string;model:string;system:string;user:string;temperature:number}){
 const response=await fetch("https://api.deepseek.com/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${apiKey}`},body:JSON.stringify({model,messages:[{role:"system",content:system},{role:"user",content:user}],response_format:{type:"json_object"},thinking:{type:"disabled"},temperature,max_tokens:8192,stream:false}),cache:"no-store"});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(`DeepSeek ${response.status}: ${String(payload?.error?.message||payload?.message||`DeepSeek request failed (${response.status})`)}`);
 const text=String(payload?.choices?.[0]?.message?.content??"").trim();
 if(!text)throw new Error(`DeepSeek tidak mengembalikan output JSON${payload?.choices?.[0]?.finish_reason?` (${payload.choices[0].finish_reason})`:""}.`);
 return text;
}
export async function createStructuredJson<T>({schema,system,user,temperature=0.35}:{schema:Record<string,unknown>;system:string;user:string;temperature?:number}){
 const apiKey=process.env.DEEPSEEK_API_KEY?.trim();if(!apiKey)throw new Error("DEEPSEEK_API_KEY belum dikonfigurasi.");
 const model=getAIModel(),contract=JSON.stringify(schema);
 const systemPrompt=`${system}\n\nWAJIB: hasil akhir harus berupa JSON valid dan hanya JSON, tanpa markdown atau penjelasan.`;
 const userPrompt=`${user}\n\n=== JSON OUTPUT CONTRACT ===\nIsi seluruh field required sesuai struktur berikut:\n${contract}\n\nGunakan Bahasa Indonesia untuk field editorial/content kecuali proper noun dan istilah resmi.`;
 const firstText=await callDeepSeekJson({apiKey,model,system:systemPrompt,user:userPrompt,temperature});
 try{return parseJson<T>(firstText)}catch{
  const repaired=await callDeepSeekJson({apiKey,model,system:"Kamu adalah JSON repair engine. Kembalikan hanya satu JSON valid.",user:`Perbaiki output berikut agar sesuai kontrak JSON.\n\nCONTRACT:\n${contract}\n\nOUTPUT:\n${firstText}`,temperature:0});
  try{return parseJson<T>(repaired)}catch{throw new Error("DeepSeek merespons tetapi JSON belum valid setelah 1x repair. Silakan generate ulang.")}
 }
}
export function clampScore(value:number){if(!Number.isFinite(value))return 0;return Math.min(10,Math.max(0,value))}
export function average(values:number[]){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0}
