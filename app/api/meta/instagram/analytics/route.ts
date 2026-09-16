import { NextResponse } from "next/server";

const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;

async function metaGet(path: string, token: string) {
  const joiner = path.includes("?") ? "&" : "?";
  const res = await fetch(`${graphBase}${path}${joiner}access_token=${encodeURIComponent(token)}`, {
    cache: "no-store",
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error?.message || `Meta request failed (${res.status})`);
  return payload;
}

async function metricValue(mediaId: string, metric: string, token: string) {
  try {
    const payload = await metaGet(`/${mediaId}/insights?metric=${encodeURIComponent(metric)}`, token);
    const row = Array.isArray(payload?.data) ? payload.data[0] : null;
    const raw = row?.values?.[0]?.value ?? row?.value ?? 0;
    return typeof raw === "number" ? raw : Number(raw || 0);
  } catch {
    return 0;
  }
}

export async function GET() {
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

    const media = await Promise.all(
      (Array.isArray(mediaPayload?.data) ? mediaPayload.data : []).map(async (item: any) => {
        const [reach, saved, shares, views, totalInteractions] = await Promise.all([
          metricValue(item.id, "reach", token),
          metricValue(item.id, "saved", token),
          metricValue(item.id, "shares", token),
          metricValue(item.id, "views", token),
          metricValue(item.id, "total_interactions", token),
        ]);
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
