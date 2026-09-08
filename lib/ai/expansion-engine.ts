import { compactJson, createStructuredJson } from "@/lib/ai/core";

export type ExpansionChannel = "linkedin" | "seo_article";
export type LinkedInExpansion = {
  hook: string;
  main_angle: string;
  body_copy: string;
  key_takeaway: string;
  cta: string;
  visual_direction: string;
  hashtags: string[];
  research_gaps: string[];
};
export type SeoExpansion = {
  primary_keyword: string;
  secondary_keywords: string[];
  search_intent: string;
  seo_title: string;
  meta_description: string;
  slug: string;
  article_angle: string;
  h1: string;
  outline: string;
  internal_link_suggestions: string[];
  cta: string;
  article_draft: string;
  research_gaps: string[];
};
export type ExpansionContent = LinkedInExpansion | SeoExpansion;
export type AlignmentReport = {
  overall: number;
  core_message: number;
  audience: number;
  brand_pov: number;
  facts_claims: number;
  channel_fit: number;
  verdict: string;
  risks: string[];
  recommendations: string[];
};

const linkedinSchema = {
  type: "object",
  required: ["hook","main_angle","body_copy","key_takeaway","cta","visual_direction","hashtags","research_gaps"],
  properties: {
    hook: { type: "string", minLength: 1 }, main_angle: { type: "string", minLength: 1 }, body_copy: { type: "string", minLength: 1 }, key_takeaway: { type: "string", minLength: 1 }, cta: { type: "string", minLength: 1 }, visual_direction: { type: "string", minLength: 1 },
    hashtags: { type: "array", minItems: 3, maxItems: 8, items: { type: "string", minLength: 1 } },
    research_gaps: { type: "array", maxItems: 8, items: { type: "string", minLength: 1 } },
  },
};
const seoSchema = {
  type: "object",
  required: ["primary_keyword","secondary_keywords","search_intent","seo_title","meta_description","slug","article_angle","h1","outline","internal_link_suggestions","cta","article_draft","research_gaps"],
  properties: {
    primary_keyword: { type: "string", minLength: 1 }, secondary_keywords: { type: "array", minItems: 3, maxItems: 10, items: { type: "string", minLength: 1 } }, search_intent: { type: "string", minLength: 1 }, seo_title: { type: "string", minLength: 1 }, meta_description: { type: "string", minLength: 1 }, slug: { type: "string", minLength: 1 }, article_angle: { type: "string", minLength: 1 }, h1: { type: "string", minLength: 1 }, outline: { type: "string", minLength: 1 }, internal_link_suggestions: { type: "array", maxItems: 8, items: { type: "string", minLength: 1 } }, cta: { type: "string", minLength: 1 }, article_draft: { type: "string", minLength: 1 }, research_gaps: { type: "array", maxItems: 10, items: { type: "string", minLength: 1 } },
  },
};
const alignmentSchema = {
  type: "object",
  required: ["overall","core_message","audience","brand_pov","facts_claims","channel_fit","verdict","risks","recommendations"],
  properties: {
    overall: { type: "integer", minimum: 0, maximum: 100 }, core_message: { type: "integer", minimum: 0, maximum: 100 }, audience: { type: "integer", minimum: 0, maximum: 100 }, brand_pov: { type: "integer", minimum: 0, maximum: 100 }, facts_claims: { type: "integer", minimum: 0, maximum: 100 }, channel_fit: { type: "integer", minimum: 0, maximum: 100 }, verdict: { type: "string", minLength: 1 }, risks: { type: "array", maxItems: 8, items: { type: "string", minLength: 1 } }, recommendations: { type: "array", maxItems: 8, items: { type: "string", minLength: 1 } },
  },
};

function masterRules() {
  return `\nMASTER CONTENT RULES — WAJIB:\n- Master Social Brief yang sudah Human QC Approved adalah source of truth.\n- Pertahankan core message, business mechanism, target audience, Brand POV, CTA intent, dan evidence boundary.\n- Adaptasi boleh mengubah struktur, panjang, hook, tone, dan cara menjelaskan agar native untuk channel tujuan.\n- JANGAN menambahkan angka, quote, legal finding, outcome, causal claim, perusahaan, atau fakta baru yang tidak ada pada master/source evidence.\n- Jika sebuah poin akan membuat output lebih kuat tetapi membutuhkan fakta tambahan, JANGAN mengarang. Masukkan kebutuhan itu ke research_gaps.\n- Brand promotion tetap natural dan tidak muncul terlalu dini.\n- Hindari bahasa generik AI dan keyword stuffing.\n`;
}

