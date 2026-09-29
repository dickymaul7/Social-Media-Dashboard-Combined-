"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Instagram, Search, Sparkles } from "lucide-react";
import type { AnalyticsMedia } from "@/lib/social-dashboard/csv-import";
import { useActiveBrand } from "@/components/active-brand";
import { buildPerformancePdf } from "@/lib/social-dashboard/performance-pdf";
import type {
  PerformanceAnalysis,
  PerformanceAnalysisInput,
} from "@/lib/social-dashboard/performance-analysis";
import { MetaCsvUpload } from "./meta-csv-upload";
import { useMetaAnalytics } from "./use-meta-analytics";

const fmt = new Intl.NumberFormat("id-ID");
const decimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });
const dayOrder = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

type RangeValue = "7" | "30" | "90" | "all";
type SeriesPoint = { label: string; value: number };

const rangeLabels: Record<RangeValue, string> = {
  "7": "7 hari terakhir",
  "30": "30 hari terakhir",
  "90": "90 hari terakhir",
  all: "semua data",
};

function toSlug(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function mediaDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(value?: string | null) {
  const date = mediaDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function displayDate(value?: string | null) {
  const date = mediaDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function contentType(media: AnalyticsMedia) {
  const raw =
    `${media.media_product_type || ""} ${media.media_type || ""}`.toUpperCase();
  if (raw.includes("REEL")) return "REELS";
  if (raw.includes("CAROUSEL")) return "CAROUSEL";
  if (raw.includes("STORY")) return "STORY";
  if (raw.includes("VIDEO")) return "VIDEO";
  if (raw.includes("TIMESERIES")) return "DATA";
  return "FEED";
}

function wibHour(value?: string | null) {
  const date = mediaDate(value);
  if (!date) return null;
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Jakarta",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
  );
}

function wibDay(value?: string | null) {
  const date = mediaDate(value);
  if (!date) return null;
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    weekday: "short",
  }).format(date);
  return (
    (
      {
        Mon: "Sen",
        Tue: "Sel",
        Wed: "Rab",
        Thu: "Kam",
        Fri: "Jum",
        Sat: "Sab",
        Sun: "Min",
      } as Record<string, string>
    )[short] || null
  );
}

