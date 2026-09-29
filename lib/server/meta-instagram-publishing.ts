const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";
const graphBase = `https://graph.facebook.com/${graphVersion}`;

export type MetaPublishingAccount = {
  id: string;
  username: string;
  name: string;
  pageName: string;
  token: string;
};

type BrandMetaConfig = {
  accountId: string;
  brandName: string;
};

function supabaseConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    service: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  };
}

function serviceHeaders() {
  const { service } = supabaseConfig();
  return {
    apikey: service,
    Authorization: `Bearer ${service}`,
    "Content-Type": "application/json",
  };
}

async function metaRequest(path: string, token: string, init?: RequestInit) {
  const response = await fetch(`${graphBase}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Meta request failed (${response.status}).`);
  }
  return payload;
}

function normalizedTokenLabel(value: string) {
  return value
    .toUpperCase()
    .replace(/^META_ACCESS_TOKEN_?/, "")
    .replace(/[^A-Z0-9]/g, "");
}

function centralMetaTokens(preferredBrandName: string) {
  const tokens = [process.env.META_ACCESS_TOKEN || ""];
  const pooled = process.env.META_ACCESS_TOKENS || "";
  if (pooled) {
    try {
      const parsed = JSON.parse(pooled);
      if (Array.isArray(parsed)) tokens.push(...parsed.map(String));
      else tokens.push(pooled);
    } catch {
      tokens.push(...pooled.split(/[\n,]+/));
    }
  }

  const brandLabel = normalizedTokenLabel(preferredBrandName);
  const namedTokens = Object.entries(process.env).filter(
    ([key, value]) => key.toUpperCase().startsWith("META_ACCESS_TOKEN_") && Boolean(value),
  );
  const regularTokens = namedTokens.filter(([key]) => normalizedTokenLabel(key) !== brandLabel);
  const preferredTokens = namedTokens.filter(([key]) => normalizedTokenLabel(key) === brandLabel);
  tokens.push(
    ...regularTokens.map(([, value]) => value || ""),
    ...preferredTokens.map(([, value]) => value || ""),
  );
  return [...new Set(tokens.map((token) => token.trim()).filter(Boolean))];
}

function environmentAccountId(brandId: string) {
  try {
    const value = JSON.parse(process.env.META_BRAND_ACCOUNT_MAP || "{}") as Record<string, string>;
    return typeof value?.[brandId] === "string" ? value[brandId] : "";
  } catch {
    return "";
  }
}

export async function getBrandMetaConfig(brandId: string): Promise<BrandMetaConfig> {
  const fallback = { accountId: environmentAccountId(brandId), brandName: brandId };
  const { url, service } = supabaseConfig();
  if (!url || !service || !brandId) return fallback;

  const [brandResponse, guidelineResponse] = await Promise.all([
    fetch(`${url}/rest/v1/brands?select=id,name&id=eq.${encodeURIComponent(brandId)}&limit=1`, {
      headers: serviceHeaders(),
      cache: "no-store",
    }),
    fetch(
      `${url}/rest/v1/brand_guidelines?select=visual_guideline&brand_id=eq.${encodeURIComponent(brandId)}&limit=1`,
      { headers: serviceHeaders(), cache: "no-store" },
    ),
  ]);
  const brands = await brandResponse.json().catch(() => []);
  const guidelines = await guidelineResponse.json().catch(() => []);
  const visual = guidelines?.[0]?.visual_guideline;
  const storedId = typeof visual?.meta_instagram?.id === "string" ? visual.meta_instagram.id : "";
  return {
    accountId: storedId || fallback.accountId,
    brandName: String(brands?.[0]?.name || brandId),
  };
}

