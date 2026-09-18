export type AnalyticsMedia = {
  id: string;
  caption: string;
  media_type: string;
  media_product_type?: string | null;
  permalink?: string | null;
  timestamp?: string | null;
  likes: number;
  comments: number;
  saved: number;
  shares: number;
  reach: number;
  impressions?: number;
  followers?: number;
  profile_visits?: number;
  link_clicks?: number;
  views: number;
  interactions: number;
  engagement_rate: number;
};

export type AnalyticsPayload = {
  source: string;
  synced_at: string;
  warnings?: string[];
  available_metrics?: string[];
  data_mode?: "content" | "timeseries";
  account: { username?: string; name?: string; followers_count?: number; followers_gained?: number; media_count?: number };
  summary: { reach: number; impressions?: number; profile_visits?: number; link_clicks?: number; views: number; interactions: number; likes: number; comments: number; saved: number; shares: number };
  media: AnalyticsMedia[];
};

const storageKey = "proxsis-meta-business-suite-csv";

function delimiterFor(text: string) {
  const dataLines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim() && !/^sep=./i.test(line.trim()))
    .slice(0, 10);
  const counts = [",", ";", "\t"].map((delimiter) => {
    let count = 0;
    for (const line of dataLines) {
      let quoted = false;
      for (let index = 0; index < line.length; index += 1) {
        const char = line[index];
        if (char === '"') quoted = !quoted;
        else if (char === delimiter && !quoted) count += 1;
      }
    }
    return { delimiter, count };
  });
  return counts.sort((a, b) => b.count - a.count)[0]?.delimiter || ",";
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const delimiter = delimiterFor(normalized);
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (char === '"') {
      if (quoted && normalized[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ""; }
    else if (char === "\n" && !quoted) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows.filter((cells) => !/^sep=./i.test(cells[0] || ""));
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const aliases = {
  reach: ["reach", "accountsreached", "postreach", "totalreach", "jangkauan", "akunyangdijangkau"],
  impressions: ["impressions", "impression", "postimpressions", "totalimpressions", "tayangan"],
  interactions: ["interactions", "totalinteractions", "contentinteractions", "postengagement", "engagement", "engagements", "interaksi", "interaksikonten", "reactionscommentsshares"],
  followers: ["followers", "followerscount", "totalfollowers", "lifetimefollowers", "instagramfollowers", "pengikut", "totalpengikut"],
  profileVisits: ["profilevisits", "instagramprofilevisits", "visits", "kunjunganprofil", "kunjunganprofilinstagram", "kunjungan"],
  linkClicks: ["linkclicks", "instagramlinkclicks", "clicks", "kliktautan", "kliktautaninstagram"],
  date: ["timestamp", "published", "publishtime", "date", "day", "createdtime", "tanggal", "hari"],
};

function hasHeader(headers: string[], names: string[]) {
  return headers.some((header) => names.some((name) => header === name || header.includes(name)));
}

function warningsFor(available: Set<string>) {
  const warnings: string[] = [];
  if (!available.has("reach")) warnings.push("Kolom Reach/Jangkauan belum ditemukan pada kumpulan CSV ini.");
  if (!available.has("interactions")) warnings.push("Kolom Engagement/Interactions belum ditemukan; total hanya dihitung jika komponen interaksi tersedia.");
  if (!available.has("impressions")) warnings.push("Kolom Impressions/Tayangan belum ditemukan pada kumpulan CSV ini.");
  if (!available.has("followers")) warnings.push("Kolom Followers/Pengikut belum tersedia pada kumpulan CSV ini.");
  return warnings;
}

function numeric(value: string | undefined) {
  const raw = String(value || "").trim();
  if (!raw) return 0;
  const compact = raw.replace(/[^0-9-]/g, "");
  const result = Number(compact);
  return Number.isFinite(result) ? result : 0;
}

function valueFor(row: Record<string, string>, names: string[]) {
  const keys = Object.keys(row).filter(Boolean);
  for (const name of names) {
    const exact = keys.find((key) => key === name);
    if (exact) return row[exact];
  }
  for (const name of names) {
    const partial = keys.find((key) => key.includes(name) || name.includes(key));
    if (partial) return row[partial];
  }
  return "";
}

export function importMetaBusinessSuiteCsv(fileName: string, text: string): AnalyticsPayload {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new Error("CSV belum berisi header dan baris data.");
  const knownHeaders = ["reach", "jangkauan", "impressions", "tayangan", "views", "interactions", "engagement", "interaksi", "followers", "pengikut", "profilevisits", "kunjungan", "linkclicks", "kliktautan", "date", "tanggal", "caption", "description", "postid", "mediaid"];
  const headerIndex = rows.slice(0, 10).reduce((best, cells, index) => {
    const score = cells.map(normalize).filter((cell) => knownHeaders.some((known) => cell === known || cell.includes(known))).length;
    return score > best.score ? { index, score } : best;
  }, { index: 0, score: -1 }).index;
  const headers = rows[headerIndex].map(normalize);
  const available = new Set<string>();
  if (hasHeader(headers, aliases.reach)) available.add("reach");
  if (hasHeader(headers, aliases.impressions)) available.add("impressions");
  if (hasHeader(headers, aliases.interactions)) available.add("interactions");
  if (hasHeader(headers, aliases.followers)) available.add("followers");
  if (hasHeader(headers, aliases.profileVisits)) available.add("profile_visits");
  if (hasHeader(headers, aliases.linkClicks)) available.add("link_clicks");
  const hasUsableMetric = available.size > 0 || hasHeader(headers, ["views", "contentviews", "plays", "videoplays", "videoviews", "tontonan", "pemutaran", "likes", "reactions", "suka", "comments", "komentar", "saves", "saved", "disimpan", "shares", "dibagikan"]);
  if (!hasUsableMetric) throw new Error("Kolom metrik tidak ditemukan. Gunakan CSV ekspor Content atau Insights dari Meta Business Suite.");
  const hasContentIdentity = hasHeader(headers, ["caption", "description", "postid", "mediaid", "contentid", "permalink", "judul", "keterangan"]);
  const dataMode: "content" | "timeseries" = hasHeader(headers, aliases.date) && !hasContentIdentity ? "timeseries" : "content";
  const records = rows.slice(headerIndex + 1).map((cells) => Object.fromEntries(headers.map((header, index) => [header || `column${index}`, cells[index] || ""])));
  const media = records.map((row, index) => {
    const likes = numeric(valueFor(row, ["likes", "reactions", "like", "likesandreactions", "suka", "reaksi"]));
    const comments = numeric(valueFor(row, ["comments", "comment", "komentar"]));
    const saved = numeric(valueFor(row, ["saves", "saved", "disimpan", "simpanan"]));
    const shares = numeric(valueFor(row, ["shares", "share", "dibagikan", "bagikan"]));
    const reach = numeric(valueFor(row, aliases.reach));
    const impressions = numeric(valueFor(row, aliases.impressions));
    const views = numeric(valueFor(row, ["views", "contentviews", "plays", "videoplays", "videoviews", "tontonan", "pemutaran"]));
    const listedInteractions = numeric(valueFor(row, aliases.interactions));
    const interactions = listedInteractions || likes + comments + saved + shares;
    const followers = numeric(valueFor(row, aliases.followers));
    const profileVisits = numeric(valueFor(row, aliases.profileVisits));
    const linkClicks = numeric(valueFor(row, aliases.linkClicks));
    const timestamp = valueFor(row, aliases.date) || null;
    const caption = valueFor(row, ["caption", "title", "post", "content", "description", "judul", "keterangan"]) || (dataMode === "timeseries" && timestamp ? `Data ${timestamp}` : "Konten Meta Business Suite");
    const mediaType = valueFor(row, ["mediatype", "posttype", "contenttype", "type", "format", "jeniskonten"]).toUpperCase() || (dataMode === "timeseries" ? "TIMESERIES" : "UNKNOWN");
    const productType = valueFor(row, ["mediaproducttype", "producttype"]);
    return {
      id: valueFor(row, ["id", "postid", "mediaid", "contentid"]) || `${fileName}-${index + 1}`,
      caption,
      media_type: mediaType,
      media_product_type: productType ? productType.toUpperCase() : null,
      permalink: valueFor(row, ["permalink", "link", "url"]) || null,
      timestamp,
      likes, comments, saved, shares, reach, impressions, followers, profile_visits: profileVisits, link_clicks: linkClicks, views, interactions,
      engagement_rate: reach > 0 ? (interactions / reach) * 100 : 0,
    } satisfies AnalyticsMedia;
  }).filter((item) => item.reach || item.impressions || item.followers || item.profile_visits || item.link_clicks || item.views || item.interactions || item.caption !== "Konten Meta Business Suite");

  if (!media.length) throw new Error("Kolom metrik tidak ditemukan. Gunakan CSV ekspor Content atau Insights dari Meta Business Suite.");
  const summary = media.reduce((total, item) => ({
    reach: total.reach + item.reach, impressions: total.impressions + (item.impressions || 0), profile_visits: total.profile_visits + (item.profile_visits || 0), link_clicks: total.link_clicks + (item.link_clicks || 0), views: total.views + item.views, interactions: total.interactions + item.interactions,
    likes: total.likes + item.likes, comments: total.comments + item.comments, saved: total.saved + item.saved, shares: total.shares + item.shares,
  }), { reach: 0, impressions: 0, profile_visits: 0, link_clicks: 0, views: 0, interactions: 0, likes: 0, comments: 0, saved: 0, shares: 0 });
  const followerValues = records.map((row) => numeric(valueFor(row, aliases.followers)));
  const followers = dataMode === "content" ? Math.max(...followerValues, 0) : 0;
  const followersGained = dataMode === "timeseries" && available.has("followers") ? followerValues.reduce((sum, value) => sum + value, 0) : undefined;
  const username = valueFor(records[0], ["username", "accountusername", "account", "instagramaccount", "namaakun"]);
  const name = valueFor(records[0], ["accountname", "profilename", "pagename", "namaprofil"]);
  return {
    source: `CSV Meta Business Suite · ${fileName}`,
    synced_at: new Date().toISOString(),
    warnings: warningsFor(available),
    available_metrics: [...available],
    data_mode: dataMode,
    account: { username, name, followers_count: followers, followers_gained: followersGained, media_count: media.length },
    summary,
    media,
  };
}

export function importMetaBusinessSuiteCsvFiles(files: Array<{ fileName: string; text: string }>): AnalyticsPayload {
  if (!files.length) throw new Error("Pilih minimal satu file CSV.");
  const payloads: AnalyticsPayload[] = [];
  const skippedFiles: string[] = [];
  for (const file of files) {
    try {
      payloads.push(importMetaBusinessSuiteCsv(file.fileName, file.text));
    } catch {
      skippedFiles.push(file.fileName);
    }
  }
  if (!payloads.length) throw new Error("Tidak ada file metrik yang dapat dibaca. Pilih CSV hasil Ekspor pada kartu Insights Meta Business Suite.");
  if (payloads.length === 1) {
    const onlyPayload = payloads[0];
    return {
      ...onlyPayload,
      warnings: [
        ...(onlyPayload.warnings || []),
        ...(skippedFiles.length ? [`${skippedFiles.length} file dilewati karena format atau kolom metriknya belum dikenali: ${skippedFiles.join(", ")}.`] : []),
      ],
    };
  }

  const dataMode: "content" | "timeseries" = payloads.every((payload) => payload.data_mode === "timeseries") ? "timeseries" : "content";
  const available = new Set(payloads.flatMap((payload) => payload.available_metrics || []));
  const merged = new Map<string, AnalyticsMedia>();

  for (const payload of payloads) {
    for (const item of payload.media) {
      const key = dataMode === "timeseries" && item.timestamp
        ? `date:${normalize(item.timestamp)}`
        : `content:${item.permalink || item.id}`;
      const current = merged.get(key);
      if (!current) {
        merged.set(key, { ...item, id: key });
        continue;
      }
      const reach = Math.max(current.reach, item.reach);
      const interactions = Math.max(current.interactions, item.interactions);
      merged.set(key, {
        ...current,
        caption: current.caption.startsWith("Konten Meta") ? item.caption : current.caption,
        timestamp: current.timestamp || item.timestamp,
        likes: Math.max(current.likes, item.likes),
        comments: Math.max(current.comments, item.comments),
        saved: Math.max(current.saved, item.saved),
        shares: Math.max(current.shares, item.shares),
        reach,
        impressions: Math.max(current.impressions || 0, item.impressions || 0),
        followers: Math.max(current.followers || 0, item.followers || 0),
        profile_visits: Math.max(current.profile_visits || 0, item.profile_visits || 0),
        link_clicks: Math.max(current.link_clicks || 0, item.link_clicks || 0),
        views: Math.max(current.views, item.views),
        interactions,
        engagement_rate: reach > 0 ? (interactions / reach) * 100 : 0,
      });
    }
  }

  const media = [...merged.values()].sort((a, b) => String(a.timestamp || "").localeCompare(String(b.timestamp || "")));
  const summary = media.reduce((total, item) => ({
    reach: total.reach + item.reach,
    impressions: total.impressions + (item.impressions || 0),
    profile_visits: total.profile_visits + (item.profile_visits || 0),
    link_clicks: total.link_clicks + (item.link_clicks || 0),
    views: total.views + item.views,
    interactions: total.interactions + item.interactions,
    likes: total.likes + item.likes,
    comments: total.comments + item.comments,
    saved: total.saved + item.saved,
    shares: total.shares + item.shares,
  }), { reach: 0, impressions: 0, profile_visits: 0, link_clicks: 0, views: 0, interactions: 0, likes: 0, comments: 0, saved: 0, shares: 0 });
  const firstAccount = payloads.find((payload) => payload.account.username || payload.account.name)?.account;
  const followersGained = dataMode === "timeseries" && available.has("followers")
    ? media.reduce((sum, item) => sum + (item.followers || 0), 0)
    : undefined;

  return {
    source: `CSV Meta Business Suite · ${payloads.length} file digabung`,
    synced_at: new Date().toISOString(),
    warnings: [
      ...warningsFor(available),
      ...(skippedFiles.length ? [`${skippedFiles.length} file dilewati karena format atau kolom metriknya belum dikenali: ${skippedFiles.join(", ")}.`] : []),
    ],
    available_metrics: [...available],
    data_mode: dataMode,
    account: {
      username: firstAccount?.username,
      name: firstAccount?.name,
      followers_count: Math.max(...payloads.map((payload) => payload.account.followers_count || 0), 0),
      followers_gained: followersGained,
      media_count: media.length,
    },
    summary,
    media,
  };
}

export function getImportedAnalytics() {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(window.localStorage.getItem(storageKey) || "null") as AnalyticsPayload | null; } catch { return null; }
}

export function saveImportedAnalytics(data: AnalyticsPayload) {
  window.localStorage.setItem(storageKey, JSON.stringify(data));
  window.dispatchEvent(new Event("meta-csv-imported"));
}

export function clearImportedAnalytics() {
  window.localStorage.removeItem(storageKey);
  window.dispatchEvent(new Event("meta-csv-imported"));
}
