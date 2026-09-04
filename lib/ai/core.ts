import fs from "node:fs/promises";
import path from "node:path";

export function getAIModel() {
  return process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
}

export async function loadStorytellingKnowledge() {
  const file = path.join(process.cwd(), "public", "knowledge", "storytelling_knowledge_base.md");
  return fs.readFile(file, "utf8");
}

export function compactJson(value: unknown) { return JSON.stringify(value, null, 2); }

function stripCodeFences(text: string) {
  return text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
}

function extractFirstJson(text: string) {
  const cleaned = stripCodeFences(text);
  try { JSON.parse(cleaned); return cleaned; } catch {}
  const starts = [cleaned.indexOf("{"), cleaned.indexOf("[")].filter(n => n >= 0).sort((a,b)=>a-b);
  if (!starts.length) return cleaned;
  const start = starts[0]; const opening = cleaned[start]; const closing = opening === "{" ? "}" : "]";
  let depth = 0, inString = false, escaped = false;
  for (let i=start;i<cleaned.length;i++) {
    const ch=cleaned[i];
    if (inString) { if (escaped) escaped=false; else if (ch==="\\") escaped=true; else if (ch==='"') inString=false; continue; }
    if (ch==='"') { inString=true; continue; }
    if (ch===opening) depth++;
    if (ch===closing) { depth--; if (depth===0) return cleaned.slice(start,i+1); }
  }
  return cleaned;
}

function parseJson<T>(text:string):T { return JSON.parse(extractFirstJson(text)) as T; }

function extractGenerateContentText(payload:any) {
  const parts=payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.filter((part:any)=>typeof part?.text==="string").map((part:any)=>part.text).join("").trim();
}

async function callGeminiPlainText({apiKey,model,prompt}:{apiKey:string;model:string;prompt:string}) {
  const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":apiKey},body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}]}),cache:"no-store"});
  const payload=await response.json().catch(()=>({}));
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${String(payload?.error?.message||payload?.message||`Gemini request failed (${response.status})`)}`);
  const text=extractGenerateContentText(payload);
  if (!text) throw new Error(`Gemini tidak mengembalikan teks${payload?.candidates?.[0]?.finishReason?` (${payload.candidates[0].finishReason})`:""}.`);
  return text;
}

export async function createStructuredJson<T>({schema,system,user,temperature:_temperature=0.35}:{schema:Record<string,unknown>;system:string;user:string;temperature?:number}) {
  const apiKey=process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY belum dikonfigurasi.");
  const model=getAIModel(); const contract=JSON.stringify(schema);
  const prompt=`${system}\n\n${user}\n\n=== OUTPUT CONTRACT ===\nKembalikan HANYA satu JSON valid.\nJANGAN gunakan markdown atau code fence.\nIsi seluruh field required sesuai schema berikut:\n${contract}\n\nGunakan Bahasa Indonesia untuk field editorial/content kecuali proper noun dan istilah resmi.`;
  const firstText=await callGeminiPlainText({apiKey,model,prompt});
  try { return parseJson<T>(firstText); } catch {
    const repaired=await callGeminiPlainText({apiKey,model,prompt:`Perbaiki output berikut menjadi SATU JSON valid tanpa markdown atau penjelasan. Sesuaikan dengan schema ini:\n${contract}\n\nOUTPUT:\n${firstText}`});
    try { return parseJson<T>(repaired); } catch { throw new Error("Gemini merespons tetapi JSON belum valid setelah 1x repair. Silakan generate ulang."); }
  }
}

export function clampScore(value:number){if(!Number.isFinite(value))return 0;return Math.min(10,Math.max(0,value));}
export function average(values:number[]){return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:0;}
export function slugify(value:string){return value.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,70);}
