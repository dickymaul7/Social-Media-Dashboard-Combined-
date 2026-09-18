"use client";

import { useMemo } from "react";
import { MetaCsvUpload } from "./meta-csv-upload";
import { useMetaAnalytics } from "./use-meta-analytics";

const fmt = new Intl.NumberFormat("id-ID");

export function AudienceAnalytics() {
  const { data, loading, error, refresh, hasImportedCsv } = useMetaAnalytics();
  const hasFollowersGained = typeof data?.account?.followers_gained === "number";
  const useImpressions = Boolean(data?.source.startsWith("CSV") && data.available_metrics?.includes("impressions"));

  const avgReach = useMemo(() => {
    if (!data?.media?.length) return 0;
    return Math.round(data.summary.reach / data.media.length);
  }, [data]);

  const avgInteractions = useMemo(() => {
    if (!data?.media?.length) return 0;
    return Math.round(data.summary.interactions / data.media.length);
  }, [data]);

  return <section className="panel dashboard-module">
    <div className="feature-head">
      <div>
        <p className="eyebrow">META INSIGHTS</p>
        <h2>Audience analytics</h2>
        <p>Overview akun dan performa audiens dengan susunan ringkas yang mengikuti pola Meta Business Suite.</p>
      </div>
      {data && <span className="feature-badge">{data.source.startsWith("CSV") ? "CSV Import" : "Live Meta"}</span>}
    </div>

    <MetaCsvUpload onImported={() => void refresh()} hasImport={hasImportedCsv} />

    {loading && <div className="source-note">Mengambil data terbaru dari Meta Graph API…</div>}
    {error && <div className="source-note" style={{color:"#a3152d"}}>{error}</div>}
    {data && <div className="source-note">Sumber: {data.source} · @{data.account?.username || "instagram"} · Sinkron terakhir {new Date(data.synced_at).toLocaleString("id-ID")}</div>}
    {data?.warnings?.map((warning) => <div className="source-note warning" key={warning}>{warning}</div>)}

    {data && <>
      <div className="audience-summary">
        <div><span>{hasFollowersGained ? "Followers gained" : "Followers"}</span><strong>{fmt.format(hasFollowersGained ? data.account.followers_gained || 0 : data.account?.followers_count || 0)}</strong></div>
        <div><span>Total reach</span><strong>{fmt.format(data.summary.reach)}</strong></div>
        <div><span>Total engagement</span><strong>{fmt.format(data.summary.interactions)}</strong></div>
        <div><span>{useImpressions ? "Impressions" : "Views"}</span><strong>{fmt.format(useImpressions ? data.summary.impressions || 0 : data.summary.views || 0)}</strong></div>
      </div>

      <div className="audience-grid">
        <article className="social-subcard">
          <div className="panel-head"><div><h2>Account overview</h2><p>Ringkasan akun Instagram</p></div></div>
          <div className="location-row"><span>Username</span><strong>@{data.account?.username || "-"}</strong></div>
          <div className="location-row"><span>Nama akun</span><strong>{data.account?.name || "-"}</strong></div>
          <div className="location-row"><span>{hasFollowersGained ? "Followers gained" : "Followers"}</span><strong>{fmt.format(hasFollowersGained ? data.account.followers_gained || 0 : data.account?.followers_count || 0)}</strong></div>
          <div className="location-row"><span>{data.data_mode === "timeseries" ? "Data points" : "Media published"}</span><strong>{fmt.format(data.account?.media_count || 0)}</strong></div>
          {data.available_metrics?.includes("profile_visits") && <div className="location-row"><span>Profile visits</span><strong>{fmt.format(data.summary.profile_visits || 0)}</strong></div>}
          {data.available_metrics?.includes("link_clicks") && <div className="location-row"><span>Link clicks</span><strong>{fmt.format(data.summary.link_clicks || 0)}</strong></div>}
        </article>

        <article className="social-subcard">
          <div className="panel-head"><div><h2>Content averages</h2><p>Rata-rata dari konten terbaru yang tersedia</p></div></div>
          <div className="location-row"><span>Average reach</span><strong>{fmt.format(avgReach)}</strong></div>
          <div className="location-row"><span>Average interactions</span><strong>{fmt.format(avgInteractions)}</strong></div>
          <div className="location-row"><span>Total likes</span><strong>{fmt.format(data.summary.likes)}</strong></div>
          <div className="location-row"><span>Total comments</span><strong>{fmt.format(data.summary.comments)}</strong></div>
        </article>

        <article className="social-subcard">
          <div className="panel-head"><div><h2>Audience demographics</h2><p>Usia, gender, dan lokasi</p></div></div>
          <p style={{lineHeight:1.6}}>Meta memerlukan endpoint audience demographic khusus dan eligibility data tertentu untuk age, gender, serta top locations. Bagian ini sengaja tidak memakai data dummy. Setelah akun target mengembalikan demographic insights, data akan kita aktifkan di sini.</p>
        </article>
      </div>
    </>}
  </section>;
}
