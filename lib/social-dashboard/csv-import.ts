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
  views: number;
  interactions: number;
  engagement_rate: number;
};

export type AnalyticsPayload = {
  source: string;
  synced_at: string;
  account: { username?: string; name?: string; followers_count?: number; media_count?: number };
  summary: { reach: number; views: number; interactions: number; likes: number; comments: number; saved: number; shares: number };
  media: AnalyticsMedia[];
};

const storageKey = "proxsis-meta-business-suite-csv";

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < normalized.length; i += 1) {
    const char = normalized[i];
    if (char === '"') {
      if (quoted && normalized[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === "," && !quoted) { row.push(cell.trim()); cell = ""; }
    else if (char === "\n" && !quoted) { row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function numeric(value: string | undefined) {
  const raw = String(value || "").trim().replace(/[^0-9,.-]/g, "");
  if (!raw) return 0;
  const compact = raw.includes(",") && raw.includes(".")
    ? raw.replace(/[,.](?=.*[,.])/g, "").replace(",", ".")
    : raw.replace(/,/g, "");
  const result = Number(compact);
  return Number.isFinite(result) ? result : 0;
}

function valueFor(row: Record<string, string>, names: string[]) {
  const keys = Object.keys(row);
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
  const headers = rows[0].map(normalize);
  const records = rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
  const media = records.map((row, index) => {
    const likes = numeric(valueFor(row, ["likes", "reactions", "like"]));
    const comments = numeric(valueFor(row, ["comments", "comment"]));
    const saved = numeric(valueFor(row, ["saves", "saved"]));
    const shares = numeric(valueFor(row, ["shares", "share"]));
    const reach = numeric(valueFor(row, ["reach", "accountsreached", "postreach"]));
    const views = numeric(valueFor(row, ["views", "impressions", "plays", "video plays".replace(/ /g, "")]));
    const listedInteractions = numeric(valueFor(row, ["interactions", "engagement", "reactionscommentsshares"]));
    const interactions = listedInteractions || likes + comments + saved + shares;
    const caption = valueFor(row, ["caption", "title", "post", "content", "description"]) || "Konten Meta Business Suite";
    const mediaType = valueFor(row, ["mediatype", "posttype", "type", "format"]).toUpperCase() || "UNKNOWN";
    const productType = valueFor(row, ["mediaproducttype", "producttype"]);
    return {
      id: valueFor(row, ["id", "postid", "mediaid", "contentid"]) || `${fileName}-${index + 1}`,
      caption,
      media_type: mediaType,
      media_product_type: productType ? productType.toUpperCase() : null,
      permalink: valueFor(row, ["permalink", "link", "url"]) || null,
      timestamp: valueFor(row, ["timestamp", "published", "date", "createdtime"]) || null,
      likes, comments, saved, shares, reach, views, interactions,
      engagement_rate: reach > 0 ? (interactions / reach) * 100 : 0,
    } satisfies AnalyticsMedia;
  }).filter((item) => item.reach || item.views || item.interactions || item.caption !== "Konten Meta Business Suite");

  if (!media.length) throw new Error("Kolom metrik tidak ditemukan. Gunakan CSV ekspor Content atau Insights dari Meta Business Suite.");
  const summary = media.reduce((total, item) => ({
    reach: total.reach + item.reach, views: total.views + item.views, interactions: total.interactions + item.interactions,
    likes: total.likes + item.likes, comments: total.comments + item.comments, saved: total.saved + item.saved, shares: total.shares + item.shares,
  }), { reach: 0, views: 0, interactions: 0, likes: 0, comments: 0, saved: 0, shares: 0 });
  const followers = Math.max(...records.map((row) => numeric(valueFor(row, ["followers", "followerscount"]))), 0);
  const username = valueFor(records[0], ["username", "account", "instagramaccount"]);
  return { source: `CSV Meta Business Suite · ${fileName}`, synced_at: new Date().toISOString(), account: { username, followers_count: followers, media_count: media.length }, summary, media };
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
