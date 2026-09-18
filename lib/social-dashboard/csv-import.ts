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
  views: number;
  interactions: number;
  engagement_rate: number;
};

export type AnalyticsPayload = {
  source: string;
  synced_at: string;
  warnings?: string[];
  account: { username?: string; name?: string; followers_count?: number; media_count?: number };
  summary: { reach: number; impressions?: number; views: number; interactions: number; likes: number; comments: number; saved: number; shares: number };
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
  const knownHeaders = ["reach", "jangkauan", "impressions", "tayangan", "views", "interactions", "engagement", "followers", "caption", "description", "postid", "mediaid"];
  const headerIndex = rows.slice(0, 10).reduce((best, cells, index) => {
    const score = cells.map(normalize).filter((cell) => knownHeaders.some((known) => cell === known || cell.includes(known))).length;
    return score > best.score ? { index, score } : best;
  }, { index: 0, score: -1 }).index;
  const headers = rows[headerIndex].map(normalize);
  const records = rows.slice(headerIndex + 1).map((cells) => Object.fromEntries(headers.map((header, index) => [header || `column${index}`, cells[index] || ""])));
  const media = records.map((row, index) => {
    const likes = numeric(valueFor(row, ["likes", "reactions", "like", "likesandreactions", "suka", "reaksi"]));
    const comments = numeric(valueFor(row, ["comments", "comment", "komentar"]));
    const saved = numeric(valueFor(row, ["saves", "saved", "disimpan", "simpanan"]));
    const shares = numeric(valueFor(row, ["shares", "share", "dibagikan", "bagikan"]));
    const reach = numeric(valueFor(row, ["reach", "accountsreached", "postreach", "totalreach", "jangkauan", "akunyangdijangkau"]));
    const impressions = numeric(valueFor(row, ["impressions", "impression", "postimpressions", "totalimpressions", "tayangan"]));
    const views = numeric(valueFor(row, ["views", "contentviews", "plays", "videoplays", "videoviews", "tontonan", "pemutaran"]));
    const listedInteractions = numeric(valueFor(row, ["interactions", "totalinteractions", "contentinteractions", "postengagement", "engagement", "engagements", "interaksi", "interaksikonten", "reactionscommentsshares"]));
    const interactions = listedInteractions || likes + comments + saved + shares;
    const caption = valueFor(row, ["caption", "title", "post", "content", "description", "judul", "keterangan"]) || "Konten Meta Business Suite";
    const mediaType = valueFor(row, ["mediatype", "posttype", "contenttype", "type", "format", "jeniskonten"]).toUpperCase() || "UNKNOWN";
    const productType = valueFor(row, ["mediaproducttype", "producttype"]);
    return {
      id: valueFor(row, ["id", "postid", "mediaid", "contentid"]) || `${fileName}-${index + 1}`,
      caption,
      media_type: mediaType,
      media_product_type: productType ? productType.toUpperCase() : null,
      permalink: valueFor(row, ["permalink", "link", "url"]) || null,
      timestamp: valueFor(row, ["timestamp", "published", "date", "createdtime"]) || null,
      likes, comments, saved, shares, reach, impressions, views, interactions,
      engagement_rate: reach > 0 ? (interactions / reach) * 100 : 0,
    } satisfies AnalyticsMedia;
  }).filter((item) => item.reach || item.impressions || item.views || item.interactions || item.caption !== "Konten Meta Business Suite");

  if (!media.length) throw new Error("Kolom metrik tidak ditemukan. Gunakan CSV ekspor Content atau Insights dari Meta Business Suite.");
  const summary = media.reduce((total, item) => ({
    reach: total.reach + item.reach, impressions: total.impressions + (item.impressions || 0), views: total.views + item.views, interactions: total.interactions + item.interactions,
    likes: total.likes + item.likes, comments: total.comments + item.comments, saved: total.saved + item.saved, shares: total.shares + item.shares,
  }), { reach: 0, impressions: 0, views: 0, interactions: 0, likes: 0, comments: 0, saved: 0, shares: 0 });
  const followers = Math.max(...records.map((row) => numeric(valueFor(row, ["followers", "followerscount", "totalfollowers", "lifetimefollowers", "pengikut", "totalpengikut"]))), 0);
  const username = valueFor(records[0], ["username", "accountusername", "account", "instagramaccount", "namaakun"]);
  const name = valueFor(records[0], ["accountname", "profilename", "pagename", "namaprofil"]);
  const warnings: string[] = [];
  if (!headers.some((header) => ["reach", "accountsreached", "postreach", "totalreach", "jangkauan", "akunyangdijangkau"].some((name) => header.includes(name)))) warnings.push("Kolom Reach/Jangkauan tidak ditemukan pada CSV ini.");
  if (!headers.some((header) => ["interactions", "totalinteractions", "contentinteractions", "postengagement", "engagement", "interaksi"].some((name) => header.includes(name)))) warnings.push("Kolom Engagement/Interactions tidak ditemukan; total dihitung dari likes, comments, saves, dan shares yang tersedia.");
  if (!headers.some((header) => ["impressions", "impression", "tayangan"].some((name) => header.includes(name)))) warnings.push("Kolom Impressions/Tayangan tidak ditemukan pada CSV ini.");
  if (!headers.some((header) => ["followers", "followerscount", "totalfollowers", "pengikut"].some((name) => header.includes(name)))) warnings.push("Kolom Followers/Pengikut tidak tersedia pada CSV ini, sehingga nilainya tidak dapat dihitung dari data konten.");
  return { source: `CSV Meta Business Suite · ${fileName}`, synced_at: new Date().toISOString(), warnings, account: { username, name, followers_count: followers, media_count: media.length }, summary, media };
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
