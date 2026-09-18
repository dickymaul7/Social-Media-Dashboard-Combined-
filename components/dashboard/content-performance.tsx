"use client";

import { useMemo } from "react";
import { Instagram } from "lucide-react";
import { MetaCsvUpload } from "./meta-csv-upload";
import { useMetaAnalytics } from "./use-meta-analytics";

const fmt = new Intl.NumberFormat("id-ID");

function instagramEmbedUrl(permalink?: string | null) {
  if (!permalink) return null;
  try {
    const url = new URL(permalink);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname !== "instagram.com" || !/^\/(p|reel|tv)\//.test(url.pathname)) return null;
    const pathname = url.pathname.replace(/\/(embed)?\/?$/, "/");
    return `https://www.instagram.com${pathname}embed/`;
  } catch {
    return null;
  }
}

export function ContentPerformance() {
  const { data, loading, error, refresh, hasImportedCsv } = useMetaAnalytics();
  const isCsv = data?.source.startsWith("CSV") || false;
  const useImpressions = isCsv && Boolean(data?.available_metrics?.includes("impressions"));

  const highlightedPost = useMemo(() => {
    if (!data?.media?.length) return null;
    return [...data.media].sort((a, b) => b.interactions - a.interactions)[0];
  }, [data]);

  const activityBreakdown = data ? [
    { label: "Likes", value: data.summary.likes },
    { label: "Comments", value: data.summary.comments },
    { label: "Saves", value: data.summary.saved },
    { label: "Shares", value: data.summary.shares },
    ...(data.available_metrics?.includes("profile_visits") ? [{ label: "Profile visits", value: data.summary.profile_visits || 0 }] : []),
    ...(data.available_metrics?.includes("link_clicks") ? [{ label: "Link clicks", value: data.summary.link_clicks || 0 }] : []),
  ] : [];
  const highlightedEmbedUrl = instagramEmbedUrl(highlightedPost?.permalink);
  const rawUsername = data?.account?.username?.trim() || "";
  const validUsername = /^[a-z0-9._]+$/i.test(rawUsername) ? rawUsername.replace(/^@/, "") : "";
  const accountName = data?.account?.name || (!validUsername ? rawUsername : "") || (validUsername ? `@${validUsername}` : "Akun Instagram");
  const hasFollowersGained = typeof data?.account?.followers_gained === "number";

  return <section className="panel dashboard-module">
    <div className="feature-head">
      <div>
        <p className="eyebrow">META INSIGHTS</p>
        <h2>Content performance</h2>
        <p>Ringkasan performa konten Instagram dari Meta Graph API atau file ekspor Meta Business Suite.</p>
      </div>
    </div>

    <MetaCsvUpload onImported={() => void refresh()} hasImport={hasImportedCsv} />

    {loading && <div className="source-note">Mengambil data terbaru dari Meta Graph API…</div>}
    {error && <div className="source-note" style={{color:"#a3152d"}}>{error}</div>}
    {data && <div className="meta-account-card">
      <div className="meta-account-avatar"><Instagram size={22} /></div>
      <div className="meta-account-identity">
        <span>AKUN INSTAGRAM</span>
        <strong>{accountName}</strong>
        <small>{validUsername ? `@${validUsername}` : "Username tidak tersedia pada file CSV"}</small>
      </div>
      <div className="meta-account-stat">
        <span>{hasFollowersGained ? "Followers gained" : "Followers"}</span>
        <strong>{fmt.format(hasFollowersGained ? data.account.followers_gained || 0 : data.account.followers_count || 0)}</strong>
      </div>
      <div className="meta-account-stat">
        <span>{data.data_mode === "timeseries" ? "Data points" : "Content"}</span>
        <strong>{fmt.format(data.media.length)}</strong>
      </div>
      <div className="meta-account-source">
        <span>{data.source.startsWith("CSV") ? "CSV IMPORT" : "LIVE META"}</span>
        <strong>{data.source.replace("CSV Meta Business Suite · ", "")}</strong>
        <small>Sinkron {new Date(data.synced_at).toLocaleString("id-ID")}</small>
      </div>
    </div>}
    {data?.warnings?.map((warning) => <div className="source-note warning" key={warning}>{warning}</div>)}

    {data && <>
      <div className="audience-summary">
        <div><span>Reach</span><strong>{fmt.format(data.summary.reach)}</strong></div>
        <div><span>{useImpressions ? "Impressions" : "Views"}</span><strong>{fmt.format(useImpressions ? data.summary.impressions || 0 : data.summary.views || 0)}</strong></div>
        <div><span>Engagement</span><strong>{fmt.format(data.summary.interactions)}</strong></div>
        <div><span>{data.data_mode === "timeseries" ? "Data points" : "Content"}</span><strong>{fmt.format(data.media.length)}</strong></div>
      </div>

      <div className="content-insight-grid">
        <article className="social-subcard">
          <div className="panel-head"><div><h2>Activity breakdown</h2><p>Breakdown performa dari data yang tersedia</p></div></div>
          {activityBreakdown.map((item) => {
            const max = Math.max(1, ...activityBreakdown.map((metric) => metric.value));
            const width = Math.max(4, Math.round((item.value / max) * 100));
            return <div className="progress-stat" key={item.label}><div><strong>{item.label}</strong><span>{fmt.format(item.value)}</span></div><div className="progress-track"><i style={{width:`${width}%`}}/></div></div>;
          })}
        </article>

        <article className="social-subcard top-post-card">
          <div className="panel-head"><div><h2>{data.data_mode === "timeseries" ? "Peak period" : "Top content"}</h2><p>{data.data_mode === "timeseries" ? "Periode dengan interaksi tertinggi" : "Konten dengan interaksi tertinggi"}</p></div><span className="feature-badge">{data.source.startsWith("CSV") ? "CSV Import" : "Live Meta"}</span></div>
          {highlightedPost ? <>
            <strong>{highlightedPost.caption?.trim().slice(0,140) || "Instagram content"}</strong>
            {highlightedEmbedUrl && <div className="instagram-preview">
              <iframe
                src={highlightedEmbedUrl}
                title="Preview konten Instagram teratas"
                loading="lazy"
                allow="encrypted-media"
              />
            </div>}
            <div className="top-post-metrics">
              <span><b>{fmt.format(highlightedPost.reach)}</b> reach</span>
              <span><b>{fmt.format(highlightedPost.interactions)}</b> interactions</span>
              <span><b>{highlightedPost.engagement_rate.toFixed(1)}%</b> ER</span>
            </div>
            {highlightedPost.permalink && <a className="instagram-open-link" href={highlightedPost.permalink} target="_blank" rel="noreferrer">Buka di Instagram →</a>}
          </> : <p>Belum ada media yang dikembalikan Meta.</p>}
        </article>
      </div>
    </>}
  </section>;
}
