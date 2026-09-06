import { NextResponse } from "next/server";
import { createStructuredJson } from "@/lib/ai/core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 12 * 1024 * 1024;
const TEXT_EXTENSIONS = new Set(["txt", "md", "csv", "json", "html", "htm", "xml"]);

function errorJson(message:string,status=400){return NextResponse.json({ok:false,error:message},{status})}
function extension(name:string){const parts=name.toLowerCase().split(".");return parts.length>1?parts.pop()||"":""}
function sameOrigin(request:Request){const origin=request.headers.get("origin");const host=request.headers.get("x-forwarded-host")||request.headers.get("host");if(!origin||!host)return true;try{return new URL(origin).host===host}catch{return false}}
function normalizeArray(value:unknown){if(!Array.isArray(value))return[];return value.filter((x):x is string=>typeof x==="string").map(x=>x.trim()).filter(Boolean).slice(0,20)}
function normalizeSources(value:unknown,fallbackNames:string[]){if(!Array.isArray(value))return fallbackNames.map(name=>({name,notes:"Dibaca sebagai sumber Brand Intelligence."}));const rows=value.filter(x=>x&&typeof x==="object"&&!Array.isArray(x)).map((x:any)=>({name:typeof x.name==="string"?x.name.trim():"",notes:typeof x.notes==="string"?x.notes.trim():""})).filter(x=>x.name);return rows.length?rows.slice(0,10):fallbackNames.map(name=>({name,notes:"Dibaca sebagai sumber Brand Intelligence."}))}

async function extractPdfText(file:File){
 const pdfjs=await import("pdfjs-dist/legacy/build/pdf.js");
 const data=new Uint8Array(await file.arrayBuffer());
 const document=await pdfjs.getDocument({data,useSystemFonts:true}).promise;
 const pages:string[]=[];
 const limit=Math.min(document.numPages,120);
 for(let pageNo=1;pageNo<=limit;pageNo++){
  const page=await document.getPage(pageNo);
  const content=await page.getTextContent();
  const text=content.items.map((item:any)=>typeof item?.str==="string"?item.str:"").filter(Boolean).join(" ");
  if(text.trim())pages.push(`--- PAGE ${pageNo} ---\n${text}`);
 }
 return pages.join("\n").slice(0,220000);
}

export async function POST(request:Request){
 try{
  if(!sameOrigin(request))return errorJson("Cross-origin extraction request ditolak.",403);
  if(!process.env.DEEPSEEK_API_KEY?.trim())return errorJson("DEEPSEEK_API_KEY belum dikonfigurasi di Vercel.",503);
  const formData=await request.formData();
  const files=formData.getAll("files").filter((item):item is File=>item instanceof File&&item.size>0);
  const brandName=String(formData.get("brandName")??"").trim();
  if(!files.length)return errorJson("Pilih minimal satu file brand.");
  if(files.length>MAX_FILES)return errorJson(`Maksimal ${MAX_FILES} file dalam satu kali ekstraksi.`);
  if(files.reduce((sum,file)=>sum+file.size,0)>MAX_TOTAL_BYTES)return errorJson("Total file terlalu besar. Maksimal 12 MB per ekstraksi.");

  const sourceNames:string[]=[];
  const sourceTexts:string[]=[];
  for(const file of files){
   const ext=extension(file.name);sourceNames.push(file.name);
   if(file.type==="application/pdf"||ext==="pdf"){
    const text=await extractPdfText(file);
    if(!text.trim())return errorJson(`PDF ${file.name} tidak memiliki text layer yang dapat dibaca. Gunakan PDF text-based atau export ulang dokumen ke PDF.`);
    sourceTexts.push(`=== SOURCE FILE: ${file.name} ===\n${text}\n=== END SOURCE ===`);
   }else if(file.type.startsWith("text/")||file.type==="application/json"||TEXT_EXTENSIONS.has(ext)){
    sourceTexts.push(`=== SOURCE FILE: ${file.name} ===\n${(await file.text()).slice(0,180000)}\n=== END SOURCE ===`);
   }else return errorJson(`Format ${file.name} belum didukung. Gunakan PDF atau TXT/MD/CSV/JSON/HTML/XML. Untuk DOCX/PPTX/XLSX, export ke PDF terlebih dahulu.`);
  }

  const contract={market_industry:"string",market_context:"string",market_trends:["string"],customer_segments:["string"],target_audiences:["string"],audience_pain_points:["string"],positioning:"string",value_proposition:"string",differentiation:"string",brand_pov:"string",tone_of_voice:"string",key_messages:["string"],capabilities:["string"],proof_points:["string"],allowed_claims:["string"],prohibited_claims:["string"],communication_dos:["string"],communication_donts:["string"],source_files:[{name:"string",notes:"string"}],confidence_notes:["string"]};
  const raw=await createStructuredJson<Record<string,unknown>>({schema:contract as unknown as Record<string,unknown>,system:"Kamu adalah senior brand strategist dan B2B market researcher. Ekstrak Brand Intelligence secara konservatif dari dokumen yang diberikan. Jangan mengarang fakta.",user:`BRAND: ${brandName||"Nama brand belum diberikan"}\n\nSOURCE DOCUMENTS:\n${sourceTexts.join("\n\n")}\n\nATURAN:\n1. Hanya gunakan informasi yang didukung dokumen. Jangan mengarang client, angka, positioning, capability, atau claim.\n2. Bedakan fakta eksplisit dan inferensi. Jika tidak cukup didukung, kosongkan field dan jelaskan di confidence_notes.\n3. Jika sumber bertentangan, catat konflik di confidence_notes.\n4. Customer problems harus business problem/jobs-to-be-done, bukan pain point generik.\n5. Capabilities/proof points/claims harus konservatif dan didukung sumber.\n6. Output human-facing Bahasa Indonesia kecuali proper noun/istilah resmi.\n7. Cantumkan semua nama file di source_files.`,temperature:0.15});

  return NextResponse.json({ok:true,data:{market_industry:typeof raw.market_industry==="string"?raw.market_industry.trim():"",market_context:typeof raw.market_context==="string"?raw.market_context.trim():"",market_trends:normalizeArray(raw.market_trends),customer_segments:normalizeArray(raw.customer_segments),target_audiences:normalizeArray(raw.target_audiences),audience_pain_points:normalizeArray(raw.audience_pain_points),positioning:typeof raw.positioning==="string"?raw.positioning.trim():"",value_proposition:typeof raw.value_proposition==="string"?raw.value_proposition.trim():"",differentiation:typeof raw.differentiation==="string"?raw.differentiation.trim():"",brand_pov:typeof raw.brand_pov==="string"?raw.brand_pov.trim():"",tone_of_voice:typeof raw.tone_of_voice==="string"?raw.tone_of_voice.trim():"",key_messages:normalizeArray(raw.key_messages),capabilities:normalizeArray(raw.capabilities),proof_points:normalizeArray(raw.proof_points),allowed_claims:normalizeArray(raw.allowed_claims),prohibited_claims:normalizeArray(raw.prohibited_claims),communication_dos:normalizeArray(raw.communication_dos),communication_donts:normalizeArray(raw.communication_donts),source_files:normalizeSources(raw.source_files,sourceNames),confidence_notes:normalizeArray(raw.confidence_notes)}});
 }catch(error){console.error("brand-intelligence extract error",error);return errorJson(error instanceof Error?error.message:"Ekstraksi Brand Intelligence gagal.",500)}
}
