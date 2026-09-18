"use client";

import { useMemo, useState } from "react";
import { MetaCsvUpload } from "./meta-csv-upload";
import { useMetaAnalytics } from "./use-meta-analytics";
import type { AnalyticsMedia as MetaMedia } from "@/lib/social-dashboard/csv-import";

const fmt = new Intl.NumberFormat("id-ID");

function formatType(item: MetaMedia) {
  if (item.media_product_type === "REELS" || item.media_type === "REELS" || item.media_type === "REEL") return "Reel";
  if (item.media_type === "CAROUSEL_ALBUM" || item.media_type === "CAROUSEL") return "Carousel";
  if (item.media_type === "VIDEO") return "Video";
  return "Image";
}

export function ContentPerformance() {
  const { data, loading, error, refresh, hasImportedCsv } = useMetaAnalytics();
  const [postFilter, setPostFilter] = useState("All");
  const isCsv = data?.source.startsWith("CSV") || false;

  const filteredPosts = useMemo(() => {
    if (!data) return [];
    return postFilter === "All" ? data.media : data.media.filter((post) => formatType(post) === postFilter);
  }, [data, postFilter]);

  const highlightedPost = useMemo(() => {
    if (!data?.media?.length) return null;
    return [...data.media].sort((a, b) => b.interactions - a.interactions)[0];
  }, [data]);

  return <section className="panel dashboard-module">
    <div className="feature-head">
      <div>
        <p className="eyebrow">META INSIGHTS</p>
        <h2>Content performance</h2>
        <p>Ringkasan performa konten Instagram dari Meta Graph API atau file ekspor Meta Business Suite.</p>
      </div>
      <select className="feature-select" value={postFilter} onChange={(e) => setPostFilter(e.target.value)}>
        <option>All</option><option>Reel</option><option>Carousel</option><option>Video</option><option>Image</option>
      </select>
    </div>

    <MetaCsvUpload onImported={() => void refresh()} hasImport={hasImportedCsv} />

    {loading && <div className="source-note">Mengambil data terbaru dari Meta Graph API…</div>}
    {error && <div className="source-note" style={{color:"#a3152d"}}>{error}</div>}
    {data && <div className="source-note">Sumber: {data.source} · @{data.account?.username || "instagram"} · Sinkron terakhir {new Date(data.synced_at).toLocaleString("id-ID")}</div>}
    {data?.warnings?.map((warning) => <div className="source-note warning" key={warning}>{warning}</div>)}

    {data && <>
      <div className="audience-summary">
        <div><span>Reach</span><strong>{fmt.format(data.summary.reach)}</strong></div>
        <div><span>{isCsv ? "Impressions" : "Views"}</span><strong>{fmt.format(isCsv ? data.summary.impressions || 0 : data.summary.views)}</strong></div>
        <div><span>Engagement</span><strong>{fmt.format(data.summary.interactions)}</strong></div>
        <div><span>Content</span><strong>{fmt.format(data.media.length)}</strong></div>
      </div>

      <div className="content-insight-grid">
        <article className="social-subcard">
          <div className="panel-head"><div><h2>Interactions</h2><p>Breakdown performa konten terbaru</p></div></div>
          {[{label:"Likes",value:data.summary.likes},{label:"Comments",value:data.summary.comments},{label:"Saves",value:data.summary.saved},{label:"Shares",value:data.summary.shares}].map((item) => {
            const max = Math.max(1, data.summary.likes, data.summary.comments, data.summary.saved, data.summary.shares);
            const width = Math.max(4, Math.round((item.value / max) * 100));
            return <div className="progress-stat" key={item.label}><div><strong>{item.label}</strong><span>{fmt.format(item.value)}</span></div><div className="progress-track"><i style={{width:`${width}%`}}/></div></div>;
          })}
        </article>

        <article className="social-subcard top-post-card">
          <div className="panel-head"><div><h2>Top content</h2><p>Konten dengan interaksi tertinggi</p></div><span className="feature-badge">{data.source.startsWith("CSV") ? "CSV Import" : "Live Meta"}</span></div>
          {highlightedPost ? <>
            <strong>{highlightedPost.caption?.trim().slice(0,140) || "Instagram content"}</strong>
            <div className="top-post-metrics">
              <span><b>{fmt.format(highlightedPost.reach)}</b> reach</span>
              <span><b>{fmt.format(highlightedPost.interactions)}</b> interactions</span>
              <span><b>{highlightedPost.engagement_rate.toFixed(1)}%</b> ER</span>
            </div>
            {highlightedPost.permalink && <a href={highlightedPost.permalink} target="_blank" rel="noreferrer">Buka di Instagram →</a>}
          </> : <p>Belum ada media yang dikembalikan Meta.</p>}
        </article>
      </div>

      <div className="social-table-wrap"><table className="social-table"><thead><tr><th>Konten</th><th>Format</th><th>Reach</th><th>{isCsv ? "Impressions" : "Views"}</th><th>Engagement</th><th>ER / reach</th></tr></thead><tbody>
        {filteredPosts.map((post) => <tr key={post.id}>
          <td><strong>{post.caption?.trim().slice(0,90) || "Instagram content"}</strong><small>{post.timestamp ? new Date(post.timestamp).toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}) : "-"}</small></td>
          <td><span className={`content-type ${formatType(post).toLowerCase()}`}>{formatType(post)}</span></td>
          <td>{fmt.format(post.reach)}</td>
          <td>{fmt.format(isCsv ? post.impressions || 0 : post.views)}</td>
          <td>{fmt.format(post.interactions)}</td>
          <td>{post.engagement_rate.toFixed(1)}%</td>
        </tr>)}
      </tbody></table></div>
    </>}
  </section>;
}
