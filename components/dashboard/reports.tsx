"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Sparkles } from "lucide-react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { useActiveBrand } from "@/components/active-brand";
import { defaultInstagramMetrics, instagramCompetitors, socialPosts } from "@/lib/social-dashboard/data";

const fmt = (value: number) => new Intl.NumberFormat("en-US").format(value);
const toSlug = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

export function Reports() {
  const { activeBrand } = useActiveBrand();
  const [generating, setGenerating] = useState(false);

  const report = useMemo(() => {
    const totalReach = socialPosts.reduce((sum, post) => sum + post.reach, 0);
    const totalEngagement = socialPosts.reduce((sum, post) => sum + post.likes + post.comments + post.saves + post.shares, 0);
    const avgEr = totalReach ? (totalEngagement / totalReach) * 100 : 0;
    const best = [...socialPosts].sort((a, b) => ((b.likes+b.comments+b.saves+b.shares)/b.reach) - ((a.likes+a.comments+a.saves+a.shares)/a.reach))[0];
    const strongestFormat = Object.entries(defaultInstagramMetrics.contentViews).sort((a,b)=>b[1]-a[1])[0];
    return { totalReach, totalEngagement, avgEr, best, strongestFormat };
  }, []);

  const actions = [
    { window: "Days 1–7", action: `Replicate the structure of “${report.best.title}” in 2 new posts.`, reason: "Highest engagement-rate post in the migrated content snapshot." },
    { window: "Days 8–14", action: `Prioritize ${report.strongestFormat[0]} while testing one alternative format.`, reason: `${report.strongestFormat[1]}% of current content views come from this format snapshot.` },
    { window: "Days 15–21", action: `Publish around ${defaultInstagramMetrics.bestTime}.`, reason: "Best-time value preserved from the Instagram analytics snapshot." },
    { window: "Days 22–30", action: "Review reach, saves, shares, profile visits, and link taps; keep only tactics that improve conversion quality.", reason: "Closes the 30-day learning loop before the next report cycle." },
  ];

  async function downloadPdf() {
    setGenerating(true);
    try {
      const pdf = await PDFDocument.create();
      const regular = await pdf.embedFont(StandardFonts.Helvetica);
      const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
      const page = pdf.addPage([841.89, 595.28]);
      const { width, height } = page.getSize();
      const maroon = rgb(0.55, 0.09, 0.19);
      const dark = rgb(0.12, 0.1, 0.11);
      const muted = rgb(0.42, 0.39, 0.4);
      let y = height - 54;

      page.drawText("SOCIAL MEDIA PERFORMANCE REPORT", { x: 48, y, size: 10, font: bold, color: maroon });
      y -= 30;
      page.drawText(activeBrand.name, { x: 48, y, size: 24, font: bold, color: dark });
      y -= 18;
      page.drawText(`${defaultInstagramMetrics.period} · Snapshot updated ${defaultInstagramMetrics.updatedAt}`, { x: 48, y, size: 9, font: regular, color: muted });
      y -= 36;

      const metrics = [
        ["Views", fmt(defaultInstagramMetrics.views)],
        ["Reach", fmt(defaultInstagramMetrics.reach)],
        ["Interactions", fmt(defaultInstagramMetrics.interactions)],
        ["Profile visits", fmt(defaultInstagramMetrics.profileVisits)],
        ["Link taps", fmt(defaultInstagramMetrics.linkTaps)],
        ["Followers", fmt(defaultInstagramMetrics.followers)],
      ];
      metrics.forEach(([label,value], index) => {
        const x = 48 + (index % 3) * 245;
        const rowY = y - Math.floor(index / 3) * 58;
        page.drawText(label, { x, y: rowY, size: 8, font: regular, color: muted });
        page.drawText(value, { x, y: rowY - 20, size: 18, font: bold, color: dark });
      });
      y -= 145;

      page.drawText("Performance interpretation", { x: 48, y, size: 12, font: bold, color: dark });
      y -= 22;
      const insights = [
        `Migrated post snapshot: ${fmt(report.totalReach)} total reach and ${report.avgEr.toFixed(1)}% average engagement rate by reach.`,
        `Best post by engagement rate: ${report.best.title}.`,
        `Largest content-view contribution: ${report.strongestFormat[0]} (${report.strongestFormat[1]}%).`,
        `Follower vs non-follower view share: ${defaultInstagramMetrics.followerViewShare}% / ${defaultInstagramMetrics.nonFollowerViewShare}%.`,
      ];
      insights.forEach((text) => { page.drawText(`• ${text}`, { x: 58, y, size: 9, font: regular, color: dark, maxWidth: width - 110 }); y -= 18; });
      y -= 10;
      page.drawText("30-day action calendar", { x: 48, y, size: 12, font: bold, color: dark });
      y -= 22;
      actions.forEach((item) => {
        page.drawText(item.window, { x: 58, y, size: 9, font: bold, color: maroon });
        page.drawText(item.action, { x: 125, y, size: 8.5, font: regular, color: dark, maxWidth: width - 180 });
        y -= 21;
      });
      page.drawText("Data note: this report uses migrated dashboard snapshots and brand-scoped workspace data; it is not presented as a live Instagram API feed.", { x: 48, y: 32, size: 7.5, font: regular, color: muted, maxWidth: width - 96 });

      const bytes = await pdf.save();
      const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
      const blob = new Blob([arrayBuffer], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${toSlug(activeBrand.name) || "brand"}-social-media-report.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } finally {
      setGenerating(false);
    }
  }

  return <section className="dashboard-module reports-module">
    <div className="feature-head"><div><p className="eyebrow">REPORTING</p><h2>Instagram Performance Report</h2><p>Generate a brand-scoped performance summary and 30-day action calendar from the migrated social media snapshot.</p></div><button className="primary report-download" onClick={downloadPdf} disabled={generating}><Download size={15}/>{generating?"Generating…":"Export PDF"}</button></div>
    <div className="source-note warning">Report source: migrated dashboard snapshot. Live Instagram API data is not connected yet.</div>
    <div className="report-metric-grid">
      {[['Views',fmt(defaultInstagramMetrics.views)],['Reach',fmt(defaultInstagramMetrics.reach)],['Interactions',fmt(defaultInstagramMetrics.interactions)],['Profile visits',fmt(defaultInstagramMetrics.profileVisits)],['Link taps',fmt(defaultInstagramMetrics.linkTaps)],['Followers',fmt(defaultInstagramMetrics.followers)]].map(([label,value])=><div className="social-subcard" key={label}><span>{label}</span><strong>{value}</strong></div>)}
    </div>
    <div className="report-grid">
      <div className="social-subcard"><div className="panel-head"><div><h2>Performance Summary</h2><p>Current snapshot interpretation</p></div><FileText size={18}/></div><div className="report-insights"><p><b>{report.avgEr.toFixed(1)}%</b> average engagement rate by reach across the migrated content sample.</p><p><b>{report.best.title}</b> is the strongest post by engagement rate.</p><p><b>{report.strongestFormat[0]}</b> contributes {report.strongestFormat[1]}% of current content views.</p><p>Non-followers account for <b>{defaultInstagramMetrics.nonFollowerViewShare}%</b> of snapshot views, indicating discovery beyond the follower base.</p></div></div>
      <div className="social-subcard"><div className="panel-head"><div><h2>Benchmark Context</h2><p>Follower scale from migrated competitor snapshot</p></div><Sparkles size={18}/></div><div className="report-benchmark">{instagramCompetitors.map(c=><div key={c.handle}><span>{c.name}</span><strong>{fmt(c.followers)}</strong></div>)}</div></div>
    </div>
    <div className="social-subcard report-actions"><div className="panel-head"><div><h2>30-Day Action Calendar</h2><p>Action sequence derived from currently available dashboard evidence</p></div></div>{actions.map(item=><div className="report-action-row" key={item.window}><span>{item.window}</span><div><strong>{item.action}</strong><p>{item.reason}</p></div></div>)}</div>
  </section>;
}
