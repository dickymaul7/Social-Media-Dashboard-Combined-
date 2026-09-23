import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;
const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

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
    const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, cache: "no-store" });
    return response.ok;
  } catch {
    return false;
  }
}

async function metaGet(path: string, token: string) {
  const res = await fetch(`${graphBase}${path}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(payload?.error?.message || `Meta request failed (${res.status})`);
  return payload;
}

type MetaAccount = {
  id: string;
  username: string;
  name: string;
  pageName: string;
};

type MetaConnection = MetaAccount & { token: string };

async function discoverInstagramAccounts(inputToken: string): Promise<MetaConnection[]> {
  try {
    const page = await metaGet("/me?fields=id,name,instagram_business_account{id,username,name}", inputToken);
    const instagram = page?.instagram_business_account;
    if (instagram?.id) return [{ id: String(instagram.id), username: String(instagram.username || ""), name: String(instagram.name || instagram.username || "Akun Instagram"), pageName: String(page.name || "Facebook Page"), token: inputToken }];
  } catch {
    // User access tokens do not always expose Page-only fields on /me.
  }
  const pages = await metaGet("/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=100", inputToken);
  const found: MetaConnection[] = (Array.isArray(pages?.data) ? pages.data : [])
    .filter((page: any) => page?.instagram_business_account?.id)
    .map((page: any) => ({
      id: String(page.instagram_business_account.id),
      username: String(page.instagram_business_account.username || ""),
      name: String(page.instagram_business_account.name || page.instagram_business_account.username || "Akun Instagram"),
      pageName: String(page.name || "Facebook Page"),
      token: String(page.access_token || inputToken),
    }));
  const connected = Array.from(new Map<string, MetaConnection>(found.map((account) => [account.id, account])).values());
  if (!connected.length) throw new Error("Token tidak menemukan akun Instagram Business/Creator yang terhubung ke Facebook Page.");
  return connected;
}

const mediaMetrics = ["reach", "saved", "shares", "views", "total_interactions"] as const;

async function metricValues(mediaId: string, token: string) {
  const payload = await metaGet(`/${mediaId}/insights?metric=${encodeURIComponent(mediaMetrics.join(","))}`, token);
  const values: Record<string, number> = {};
  for (const row of Array.isArray(payload?.data) ? payload.data : []) {
    const raw = row?.values?.[0]?.value ?? row?.value ?? 0;
    const value = typeof raw === "number" ? raw : Number(raw || 0);
    values[String(row?.name || "")] = Number.isFinite(value) ? value : 0;
  }
  return values;
}

async function loadAnalytics(token: string, igUserId: string, source: string) {
  const account = await metaGet(`/${igUserId}?fields=id,username,name,profile_picture_url,followers_count,media_count`, token);
  const mediaPayload = await metaGet(`/${igUserId}/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=25`, token);
  let failedInsightItems = 0;
  const media = await Promise.all((Array.isArray(mediaPayload?.data) ? mediaPayload.data : []).map(async (item: any) => {
    let insights: Record<string, number> = {};
    try { insights = await metricValues(item.id, token); } catch { failedInsightItems += 1; }
    const reach = insights.reach || 0;
    const saved = insights.saved || 0;
    const shares = insights.shares || 0;
    const views = insights.views || 0;
    const likes = Number(item.like_count || 0);
    const comments = Number(item.comments_count || 0);
    const interactions = insights.total_interactions || likes + comments + saved + shares;
    return { id: item.id, caption: String(item.caption || ""), media_type: item.media_type || "UNKNOWN", media_product_type: item.media_product_type || null, media_url: item.media_url || null, thumbnail_url: item.thumbnail_url || null, permalink: item.permalink || null, timestamp: item.timestamp || null, likes, comments, reach, saved, shares, views, interactions, engagement_rate: reach > 0 ? (interactions / reach) * 100 : 0 };
  }));
  const summary = media.reduce((acc: any, item: any) => {
    acc.reach += item.reach; acc.views += item.views; acc.interactions += item.interactions; acc.likes += item.likes; acc.comments += item.comments; acc.saved += item.saved; acc.shares += item.shares;
    return acc;
  }, { reach: 0, views: 0, interactions: 0, likes: 0, comments: 0, saved: 0, shares: 0 });
  return {
    source,
    graph_version: graphVersion,
    synced_at: new Date().toISOString(),
    warnings: failedInsightItems ? [`Insights tidak tersedia untuk ${failedInsightItems} dari ${media.length} konten. Angka pada konten tersebut ditandai sebagai 0.`] : [],
    account,
    summary,
    media,
  };
}

export async function GET(request: Request) {
  if (!(await validateWorkspaceSession(request))) return NextResponse.json({ error: "Session login tidak valid." }, { status: 401, headers: noStoreHeaders });
  try {
    const token = process.env.META_ACCESS_TOKEN || "";
    const igUserId = process.env.META_IG_USER_ID || "";
    if (!token || !igUserId) return NextResponse.json({ error: "Meta Analytics belum dikonfigurasi. Masukkan token pada kolom Live Meta atau gunakan CSV." }, { status: 503, headers: noStoreHeaders });
    return NextResponse.json(await loadAnalytics(token, igUserId, "Meta Graph API"), { headers: noStoreHeaders });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal mengambil Meta analytics." }, { status: 502, headers: noStoreHeaders });
  }
}

export async function POST(request: Request) {
  if (!(await validateWorkspaceSession(request))) return NextResponse.json({ error: "Session login tidak valid." }, { status: 401, headers: noStoreHeaders });
  try {
    const body = await request.json().catch(() => ({}));
    const inputToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
    if (!inputToken) return NextResponse.json({ error: "Meta Graph API token wajib diisi." }, { status: 400, headers: noStoreHeaders });
    if (inputToken.length > 4096) return NextResponse.json({ error: "Token terlalu panjang." }, { status: 400, headers: noStoreHeaders });
    const connections = await discoverInstagramAccounts(inputToken);
    if (body?.action === "accounts") {
      const accounts: MetaAccount[] = connections.map(({ id, username, name, pageName }) => ({ id, username, name, pageName }));
      return NextResponse.json({ accounts }, { headers: noStoreHeaders });
    }
    const requestedId = typeof body?.igUserId === "string" ? body.igUserId.trim() : "";
    if (!requestedId && connections.length > 1) return NextResponse.json({ error: "Pilih akun Instagram yang ingin ditampilkan terlebih dahulu." }, { status: 409, headers: noStoreHeaders });
    const connection = requestedId ? connections.find((account) => account.id === requestedId) : connections[0];
    if (!connection) return NextResponse.json({ error: "Akun Instagram yang dipilih tidak tersedia untuk token ini." }, { status: 404, headers: noStoreHeaders });
    const accountLabel = connection.username ? `@${connection.username}` : connection.name;
    return NextResponse.json(await loadAnalytics(connection.token, connection.id, `Meta Graph API · ${accountLabel}`), { headers: noStoreHeaders });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Token Meta tidak dapat digunakan." }, { status: 502, headers: noStoreHeaders });
  }
}