function instagramEmbedUrl(permalink?: string | null) {
  if (!permalink) return null;
  try {
    const url = new URL(permalink);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    if (hostname !== "instagram.com" || !/^\/(p|reel|tv)\//.test(url.pathname))
      return null;
    const pathname = url.pathname.replace(/\/(embed)?\/?$/, "/");
    return `https://www.instagram.com${pathname}embed/`;
  } catch {
    return null;
  }
}

function MiniLineChart({
  points,
  color,
}: {
  points: SeriesPoint[];
  color: string;
}) {
  const max = Math.max(1, ...points.map((point) => point.value));
  const coordinates = points.map((point, index) => {
    const x = points.length <= 1 ? 50 : (index / (points.length - 1)) * 100;
    const y = 92 - (point.value / max) * 78;
    return `${x},${y}`;
  });
  return (
    <div className="ig-line-chart">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        role="img"
        aria-label="Grafik tren"
      >
        <line x1="0" y1="92" x2="100" y2="92" className="grid-line" />
        <line x1="0" y1="53" x2="100" y2="53" className="grid-line" />
        <line x1="0" y1="14" x2="100" y2="14" className="grid-line" />
        {coordinates.length > 1 && (
          <polyline
            points={coordinates.join(" ")}
            fill="none"
            stroke={color}
            strokeWidth="2.2"
            vectorEffect="non-scaling-stroke"
          />
        )}
        {coordinates.map((point, index) => {
          const [cx, cy] = point.split(",");
          return (
            <circle
              key={`${cx}-${index}`}
              cx={cx}
              cy={cy}
              r="1.8"
              fill={color}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="ig-chart-axis">
        {points.slice(0, 6).map((point) => (
          <span key={point.label}>{point.label.slice(5)}</span>
        ))}
      </div>
      {!points.length && (
        <p className="ig-empty-copy">Tanggal publikasi belum tersedia.</p>
      )}
    </div>
  );
}

function SearchBox({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="ig-search">
      <Search size={14} />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Filter tabel…"
      />
    </label>
  );
}

function PostTable({
  posts,
  username,
}: {
  posts: AnalyticsMedia[];
  username: string;
}) {
  return (
    <div className="ig-table-wrap ig-post-table">
      <table className="ig-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Akun</th>
            <th>Tipe</th>
            <th>Likes</th>
            <th>Komentar</th>
            <th>Saves</th>
            <th>Shares</th>
            <th>Engagement</th>
            <th>Caption</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((item) => (
            <tr key={item.id}>
              <td>{displayDate(item.timestamp)}</td>
              <td>
                <b>{username}</b>
              </td>
              <td>
                <span className="type-pill">{contentType(item)}</span>
              </td>
              <td>{fmt.format(item.likes)}</td>
              <td>{fmt.format(item.comments)}</td>
              <td>{fmt.format(item.saved)}</td>
              <td>{fmt.format(item.shares)}</td>
              <td>
                <b>{fmt.format(item.interactions)}</b>
              </td>
              <td className="ig-caption-cell">
                {item.permalink ? (
                  <a href={item.permalink} target="_blank" rel="noreferrer">
                    {item.caption || "Buka konten Instagram"}
                  </a>
                ) : (
                  item.caption || "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!posts.length && (
        <p className="ig-empty-copy">
          Tidak ada post yang cocok dengan filter.
        </p>
      )}
    </div>
  );
}

async function exportPerformancePdf(
  input: PerformanceAnalysisInput,
  analysis: PerformanceAnalysis,
) {
  const dashboardUrl = `${window.location.origin}/?section=Content%20Performance`;
  const bytes = await buildPerformancePdf(input, analysis, dashboardUrl);
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/pdf" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${toSlug(input.brand) || "brand"}-instagram-performance-${new Date().toISOString().slice(0, 10)}.pdf`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ContentPerformance() {
  const { activeBrand } = useActiveBrand();
  const { data, loading, error, refresh, hasImportedCsv } = useMetaAnalytics();
  const [range, setRange] = useState<RangeValue>("30");
  const [topSearch, setTopSearch] = useState("");
  const [allSearch, setAllSearch] = useState("");
  const [analysis, setAnalysis] = useState<PerformanceAnalysis | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [analysisWarning, setAnalysisWarning] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const isCsv = data?.source.startsWith("CSV") || false;

  const filteredMedia = useMemo(() => {
    if (!data) return [];
    if (range === "all") return data.media;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(range));
    const dated = data.media.filter((item) => mediaDate(item.timestamp));
    if (!dated.length) return data.media;
    return data.media.filter((item) => {
      const date = mediaDate(item.timestamp);
      return date ? date >= cutoff : false;
    });
  }, [data, range]);

  const insight = useMemo(() => {
    const totals = filteredMedia.reduce(
      (acc, item) => {
        acc.reach += item.reach;
        acc.impressions += item.impressions || 0;
        acc.views += item.views;
        acc.interactions += item.interactions;
        acc.likes += item.likes;
        acc.comments += item.comments;
        acc.saved += item.saved;
        acc.shares += item.shares;
        acc.profileVisits += item.profile_visits || 0;
        acc.linkClicks += item.link_clicks || 0;
        return acc;
      },
      {
        reach: 0,
        impressions: 0,
        views: 0,
        interactions: 0,
        likes: 0,
        comments: 0,
        saved: 0,
        shares: 0,
        profileVisits: 0,
        linkClicks: 0,
      },
    );

    const followers = data?.account.followers_count || 0;
    const formats = new Map<
      string,
      { posts: number; likes: number; comments: number; engagement: number }
    >();
    const days = new Map<
      string,
      { posts: number; engagement: number; likes: number }
    >();
    const hours = new Map<number, { posts: number; engagement: number }>();
    const weekdays = new Map<string, { posts: number; engagement: number }>();
    const hashtags = new Map<string, { used: number; engagement: number }>();

    for (const item of filteredMedia) {
      const type = contentType(item);
      const format = formats.get(type) || {
        posts: 0,
        likes: 0,
        comments: 0,
        engagement: 0,
      };
      format.posts += 1;
      format.likes += item.likes;
      format.comments += item.comments;
      format.engagement += item.interactions;
      formats.set(type, format);

      const date = dateKey(item.timestamp);
      if (date) {
        const daily = days.get(date) || { posts: 0, engagement: 0, likes: 0 };
        daily.posts += 1;
        daily.engagement += item.interactions;
        daily.likes += item.likes;
        days.set(date, daily);
      }

      const hour = wibHour(item.timestamp);
      if (hour !== null) {
        const hourly = hours.get(hour) || { posts: 0, engagement: 0 };
        hourly.posts += 1;
        hourly.engagement += item.interactions;
        hours.set(hour, hourly);
      }

      const day = wibDay(item.timestamp);
      if (day) {
        const daily = weekdays.get(day) || { posts: 0, engagement: 0 };
        daily.posts += 1;
        daily.engagement += item.interactions;
        weekdays.set(day, daily);
      }

      const tags = new Set(
        (item.caption.match(/#[\p{L}\p{N}_]+/gu) || []).map((tag) =>
          tag.toLowerCase(),
        ),
      );
      for (const tag of tags) {
        const current = hashtags.get(tag) || { used: 0, engagement: 0 };
        current.used += 1;
        current.engagement += item.interactions;
        hashtags.set(tag, current);
      }
    }

    const sortedDays = [...days.entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const timestamps = filteredMedia
      .map((item) => mediaDate(item.timestamp)?.getTime())
      .filter((value): value is number => typeof value === "number");
    const spanWeeks =
      timestamps.length > 1
        ? Math.max(
            1,
            (Math.max(...timestamps) - Math.min(...timestamps)) / 604800000,
          )
        : 1;

    return {
      totals,
      followers,
      avgPerPost: filteredMedia.length
        ? totals.interactions / filteredMedia.length
        : 0,
      engagementPer100Followers: followers
        ? (totals.interactions / followers) * 100
        : 0,
      postsPerWeek: filteredMedia.length / spanWeeks,
      videoShare: filteredMedia.length
        ? (filteredMedia.filter((item) =>
            ["REELS", "VIDEO"].includes(contentType(item)),
          ).length /
            filteredMedia.length) *
          100
        : 0,
      formats: [...formats.entries()]
        .map(([type, value]) => ({
          type,
          ...value,
          average: value.posts ? value.engagement / value.posts : 0,
        }))
        .sort((a, b) => b.engagement - a.engagement),
      engagementSeries: sortedDays.map(([label, value]) => ({
        label,
        value: value.engagement,
      })),
      postSeries: sortedDays.map(([label, value]) => ({
        label,
        value: value.posts,
      })),
      likesSeries: sortedDays.map(([label, value]) => ({
        label,
        value: value.likes,
      })),
      hours: [...hours.entries()]
        .map(([hour, value]) => ({
          hour,
          ...value,
          average: value.posts ? value.engagement / value.posts : 0,
        }))
        .sort((a, b) => a.hour - b.hour),
      weekdays: dayOrder
        .map((day) => {
          const value = weekdays.get(day) || { posts: 0, engagement: 0 };
          return {
            day,
            ...value,
            average: value.posts ? value.engagement / value.posts : 0,
          };
        })
        .filter((item) => item.posts),
      hashtags: [...hashtags.entries()]
        .map(([tag, value]) => ({
          tag,
          ...value,
          average: value.used ? value.engagement / value.used : 0,
        }))
        .sort((a, b) => b.average - a.average)
        .slice(0, 30),
    };
  }, [data, filteredMedia]);

  const sortedPosts = useMemo(
    () => [...filteredMedia].sort((a, b) => b.interactions - a.interactions),
    [filteredMedia],
  );
  const filteredTopPosts = sortedPosts
    .filter((item) =>
      `${item.caption} ${contentType(item)}`
        .toLowerCase()
        .includes(topSearch.toLowerCase()),
    )
    .slice(0, 20);
  const filteredAllPosts = filteredMedia
    .filter((item) =>
      `${item.caption} ${contentType(item)}`
        .toLowerCase()
        .includes(allSearch.toLowerCase()),
    )
    .sort((a, b) =>
      String(b.timestamp || "").localeCompare(String(a.timestamp || "")),
    );
  const highlightedPost = sortedPosts[0] || null;
  const highlightedEmbedUrl = instagramEmbedUrl(highlightedPost?.permalink);
  const rawUsername = data?.account?.username?.trim() || "";
  const validUsername = /^[a-z0-9._]+$/i.test(rawUsername)
    ? rawUsername.replace(/^@/, "")
    : "";
  const accountName =
    data?.account?.name ||
    (!validUsername ? rawUsername : "") ||
    (validUsername ? `@${validUsername}` : "Akun Instagram");
  const hasFollowersGained =
    typeof data?.account?.followers_gained === "number";
  const activityBreakdown = data
    ? [
        { label: "Likes", value: insight.totals.likes },
        { label: "Comments", value: insight.totals.comments },
        { label: "Saves", value: insight.totals.saved },
        { label: "Shares", value: insight.totals.shares },
        ...(data.available_metrics?.includes("profile_visits")
          ? [{ label: "Profile visits", value: insight.totals.profileVisits }]
          : []),
        ...(data.available_metrics?.includes("link_clicks")
          ? [{ label: "Link clicks", value: insight.totals.linkClicks }]
          : []),
      ]
    : [];

  const analysisInput = useMemo<PerformanceAnalysisInput | null>(() => {
    if (!data) return null;
    return {
      brand: activeBrand.name,
      account: validUsername ? `@${validUsername}` : accountName,
      period: rangeLabels[range],
      source: data.source,
      syncedAt: data.synced_at,
      posts: filteredMedia.length,
      followers: insight.followers,
      totals: {
        ...insight.totals,
        saves: insight.totals.saved,
      },
      avgPerPost: insight.avgPerPost,
      engagementRateByReach: insight.totals.reach
        ? (insight.totals.interactions / insight.totals.reach) * 100
        : 0,
      engagementPer100Followers: insight.engagementPer100Followers,
      postsPerWeek: insight.postsPerWeek,
      videoShare: insight.videoShare,
      formats: insight.formats.slice(0, 8).map((item) => ({
        type: item.type,
        posts: item.posts,
        engagement: item.engagement,
        average: item.average,
      })),
      topPosts: sortedPosts.slice(0, 10).map((item) => ({
        caption: item.caption || "Konten Instagram",
        type: contentType(item),
        reach: item.reach,
        interactions: item.interactions,
        engagementRate: item.engagement_rate,
      })),
      bestHours: [...insight.hours]
        .sort((a, b) => b.average - a.average)
        .slice(0, 5)
        .map(({ hour, posts, average }) => ({ hour, posts, average })),
      bestDays: [...insight.weekdays]
        .sort((a, b) => b.average - a.average)
        .slice(0, 5)
        .map(({ day, posts, average }) => ({ day, posts, average })),
      hashtags: insight.hashtags.slice(0, 10).map(({ tag, used, average }) => ({ tag, used, average })),
      warnings: data.warnings || [],
    };
  }, [accountName, activeBrand.name, data, filteredMedia.length, insight, range, sortedPosts, validUsername]);

  useEffect(() => {
    setAnalysis(null);
    setAnalysisError("");
    setAnalysisWarning("");
  }, [activeBrand.id, data?.synced_at, range]);

  async function generateAnalysis() {
    if (!analysisInput) return null;
    setAnalyzing(true);
    setAnalysisError("");
    setAnalysisWarning("");
    try {
      const response = await fetch("/api/ai/content-performance-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: analysisInput }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.data) throw new Error(payload?.error || "Analisis performance gagal dibuat.");
      setAnalysis(payload.data as PerformanceAnalysis);
      setAnalysisWarning(String(payload.warning || ""));
      return payload.data as PerformanceAnalysis;
    } catch (analysisFailure) {
      setAnalysisError(analysisFailure instanceof Error ? analysisFailure.message : "Analisis performance gagal dibuat.");
      return null;
    } finally {
      setAnalyzing(false);
    }
  }

  async function downloadPdf() {
    if (!analysisInput) return;
    setExporting(true);
    setAnalysisError("");
    try {
      const currentAnalysis = analysis || (await generateAnalysis());
      if (!currentAnalysis) return;
      await exportPerformancePdf(analysisInput, currentAnalysis);
    } catch (pdfError) {
      setAnalysisError(pdfError instanceof Error ? pdfError.message : "PDF gagal dibuat.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="panel dashboard-module instagram-analytics">
      <div className="feature-head">
        <div>
          <p className="eyebrow">META INSIGHTS</p>
          <h2>Instagram Analytics</h2>
          <p>
            Analisis performa akun, konten, waktu tayang, dan hashtag dari Meta
            Graph API atau file ekspor Meta Business Suite.
          </p>
        </div>
        <div className="performance-actions">
          <select
            className="feature-select"
            value={range}
            onChange={(event) => setRange(event.target.value as RangeValue)}
            aria-label="Periode analitik"
          >
            <option value="7">7 Hari</option>
            <option value="30">30 Hari</option>
            <option value="90">90 Hari</option>
            <option value="all">Semua Data</option>
          </select>
          <button className="ghost performance-action" onClick={() => void generateAnalysis()} disabled={!data || analyzing || exporting}>
            <Sparkles size={14} />
            {analyzing ? "Menganalisis…" : analysis ? "Analisis Ulang" : "Analisis & Action Plan"}
          </button>
          <button className="primary performance-action" onClick={() => void downloadPdf()} disabled={!data || analyzing || exporting}>
            <Download size={14} />
            {exporting ? "Membuat PDF…" : "Export Interactive PDF"}
          </button>
        </div>
      </div>

      <MetaCsvUpload
        onImported={() => void refresh()}
        hasImport={hasImportedCsv}
      />
      {loading && (
        <div className="source-note">
          Mengambil data terbaru dari Meta Graph API…
        </div>
      )}
      {error && (
        <div className="source-note" style={{ color: "#a3152d" }}>
          {error}
        </div>
      )}
      {analysisError && <div className="source-note analysis-error">{analysisError}</div>}
      {analysisWarning && <div className="source-note warning">{analysisWarning}</div>}
      {data && (
        <div className="meta-account-card">
          <div className="meta-account-avatar">
            <Instagram size={22} />
          </div>
          <div className="meta-account-identity">
            <span>AKUN INSTAGRAM</span>
            <strong>{accountName}</strong>
            <small>
              {validUsername
                ? `@${validUsername}`
                : "Username tidak tersedia pada file CSV"}
            </small>
          </div>
          <div className="meta-account-stat">
            <span>{hasFollowersGained ? "Followers gained" : "Followers"}</span>
            <strong>
              {fmt.format(
                hasFollowersGained
                  ? data.account.followers_gained || 0
                  : data.account.followers_count || 0,
              )}
            </strong>
          </div>
          <div className="meta-account-stat">
            <span>
              {data.data_mode === "timeseries" ? "Data points" : "Content"}
            </span>
            <strong>{fmt.format(filteredMedia.length)}</strong>
          </div>
          <div className="meta-account-source">
            <span>{isCsv ? "CSV IMPORT" : "LIVE META"}</span>
            <strong>
              {data.source.replace("CSV Meta Business Suite · ", "")}
            </strong>
            <small>
              Sinkron {new Date(data.synced_at).toLocaleString("id-ID")}
            </small>
          </div>
        </div>
      )}
      {data?.warnings?.map((warning) => (
        <div className="source-note warning" key={warning}>
          {warning}
        </div>
      ))}
      {data && renderAnalytics()}
    </section>
  );

  function renderAnalytics() {
    return (
      <>
        <div className="ig-kpi-grid">
          <article>
            <span>Total post</span>
            <strong>{fmt.format(filteredMedia.length)}</strong>
            <small>{decimal.format(insight.postsPerWeek)} post/minggu</small>
          </article>
          <article>
            <span>Total engagement</span>
            <strong>{fmt.format(insight.totals.interactions)}</strong>
            <small>
              Likes {fmt.format(insight.totals.likes)} · Komentar{" "}
              {fmt.format(insight.totals.comments)}
            </small>
          </article>
          <article>
            <span>Rata-rata / post</span>
            <strong>{decimal.format(insight.avgPerPost)}</strong>
            <small>{decimal.format(insight.videoShare)}% konten video</small>
          </article>
          <article>
            <span>Engagement / 100 follower</span>
            <strong>{decimal.format(insight.engagementPer100Followers)}</strong>
            <small>{fmt.format(insight.followers)} total follower</small>
          </article>
        </div>
        {analysis && renderPerformanceAnalysis()}
        {renderSummaryTables()}
        <div className="ig-chart-grid">
          <article className="ig-card">
            <h3>Engagement Harian</h3>
            <MiniLineChart points={insight.engagementSeries} color="#b21f49" />
          </article>
          <article className="ig-card">
            <h3>Jumlah Post Harian</h3>
            <MiniLineChart points={insight.postSeries} color="#2367d1" />
          </article>
          <article className="ig-card">
            <h3>Likes Harian</h3>
            <MiniLineChart points={insight.likesSeries} color="#13846e" />
          </article>
        </div>
        {renderHighlights()}
        <article className="ig-card ig-wide-card">
          <div className="ig-card-head">
            <div>
              <h3>Top 20 Post</h3>
              <p>Diurutkan dari engagement tertinggi</p>
            </div>
            <SearchBox value={topSearch} onChange={setTopSearch} />
          </div>
          <PostTable
            posts={filteredTopPosts}
            username={validUsername || accountName}
          />
        </article>
        {renderTimingTables()}
        <article className="ig-card ig-wide-card">
          <div className="ig-card-head">
            <div>
              <h3>Hashtag Paling Efektif</h3>
              <p>30 hashtag teratas berdasarkan rata-rata engagement</p>
            </div>
          </div>
          <div className="ig-table-wrap">
            <table className="ig-table">
              <thead>
                <tr>
                  <th>Hashtag</th>
                  <th>Dipakai</th>
                  <th>Total Engagement</th>
                  <th>Rata2/Post</th>
                </tr>
              </thead>
              <tbody>
                {insight.hashtags.map((item) => (
                  <tr key={item.tag}>
                    <td>
                      <b>{item.tag}</b>
                    </td>
                    <td>{item.used}</td>
                    <td>{fmt.format(item.engagement)}</td>
                    <td>{decimal.format(item.average)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!insight.hashtags.length && (
              <p className="ig-empty-copy">
                Hashtag belum ditemukan pada caption yang tersedia.
              </p>
            )}
          </div>
        </article>
        <article className="ig-card ig-wide-card">
          <div className="ig-card-head">
            <div>
              <h3>Semua Post</h3>
              <p>
                {fmt.format(filteredAllPosts.length)} konten pada periode aktif
              </p>
            </div>
            <SearchBox value={allSearch} onChange={setAllSearch} />
          </div>
          <PostTable
            posts={filteredAllPosts}
            username={validUsername || accountName}
          />
        </article>
      </>
    );
  }

  function renderPerformanceAnalysis() {
    if (!analysis) return null;
    return (
      <article className="performance-analysis-card">
        <div className="performance-analysis-head">
          <div>
            <span className="analysis-label">PERFORMANCE ANALYSIS</span>
            <h3>Insight & Action Plan</h3>
            <p>
              Dibuat dari data {rangeLabels[range]} · {analysis.analysis_mode === "ai" ? "AI-assisted" : "analisis berbasis data"}
            </p>
          </div>
          <span className={`analysis-status status-${analysis.performance_status.toLowerCase().replace(/\s+/g, "-")}`}>
            {analysis.performance_status}
          </span>
        </div>
        <p className="analysis-summary">{analysis.executive_summary}</p>
        <div className="analysis-columns">
          <section>
            <h4>Temuan utama</h4>
            <div className="analysis-finding-list">
              {analysis.key_findings.map((finding, index) => (
                <div key={`${finding.title}-${index}`}>
                  <span>{index + 1}</span>
                  <div>
                    <strong>{finding.title}</strong>
                    <p>{finding.evidence}</p>
                    <small>{finding.meaning}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h4>Action plan 30 hari</h4>
            <div className="analysis-action-list">
              {analysis.action_plan.map((action, index) => (
                <div key={`${action.action}-${index}`}>
                  <div className="analysis-action-meta">
                    <span className={`priority-${action.priority.toLowerCase()}`}>{action.priority}</span>
                    <time>{action.timeline}</time>
                  </div>
                  <strong>{action.action}</strong>
                  <p>{action.rationale}</p>
                  <small>Ukuran sukses: {action.success_metric}</small>
                </div>
              ))}
            </div>
          </section>
        </div>
        {analysis.data_notes.length > 0 && (
          <details className="analysis-notes">
            <summary>Catatan kualitas data ({analysis.data_notes.length})</summary>
            <ul>
              {analysis.data_notes.map((note, index) => <li key={`${note}-${index}`}>{note}</li>)}
            </ul>
          </details>
        )}
      </article>
    );
  }

  function renderSummaryTables() {
    return (
      <div className="ig-two-grid">
        <article className="ig-card">
          <div className="ig-card-head">
            <div>
              <h3>Performa Akun Aktif</h3>
              <p>Ringkasan akun sesuai brand yang dipilih</p>
            </div>
          </div>
          <div className="ig-table-wrap">
            <table className="ig-table">
              <thead>
                <tr>
                  <th>Akun</th>
                  <th>Followers</th>
                  <th>Post</th>
                  <th>Likes</th>
                  <th>Komentar</th>
                  <th>Engagement</th>
                  <th>Rata2/Post</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <b>{validUsername ? `@${validUsername}` : accountName}</b>
                  </td>
                  <td>{fmt.format(insight.followers)}</td>
                  <td>{fmt.format(filteredMedia.length)}</td>
                  <td>{fmt.format(insight.totals.likes)}</td>
                  <td>{fmt.format(insight.totals.comments)}</td>
                  <td>{fmt.format(insight.totals.interactions)}</td>
                  <td>{decimal.format(insight.avgPerPost)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </article>
        <article className="ig-card">
          <div className="ig-card-head">
            <div>
              <h3>Performa per Tipe Konten</h3>
              <p>Perbandingan format berdasarkan engagement</p>
            </div>
          </div>
          <div className="ig-table-wrap">
            <table className="ig-table">
              <thead>
                <tr>
                  <th>Tipe</th>
                  <th>Post</th>
                  <th>% Post</th>
                  <th>Likes</th>
                  <th>Komentar</th>
                  <th>Engagement</th>
                  <th>Rata2/Post</th>
                </tr>
              </thead>
              <tbody>
                {insight.formats.map((item) => (
                  <tr key={item.type}>
                    <td>
                      <span className="type-pill">{item.type}</span>
                    </td>
                    <td>{item.posts}</td>
                    <td>
                      {filteredMedia.length
                        ? decimal.format(
                            (item.posts / filteredMedia.length) * 100,
                          )
                        : 0}
                      %
                    </td>
                    <td>{fmt.format(item.likes)}</td>
                    <td>{fmt.format(item.comments)}</td>
                    <td>{fmt.format(item.engagement)}</td>
                    <td>{decimal.format(item.average)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    );
  }

  function renderHighlights() {
    return (
      <div className="content-insight-grid">
        <article className="social-subcard">
          <div className="panel-head">
            <div>
              <h2>Activity breakdown</h2>
              <p>Breakdown performa dari data yang tersedia</p>
            </div>
          </div>
          {activityBreakdown.map((item) => {
            const max = Math.max(
              1,
              ...activityBreakdown.map((metric) => metric.value),
            );
            const width = Math.max(4, Math.round((item.value / max) * 100));
            return (
              <div className="progress-stat" key={item.label}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{fmt.format(item.value)}</span>
                </div>
                <div className="progress-track">
                  <i style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </article>
        <article className="social-subcard top-post-card">
          <div className="panel-head">
            <div>
              <h2>
                {data?.data_mode === "timeseries"
                  ? "Peak period"
                  : "Top content"}
              </h2>
              <p>
                {data?.data_mode === "timeseries"
                  ? "Periode dengan interaksi tertinggi"
                  : "Konten dengan interaksi tertinggi"}
              </p>
            </div>
            <span className="feature-badge">
              {isCsv ? "CSV Import" : "Live Meta"}
            </span>
          </div>
          {highlightedPost ? (
            <>
              <strong>
                {highlightedPost.caption?.trim().slice(0, 140) ||
                  "Instagram content"}
              </strong>
              {highlightedEmbedUrl && (
                <div className="instagram-preview">
                  <iframe
                    src={highlightedEmbedUrl}
                    title="Preview konten Instagram teratas"
                    loading="lazy"
                    allow="encrypted-media"
                  />
                </div>
              )}
              <div className="top-post-metrics">
                <span>
                  <b>{fmt.format(highlightedPost.reach)}</b> reach
                </span>
                <span>
                  <b>{fmt.format(highlightedPost.interactions)}</b> interactions
                </span>
                <span>
                  <b>{highlightedPost.engagement_rate.toFixed(1)}%</b> ER
                </span>
              </div>
              {highlightedPost.permalink && (
                <a
                  className="instagram-open-link"
                  href={highlightedPost.permalink}
                  target="_blank"
                  rel="noreferrer"
                >
                  Buka di Instagram →
                </a>
              )}
            </>
          ) : (
            <p>Belum ada media yang dikembalikan Meta.</p>
          )}
        </article>
      </div>
    );
  }

  function renderTimingTables() {
    return (
      <div className="ig-two-grid">
        <article className="ig-card">
          <div className="ig-card-head">
            <div>
              <h3>Waktu Tayang Terbaik — Jam (WIB)</h3>
              <p>Berdasarkan rata-rata engagement per post</p>
            </div>
          </div>
          <div className="ig-table-wrap">
            <table className="ig-table">
              <thead>
                <tr>
                  <th>Jam (WIB)</th>
                  <th>Post</th>
                  <th>Engagement</th>
                  <th>Rata2/Post</th>
                </tr>
              </thead>
              <tbody>
                {insight.hours.map((item) => (
                  <tr key={item.hour}>
                    <td>
                      <b>{String(item.hour).padStart(2, "0")}:00</b>
                    </td>
                    <td>{item.posts}</td>
                    <td>{fmt.format(item.engagement)}</td>
                    <td>{decimal.format(item.average)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!insight.hours.length && (
              <p className="ig-empty-copy">
                Jam publikasi belum tersedia pada sumber data.
              </p>
            )}
          </div>
        </article>
        <article className="ig-card">
          <div className="ig-card-head">
            <div>
              <h3>Waktu Tayang Terbaik — Hari</h3>
              <p>Berdasarkan zona waktu WIB</p>
            </div>
          </div>
          <div className="ig-table-wrap">
            <table className="ig-table">
              <thead>
                <tr>
                  <th>Hari</th>
                  <th>Post</th>
                  <th>Engagement</th>
                  <th>Rata2/Post</th>
                </tr>
              </thead>
              <tbody>
                {insight.weekdays.map((item) => (
                  <tr key={item.day}>
                    <td>
                      <b>{item.day}</b>
                    </td>
                    <td>{item.posts}</td>
                    <td>{fmt.format(item.engagement)}</td>
                    <td>{decimal.format(item.average)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!insight.weekdays.length && (
              <p className="ig-empty-copy">
                Hari publikasi belum tersedia pada sumber data.
              </p>
            )}
          </div>
        </article>
      </div>
    );
  }
}
