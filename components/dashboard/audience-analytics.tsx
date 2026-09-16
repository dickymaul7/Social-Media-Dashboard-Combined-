"use client";

import { useEffect, useMemo, useState } from "react";

const fmt = new Intl.NumberFormat("id-ID");

type MetaPayload = {
  source: string;
  synced_at: string;
  account: {
    username?: string;
    name?: string;
    followers_count?: number;
    media_count?: number;
    profile_picture_url?: string;
  };
  summary: {
    reach: number;
    views: number;
    interactions: number;
    likes: number;
    comments: number;
    saved: number;
    shares: number;
  };
  media: Array<{
    timestamp?: string | null;
    reach: number;
    views: number;
    interactions: number;
  }>;
};

export function AudienceAnalytics() {
  const [data, setData] = useState<MetaPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/meta/instagram/analytics", { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload?.error || "Gagal memuat Meta analytics.");
        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Gagal memuat Meta analytics.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
      {data && <span className="feature-badge">Live Meta</span>}
    </div>

    {loading && <div className="source-note">Mengambil data terbaru dari Meta Graph API…</div>}
    {error && <div className="source-note" style={{color:"#a3152d"}}>{error}</div>}
    {data && <div className="source-note">Sumber: {data.source} · @{data.account?.username || "instagram"} · Sinkron terakhir {new Date(data.synced_at).toLocaleString("id-ID")}</div>}

    {data && <>
      <div className="audience-summary">
        <div><span>Followers</span><strong>{fmt.format(data.account?.followers_count || 0)}</strong></div>
        <div><span>Total content</span><strong>{fmt.format(data.account?.media_count || 0)}</strong></div>
        <div><span>Reach konten terbaru</span><strong>{fmt.format(data.summary.reach)}</strong></div>
        <div><span>Views konten terbaru</span><strong>{fmt.format(data.summary.views)}</strong></div>
      </div>

      <div className="audience-grid">
        <article className="social-subcard">
          <div className="panel-head"><div><h2>Account overview</h2><p>Ringkasan akun Instagram</p></div></div>
          <div className="location-row"><span>Username</span><strong>@{data.account?.username || "-"}</strong></div>
          <div className="location-row"><span>Nama akun</span><strong>{data.account?.name || "-"}</strong></div>
          <div className="location-row"><span>Followers</span><strong>{fmt.format(data.account?.followers_count || 0)}</strong></div>
          <div className="location-row"><span>Media published</span><strong>{fmt.format(data.account?.media_count || 0)}</strong></div>
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
