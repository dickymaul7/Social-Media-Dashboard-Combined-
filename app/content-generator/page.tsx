"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Brain, FileText, Search, Sparkles } from "lucide-react";

type BrandIntelligence = { positioning:string; value_proposition:string; target_audiences:string[]; audience_pain_points:string[]; tone_of_voice:string; key_messages:string[]; brand_pov:string; core_expertise:string[] };

function buildBrandContext(intel: BrandIntelligence) { return `Positioning: ${intel.positioning}\nValue Proposition: ${intel.value_proposition}\nAudience: ${intel.target_audiences.join(", ")}\nPain Points: ${intel.audience_pain_points.join(", ")}\nTone: ${intel.tone_of_voice}\nKey Messages: ${intel.key_messages.join("; ")}\nBrand POV: ${intel.brand_pov}\nExpertise: ${intel.core_expertise.join(", ")}`; }
function resolveAudience(value:string, intel:BrandIntelligence) { return value.trim() || intel.target_audiences.join(", "); }

const demoIntelligence: BrandIntelligence = {
  positioning: "Strategic corporate learning and capability partner.",
  value_proposition: "Menghubungkan kebutuhan bisnis dengan pengembangan kapabilitas organisasi.",
  target_audiences: ["Business leaders", "HR leaders", "L&D professionals"],
  audience_pain_points: ["Kesenjangan kapabilitas", "Program learning yang sulit diukur dampaknya"],
  tone_of_voice: "Strategis, evidence-led, praktis.",
  key_messages: ["Learning harus terhubung dengan business impact."],
  brand_pov: "Corporate learning bukan sekadar training activity; harus menjadi business capability.",
  core_expertise: ["Corporate learning", "Leadership", "Organizational capability"],
};

export default function ContentGeneratorPage() {
  const [topic,setTopic]=useState("");
  const [audience,setAudience]=useState("");
  const [objective,setObjective]=useState("");
  const [format,setFormat]=useState<"auto"|"carousel"|"reels"|"single_post">("auto");
  const [angles,setAngles]=useState(5);
  const [result,setResult]=useState<string[]>([]);
  const resolvedAudience=useMemo(()=>resolveAudience(audience,demoIntelligence),[audience]);

  function generate() {
    if (!topic.trim() || !objective.trim()) return;
    const brand=demoIntelligence;
    const titles=[
      `Apa yang terjadi ketika ${topic} tidak lagi dipandang sebagai sekadar program?`,
      `Mengapa ${topic} sering gagal memberi dampak yang diharapkan?`,
      `Keputusan di balik ${topic} yang jarang dibahas perusahaan`,
      `Dari aktivitas ke business impact: pelajaran dari ${topic}`,
      `Satu pertanyaan penting sebelum perusahaan menjalankan ${topic}`,
    ];
    setResult(titles.slice(0,angles).map((title,i)=>`${title} — angle ${i+1}. Audience: ${resolvedAudience}. POV: ${brand.brand_pov}`));
  }

  return <div className="generator-page">
    <div className="generator-header"><div><p className="eyebrow">AI CONTENT STRATEGY</p><h1>Content Generator</h1><p className="muted">Generate ideas using the active brand intelligence as the strategic context.</p></div><div className="intel-badge"><Brain size={16}/> Brand Intelligence loaded</div></div>
    <div className="generator-grid">
      <section className="panel form-panel"><div className="panel-head"><div><h2>Campaign Brief</h2><p>Only campaign-specific inputs are needed.</p></div></div>
        <label>Topic / Program<input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Contoh: AI untuk HR"/></label>
        <label>Target Audience <span className="optional">optional — uses Brand Intelligence</span><input value={audience} onChange={e=>setAudience(e.target.value)} placeholder="Kosongkan untuk memakai audience Brand Intelligence"/></label>
        <label>Objective<input value={objective} onChange={e=>setObjective(e.target.value)} placeholder="Contoh: meningkatkan awareness"/></label>
        <div className="form-row"><label>Format<select value={format} onChange={e=>setFormat(e.target.value as typeof format)}><option value="auto">Auto</option><option value="carousel">Carousel</option><option value="reels">Reels</option><option value="single_post">Single Post</option></select></label><label>Story Angles<select value={angles} onChange={e=>setAngles(Number(e.target.value))}>{[3,5,7,10].map(n=><option key={n}>{n}</option>)}</select></label></div>
        <button className="primary generate" onClick={generate}><Sparkles size={16}/> Buat Story Angles <ArrowRight size={16}/></button>
      </section>
      <aside className="panel intel-panel"><div className="panel-head"><div><h2>Active Brand Intelligence</h2><p>Used automatically by the generator</p></div></div><div className="intel-box">{buildBrandContext(demoIntelligence).split("\n").map(x=><p key={x}>{x}</p>)}</div></aside>
    </div>
    {result.length>0&&<section className="panel results-panel"><div className="panel-head"><div><h2>Story Angles</h2><p>{result.length} strategic angles generated</p></div></div><div className="angle-list">{result.map((x,i)=><div className="angle-card" key={x}><span>{String(i+1).padStart(2,"0")}</span><div><b>{x}</b><small>Case-led · Brand-aligned · {format}</small></div></div>)}</div></section>}
  </div>
}