async function discoverInstagramAccounts(inputToken: string): Promise<MetaPublishingAccount[]> {
  try {
    const page = await metaRequest(
      "/me?fields=id,name,instagram_business_account{id,username,name}",
      inputToken,
    );
    const instagram = page?.instagram_business_account;
    if (instagram?.id) {
      return [{
        id: String(instagram.id),
        username: String(instagram.username || ""),
        name: String(instagram.name || instagram.username || "Akun Instagram"),
        pageName: String(page.name || "Facebook Page"),
        token: inputToken,
      }];
    }
  } catch {
    // A user token normally needs /me/accounts; a Page token can resolve directly.
  }

  const pages = await metaRequest(
    "/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&limit=100",
    inputToken,
  );
  const found: MetaPublishingAccount[] = (Array.isArray(pages?.data) ? pages.data : [])
    .filter((page: any) => page?.instagram_business_account?.id)
    .map((page: any) => ({
      id: String(page.instagram_business_account.id),
      username: String(page.instagram_business_account.username || ""),
      name: String(page.instagram_business_account.name || page.instagram_business_account.username || "Akun Instagram"),
      pageName: String(page.name || "Facebook Page"),
      token: String(page.access_token || inputToken),
    }));
  if (!found.length) {
    throw new Error("Token tidak menemukan akun Instagram Business/Creator yang terhubung ke Facebook Page.");
  }
  return Array.from(new Map(found.map((account) => [account.id, account])).values());
}

export function isProxsisAcademyBrand(brandName: string) {
  return brandName.toLowerCase().replace(/[^a-z0-9]+/g, "") === "proxsisacademy";
}

export async function resolvePublishingAccount(brandId: string) {
  const config = await getBrandMetaConfig(brandId);
  if (!isProxsisAcademyBrand(config.brandName)) {
    throw new Error("Meta Direct masih dalam tahap pilot dan saat ini hanya aktif untuk Proxsis Academy.");
  }
  if (!config.accountId) {
    throw new Error("Akun Instagram Proxsis Academy belum dipetakan pada konfigurasi Meta Insights.");
  }

  const tokens = centralMetaTokens(config.brandName);
  if (!tokens.length) {
    throw new Error("Token Meta Proxsis Academy belum dikonfigurasi di environment Vercel.");
  }
  const results = await Promise.allSettled(tokens.map(discoverInstagramAccounts));
  const accounts = results.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  const account = accounts.find((item) => item.id === config.accountId);
  if (!account) {
    throw new Error("Akun Instagram Proxsis Academy tidak tersedia pada token Meta yang terkonfigurasi.");
  }

  await metaRequest(`/${account.id}?fields=id,username,name`, account.token);
  return { account, brandName: config.brandName };
}

export async function createInstagramContainer(input: {
  account: MetaPublishingAccount;
  caption: string;
  mediaUrl: string;
  mediaType: "image" | "video";
}) {
  const form = new URLSearchParams();
  form.set("caption", input.caption);
  if (input.mediaType === "video") {
    form.set("media_type", "REELS");
    form.set("video_url", input.mediaUrl);
    form.set("share_to_feed", "true");
  } else {
    form.set("image_url", input.mediaUrl);
  }
  const payload = await metaRequest(`/${input.account.id}/media`, input.account.token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!payload?.id) throw new Error("Meta tidak mengembalikan media container ID.");
  return String(payload.id);
}

export async function getInstagramContainerStatus(containerId: string, token: string) {
  const payload = await metaRequest(
    `/${encodeURIComponent(containerId)}?fields=status_code,status`,
    token,
  );
  return {
    code: String(payload?.status_code || "").toUpperCase(),
    message: String(payload?.status || ""),
  };
}

export async function publishInstagramContainer(accountId: string, containerId: string, token: string) {
  const form = new URLSearchParams({ creation_id: containerId });
  const payload = await metaRequest(`/${accountId}/media_publish`, token, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  if (!payload?.id) throw new Error("Meta tidak mengembalikan Instagram media ID.");
  return String(payload.id);
}

export function metaPublishingSupabase() {
  return { ...supabaseConfig(), headers: serviceHeaders() };
}
