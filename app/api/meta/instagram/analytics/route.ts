import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;

function getBearer(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

async function validateWorkspaceSession(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return true;
  const token = getBearer(request);
  if (!token) return false;
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function metaGet(path: string, token: string) {
  const joiner = path.includes("?") ? "&" : "?";
  const res = await fetch(`${graphBase}${path}${joiner}access_token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error?.message || `Meta request failed (${res.status})`);
  return payload;
}

const mediaMetrics = ["reach", "saved", "shares", "views", "total_interactions"] as const;

async function metricValues(mediaId: string, token: string) {
  const payload = await metaGet(
    `/${mediaId}/insights?metric=${encodeURIComponent(mediaMetrics.join(","))}`,
    token
  );
  const values: Record<string, number> = {};
  for (const row of Array.isArray(payload?.data) ? payload.data : []) {
    const raw = row?.values?.[0]?.value ?? row?.value ?? 0;
    const value = typeof raw === "number" ? raw : Number(raw || 0);
    values[String(row?.name || "")] = Number.isFinite(value) ? value : 0;
  }
  return values;
}

export async function GET(request: Request) {
  if (!(await validateWorkspaceSession(request))) {
    return NextResponse.json({ error: "Session login tidak valid." }, { status: 401 });
  }
  try {
    const token = process.env.META_ACCESS_TOKEN || "";
    const igUserId = process.env.META_IG_USER_ID || "";
    if (!token || !igUserId) {
      return NextResponse.json(
        {
          error: "Meta Analytics belum dikonfigurasi.",
          required_env: ["META_ACCESS_TOKEN", "META_IG_USER_ID"],
        },
        { status: 503 }
      );
    }

    const account = await metaGet(
      `/${igUserId}?fields=id,username,name,profile_picture_url,followers_count,media_count`,
      token
    );

    const mediaPayload = await metaGet(
      `/${igUserId}/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25`,
      token
    );

    let failedInsightItems = 0;
    const media = await Promise.all(
      (Array.isArray(mediaPayload?.data) ? mediaPayload.data : []).map(async (item: any) => {
        let insights: Record<string, number> = {};
        try {
          insights = await metricValues(item.id, token);
        } catch {
          failedInsightItems += 1;
        }
        const reach = insights.reach || 0;
        const saved = insights.saved || 0;
        const shares = insights.shares || 0;
        const views = insights.views || 0;
        const totalInteractions = insights.total_interactions || 0;
        const likes = Number(item.like_count || 0);
        const comments = Number(item.comments_count || 0);
        const interactions = totalInteractions || likes + comments + saved + shares;
        return {
          id: item.id,
          caption: String(item.caption || ""),
          media_type: item.media_type || "UNKNOWN",
          media_product_type: item.media_product_type || null,
          media_url: item.media_url || null,
          thumbnail_url: item.thumbnail_url || null,
          permalink: item.permalink || null,
          timestamp: item.timestamp || null,
          likes,
          comments,
          reach,
          saved,
          shares,
          views,
          interactions,
          engagement_rate: reach > 0 ? (interactions / reach) * 100 : 0,
        };
      })
    );

    const summary = media.reduce(
      (acc: any, item: any) => {
        acc.reach += item.reach;
        acc.views += item.views;
        acc.interactions += item.interactions;
        acc.likes += item.likes;
        acc.comments += item.comments;
        acc.saved += item.saved;
        acc.shares += item.shares;
        return acc;
      },
      { reach: 0, views: 0, interactions: 0, likes: 0, comments: 0, saved: 0, shares: 0 }
    );

    return NextResponse.json({
      source: "Meta Graph API",
      graph_version: graphVersion,
      synced_at: new Date().toISOString(),
      warnings: failedInsightItems
        ? [`Insights tidak tersedia untuk ${failedInsightItems} dari ${media.length} konten. Angka pada konten tersebut ditandai sebagai 0.`]
        : [],
      account,
      summary,
      media,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Gagal mengambil Meta analytics." },
      { status: 502 }
    );
  }
}