export async function generateExpansion({ channel, master }: { channel: ExpansionChannel; master: unknown }) {
  if (channel === "linkedin") {
    return createStructuredJson<LinkedInExpansion>({
      schema: linkedinSchema,
      system: "Kamu adalah senior B2B LinkedIn content strategist. Tugasmu mengubah master social brief yang sudah disetujui manusia menjadi draft LinkedIn yang terasa native, tajam, kredibel, dan executive-friendly.",
      user: `\nMASTER CONTENT + VERIFIED CONTEXT:\n${compactJson(master)}\n\nTASK:\nBuat LinkedIn content brief sekaligus post draft yang siap diedit manusia.\n\nCHANNEL GUIDANCE:\n- Hook 1-3 kalimat, kuat tetapi tidak clickbait.\n- Main angle harus relevan untuk decision maker/professional audience.\n- Body copy harus punya alur: hook → konteks/tension → mechanism/insight → implication → Brand POV/CTA.\n- Gunakan paragraf pendek agar nyaman dibaca di LinkedIn.\n- Key takeaway harus actionable atau executive-level, bukan slogan.\n- Suggested visual harus konkret.\n- Hashtag 3-8, relevan dan tidak spammy.\n${masterRules()}`,
      temperature: 0.32,
    });
  }
  return createStructuredJson<SeoExpansion>({
    schema: seoSchema,
    system: "Kamu adalah senior SEO content strategist dan B2B editor. Tugasmu mengubah master social brief yang sudah disetujui manusia menjadi SEO content brief dan article draft yang search-intent aware tanpa mengorbankan evidence.",
    user: `\nMASTER CONTENT + VERIFIED CONTEXT:\n${compactJson(master)}\n\nTASK:\nBuat SEO content brief sekaligus article draft yang siap diedit manusia.\n\nSEO GUIDANCE:\n- Pilih satu primary keyword yang benar-benar sesuai topik dan intent master brief.\n- Secondary keyword harus semantik dan relevan, bukan variasi spam.\n- Search intent harus jelas.\n- SEO title idealnya ringkas dan compelling tanpa clickbait.\n- Meta description harus natural dan menjelaskan value artikel.\n- Slug singkat, lowercase, hyphenated.\n- Outline ditulis dalam format multiline: H2: ... / H3: ...\n- Article draft target sekitar 1.000-1.600 kata, substantif, mudah discan, dan mengikuti outline.\n- Jangan mengulang keyword secara tidak natural.\n- Internal link suggestion berupa topik/halaman yang sebaiknya ditautkan, jangan mengarang URL yang tidak diberikan.\n- Jika artikel membutuhkan tambahan data/statistik/source untuk benar-benar kuat, tulis kebutuhan itu pada research_gaps dan jangan memasukkannya sebagai fakta di article_draft.\n${masterRules()}`,
    temperature: 0.3,
  });
}

export async function reviewExpansionAlignment({ channel, master, content }: { channel: ExpansionChannel; master: unknown; content: ExpansionContent }) {
  return createStructuredJson<AlignmentReport>({
    schema: alignmentSchema,
    system: "Kamu adalah cross-channel editorial QA director. Nilai alignment secara ketat. Jangan memberi skor tinggi hanya karena output terlihat rapi.",
    user: `\nMASTER SOCIAL BRIEF + VERIFIED CONTEXT:\n${compactJson(master)}\n\nDERIVATIVE CHANNEL:\n${channel}\n\nDERIVATIVE CONTENT:\n${compactJson(content)}\n\nTASK:\nNilai alignment 0-100 untuk:\n- core_message: pesan dan business mechanism tetap sama.\n- audience: tetap relevan untuk target audience master sambil native pada channel.\n- brand_pov: Brand POV konsisten, tidak terlalu promosi, dan tidak berubah arah.\n- facts_claims: tidak ada unsupported fact/angka/quote/causal claim baru.\n- channel_fit: format dan gaya benar-benar cocok untuk LinkedIn atau SEO article.\n\noverall bukan rata-rata kosmetik; prioritaskan facts_claims dan core_message.\nSkor <85 berarti derivative belum layak difinalkan.\nRisks harus menyebut mismatch/unsupported claim secara spesifik.\nRecommendations harus berupa revisi konkret.\n`,
    temperature: 0.12,
  });
}
