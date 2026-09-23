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
  if (!url || !anon) return { id: "local" };
  const token = getBearer(request);
  if (!token) return null;
  try {
    const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, Authorization: `Bearer ${token}` }, cache: "no-store" });
    return response.ok ? response.json().catch(() => null) : null;
  } catch {
    return null;
  }
}

function supabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    service: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function serviceHeaders() {
  const { service } = supabaseConfig();
  return { apikey: service, Authorization: `Bearer ${service}`, "Content-Type": "application/json" };
}

async function hasWorkspacePermission(request: Request, permission: string) {
  const { url, anon } = supabaseConfig();
  if (!url || !anon) return true;
  const token = getBearer(request);
  if (!token) return false;
  try {
    const response = await fetch(`${url}/rest/v1/rpc/smm_has_access_permission`, {
      method: "POST",
      headers: { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_permission_key: permission }),
      cache: "no-store",
    });
    return response.ok && Boolean(await response.json().catch(() => false));
  } catch { return false; }
}

async function canAccessBrand(actorId: string, brandId: string) {
  const { url, service } = supabaseConfig();
  if (!url || !service || actorId === "local") return true;
  const roleResponse = await fetch(`${url}/rest/v1/user_roles?select=roles(key)&user_id=eq.${encodeURIComponent(actorId)}&limit=1`, { headers: serviceHeaders(), cache: "no-store" });
  const roleRows = await roleResponse.json().catch(() => []);
  if (roleRows?.[0]?.roles?.key === "super_admin") return true;
  const accessResponse = await fetch(`${url}/rest/v1/user_brand_access?select=brand_id&user_id=eq.${encodeURIComponent(actorId)}&brand_id=eq.${encodeURIComponent(brandId)}&limit=1`, { headers: serviceHeaders(), cache: "no-store" });
  const accessRows = await accessResponse.json().catch(() => []);
  return accessResponse.ok && Array.isArray(accessRows) && accessRows.length > 0;
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

type BrandMetaConfig = { accountId: string; brandName: string };

function environmentAccountId(brandId: string) {
  try {
    const value = JSON.parse(process.env.META_BRAND_ACCOUNT_MAP || "{}") as Record<string, string>;
    return typeof value?.[brandId] === "string" ? value[brandId] : "";
  } catch { return ""; }
}

async function brandMetaConfig(brandId: string): Promise<BrandMetaConfig> {
  const fallback = { accountId: environmentAccountId(brandId), brandName: brandId };
  const { url, service } = supabaseConfig();
  if (!url || !service || !brandId) return fallback;
  const [brandResponse, guidelineResponse] = await Promise.all([
    fetch(`${url}/rest/v1/brands?select=id,name&id=eq.${encodeURIComponent(brandId)}&limit=1`, { headers: serviceHeaders(), cache: "no-store" }),
    fetch(`${url}/rest/v1/brand_guidelines?select=visual_guideline&brand_id=eq.${encodeURIComponent(brandId)}&limit=1`, { headers: serviceHeaders(), cache: "no-store" }),
  ]);
  const brands = await brandResponse.json().catch(() => []);
  const guidelines = await guidelineResponse.json().catch(() => []);
  const visual = guidelines?.[0]?.visual_guideline;
  const storedId = typeof visual?.meta_instagram?.id === "string" ? visual.meta_instagram.id : "";
  return { accountId: storedId || fallback.accountId, brandName: String(brands?.[0]?.name || brandId) };
}

async function saveBrandMetaAccount(brandId: string, account: MetaAccount) {
  const { url, service } = supabaseConfig();
  if (!url || !service) throw new Error("Penyimpanan konfigurasi brand belum tersedia.");
  const currentResponse = await fetch(`${url}/rest/v1/brand_guidelines?select=visual_guideline&brand_id=eq.${encodeURIComponent(brandId)}&limit=1`, { headers: serviceHeaders(), cache: "no-store" });
  const currentRows = await currentResponse.json().catch(() => []);
  const visual = currentRows?.[0]?.visual_guideline && typeof currentRows[0].visual_guideline === "object" ? currentRows[0].visual_guideline : {};
  const response = await fetch(`${url}/rest/v1/brand_guidelines?on_conflict=brand_id`, {
    method: "POST",
    headers: { ...serviceHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ brand_id: brandId, visual_guideline: { ...visual, meta_instagram: account }, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.message || "Akun Instagram gagal dipetakan ke brand.");
  }
}

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
  const mediaPayload = await metaGet(`/${igUserId}/media?fields=id,caption,media_type,media_product_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=100`, token);
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
  const actor = await validateWorkspaceSession(request);
  if (!actor?.id) return NextResponse.json({ error: "Session login tidak valid." }, { status: 401, headers: noStoreHeaders });
  try {
    const token = process.env.META_ACCESS_TOKEN || "";
    if (!token) return NextResponse.json({ error: "Token Meta pusat belum dikonfigurasi oleh administrator." }, { status: 503, headers: noStoreHeaders });
    const url = new URL(request.url);
    const brandId = url.searchParams.get("brandId")?.trim() || "";
    if (!brandId) return NextResponse.json({ error: "Brand aktif belum tersedia." }, { status: 400, headers: noStoreHeaders });
    if (!(await canAccessBrand(String(actor.id), brandId))) return NextResponse.json({ error: "Akun ini tidak memiliki akses ke brand tersebut." }, { status: 403, headers: noStoreHeaders });
    const connections = await discoverInstagramAccounts(token);
    const config = await brandMetaConfig(brandId);
    const normalizedBrand = config.brandName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const automatic = connections.find((account) => [account.username, account.name, account.pageName].some((value) => value.toLowerCase().replace(/[^a-z0-9]/g, "") === normalizedBrand));
    const connection = config.accountId ? connections.find((account) => account.id === config.accountId) : automatic || (connections.length === 1 ? connections[0] : undefined);
    if (!connection) return NextResponse.json({ error: `${config.brandName} belum dipetakan ke akun Instagram. Administrator perlu memilih akun satu kali pada panel Meta Insights.` }, { status: 409, headers: noStoreHeaders });
    const accountLabel = connection.username ? `@${connection.username}` : connection.name;
    return NextResponse.json(await loadAnalytics(connection.token, connection.id, `Meta Graph API · ${accountLabel}`), { headers: noStoreHeaders });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Gagal mengambil Meta analytics." }, { status: 502, headers: noStoreHeaders });
  }
}

export async function POST(request: Request) {
  const actor = await validateWorkspaceSession(request);
  if (!actor?.id) return NextResponse.json({ error: "Session login tidak valid." }, { status: 401, headers: noStoreHeaders });
  try {
    const body = await request.json().catch(() => ({}));
    if (!(await hasWorkspacePermission(request, "brand.edit"))) return NextResponse.json({ error: "Hanya administrator brand yang dapat mengubah koneksi Meta." }, { status: 403, headers: noStoreHeaders });
    const brandId = typeof body?.brandId === "string" ? body.brandId.trim() : "";
    if (!brandId || !(await canAccessBrand(String(actor.id), brandId))) return NextResponse.json({ error: "Brand tidak valid atau tidak dapat diakses." }, { status: 403, headers: noStoreHeaders });
    const token = process.env.META_ACCESS_TOKEN || "";
    if (!token) return NextResponse.json({ error: "Token Meta pusat belum dikonfigurasi oleh administrator." }, { status: 503, headers: noStoreHeaders });
    const connections = await discoverInstagramAccounts(token);
    if (body?.action === "accounts") {
      const config = await brandMetaConfig(brandId);
      const accounts: MetaAccount[] = connections.map(({ id, username, name, pageName }) => ({ id, username, name, pageName }));
      return NextResponse.json({ accounts, selectedAccountId: config.accountId }, { headers: noStoreHeaders });
    }
    if (body?.action !== "assign") return NextResponse.json({ error: "Aksi konfigurasi Meta tidak dikenali." }, { status: 400, headers: noStoreHeaders });
    const requestedId = typeof body?.igUserId === "string" ? body.igUserId.trim() : "";
    const connection = connections.find((account) => account.id === requestedId);
    if (!connection) return NextResponse.json({ error: "Akun Instagram yang dipilih tidak tersedia untuk token pusat." }, { status: 404, headers: noStoreHeaders });
    const account: MetaAccount = { id: connection.id, username: connection.username, name: connection.name, pageName: connection.pageName };
    await saveBrandMetaAccount(brandId, account);
    return NextResponse.json({ ok: true, account }, { headers: noStoreHeaders });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Konfigurasi Meta tidak dapat diproses." }, { status: 502, headers: noStoreHeaders });
  }
}
