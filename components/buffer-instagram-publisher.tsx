"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { loadAllBriefs, saveBrief, type BriefRecord } from "@/lib/smm-workflow";

const SESSION_KEY = "proxsis-auth:session:v1";
const BUCKET = "smm-publisher-media";
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/quicktime"]);

type Provider = "buffer" | "meta";
type BufferChannel = { id: string; name: string; displayName?: string | null; service?: string; isDisconnected?: boolean; isLocked?: boolean };
type Diagnostics = { organizationCount?: number; returnedChannelCount?: number; services?: string[] };
type MetaAccount = { id: string; username?: string; name?: string; pageName?: string };

function accessToken() {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return String((raw ? JSON.parse(raw) : null)?.access_token || "");
  } catch {
    return "";
  }
}

function authHeaders(extra: Record<string, string> = {}) {
  const token = accessToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

function safeName(name: string) {
  const parts = name.split(".");
  const ext = parts.length > 1 ? `.${parts.pop()}` : "";
  const base = parts.join(".") || "media";
  return `${base.toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "media"}${ext.toLowerCase()}`;
}

function fileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function defaultCaption(brief: BriefRecord) {
  return [brief.working_title, brief.core_insight, brief.brand_pov, brief.cta]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n\n");
}

function isProxsisAcademy(brief: BriefRecord | null) {
  return Boolean(brief && brief.brand_name.toLowerCase().replace(/[^a-z0-9]+/g, "") === "proxsisacademy");
}

export default function BufferInstagramPublisher() {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [brief, setBrief] = useState<BriefRecord | null>(null);
  const [provider, setProvider] = useState<Provider>("buffer");
  const [channels, setChannels] = useState<BufferChannel[]>([]);
  const [channelId, setChannelId] = useState("");
  const [caption, setCaption] = useState("");
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState("");
  const [publishDate, setPublishDate] = useState("");
  const [publishTime, setPublishTime] = useState("09:00");
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [metaAccount, setMetaAccount] = useState<MetaAccount | null>(null);
  const [metaError, setMetaError] = useState("");
  const [loadingChannels, setLoadingChannels] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    const resolve = () => {
      if (disposed) return;
      const node = document.querySelector<HTMLElement>(".calendar-detail");
      if (node) {
        setTarget(node);
        return;
      }
      frame = requestAnimationFrame(resolve);
    };
    resolve();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    void (async () => {
      setLoadingChannels(true);
      try {
        const response = await fetch("/api/buffer/channels", { headers: authHeaders(), cache: "no-store" });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Gagal memuat channel Buffer.");
        const rows = (payload.channels || []) as BufferChannel[];
        setChannels(rows);
        setDiagnostics(payload.diagnostics || null);
        if (rows.length === 1) setChannelId(rows[0].id);
      } catch (err) {
        if (provider === "buffer") setError(err instanceof Error ? err.message : "Gagal memuat channel Buffer.");
      } finally {
        setLoadingChannels(false);
      }
    })();
  // Buffer only needs to be discovered once when the publisher mounts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const card = (event.target as HTMLElement | null)?.closest<HTMLElement>(".calendar-card");
      if (!card) return;
      const channel = card.querySelector<HTMLElement>(".channel-pill")?.textContent?.trim().toUpperCase();
      if (channel !== "SOCIAL") {
        setBrief(null);
        return;
      }
      const briefId = card.dataset.briefId || "";
      const selected = loadAllBriefs().find((item) => item.id === briefId) || null;
      setBrief(selected);
      setProvider(isProxsisAcademy(selected) ? "meta" : "buffer");
      setMetaAccount(null);
      setMetaError("");
      if (selected) {
        setCaption(defaultCaption(selected));
        setPublishDate(selected.scheduled_for || "");
        setMediaUrl(selected.design_url || "");
        setMediaFile(null);
      }
      setMessage("");
      setError("");
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (provider !== "meta" || !brief?.brand_id || !isProxsisAcademy(brief)) return;
    let disposed = false;
    void (async () => {
      setLoadingMeta(true);
      setMetaError("");
      try {
        const response = await fetch(
          `/api/meta/instagram/publisher?brandId=${encodeURIComponent(brief.brand_id || "")}`,
          { headers: authHeaders(), cache: "no-store" },
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.ok) throw new Error(payload?.error || "Koneksi Meta Direct belum siap.");
        if (!disposed) setMetaAccount(payload.account || null);
      } catch (err) {
        if (!disposed) {
          setMetaAccount(null);
          setMetaError(err instanceof Error ? err.message : "Koneksi Meta Direct belum siap.");
        }
      } finally {
        if (!disposed) setLoadingMeta(false);
      }
    })();
    return () => { disposed = true; };
  }, [brief?.brand_id, brief?.brand_name, provider]);

  const mediaType = useMemo<"image" | "video">(
    () => mediaFile?.type.startsWith("video/") || /\.(mp4|mov)(\?|#|$)/i.test(mediaUrl) ? "video" : "image",
    [mediaFile, mediaUrl],
  );

  function selectFile(file: File | null) {
    setMessage("");
    setError("");
    if (!file) {
      setMediaFile(null);
      return;
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      setError("Format file belum didukung. Gunakan JPG, PNG, WEBP, MP4, atau MOV.");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("Ukuran file maksimal 50 MB.");
      return;
    }
    setMediaFile(file);
  }

  async function upload(activeBrief: BriefRecord) {
    if (!mediaFile) return mediaUrl.trim();
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const token = accessToken();
    if (!url || !anon) throw new Error("Supabase belum dikonfigurasi di Combined.");
    if (!token) throw new Error("Session login tidak valid.");
    const userResponse = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
    });
    const user = await userResponse.json().catch(() => ({}));
    if (!userResponse.ok || !user?.id) throw new Error("Session login tidak valid.");
    const path = `${user.id}/${activeBrief.id}/${Date.now()}-${safeName(mediaFile.name)}`;
    const uploadResponse = await fetch(`${url}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: {
        apikey: anon,
        Authorization: `Bearer ${token}`,
        "Content-Type": mediaFile.type,
        "x-upsert": "false",
      },
      body: mediaFile,
    });
    const payload = await uploadResponse.json().catch(() => ({}));
    if (!uploadResponse.ok) throw new Error(payload?.message || payload?.error || "Upload media gagal.");
    const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${path}`;
    const next = {
      ...activeBrief,
      production_status: "designed" as const,
      design_url: publicUrl,
      updated_at: new Date().toISOString(),
    };
    saveBrief(next);
    setBrief(next);
    setMediaUrl(publicUrl);
    setMediaFile(null);
    return publicUrl;
  }

  async function schedule() {
    if (!brief) {
      setError("Klik kartu SOCIAL di Calendar terlebih dahulu.");
      return;
    }
    if (brief.human_qc !== "approved") {
      setError("Human QC harus approved sebelum dijadwalkan ke Instagram.");
      return;
    }
    if (provider === "buffer" && !channelId) {
      setError("Pilih akun Instagram Buffer terlebih dahulu.");
      return;
    }
    if (provider === "meta" && (!isProxsisAcademy(brief) || !metaAccount)) {
      setError(metaError || "Meta Direct pilot hanya tersedia untuk Proxsis Academy dan koneksinya belum siap.");
      return;
    }
    if (!publishDate || !publishTime) {
      setError("Pilih tanggal dan jam publish terlebih dahulu.");
      return;
    }
    if (!mediaFile && !mediaUrl.trim()) {
      setError("Upload file design/video terlebih dahulu.");
      return;
    }

    setScheduling(true);
    setMessage("");
    setError("");
    try {
      const finalUrl = await upload(brief);
      if (!finalUrl) throw new Error("Media belum tersedia.");
      const dueAt = new Date(`${publishDate}T${publishTime}:00+07:00`).toISOString();
      const endpoint = provider === "meta" ? "/api/meta/instagram/publisher" : "/api/buffer/schedule";
      const requestBody = provider === "meta"
        ? { brandId: brief.brand_id, briefId: brief.id, caption, scheduledFor: dueAt, mediaUrl: finalUrl, mediaType }
        : { channelId, text: caption, dueAt, mediaUrl: finalUrl, mediaType };
      const response = await fetch(endpoint, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(requestBody),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || `Scheduling ${provider === "meta" ? "Meta Direct" : "Buffer"} gagal.`);
      }
      const next = {
        ...brief,
        scheduled_for: publishDate,
        production_status: "designed" as const,
        design_url: finalUrl,
        updated_at: new Date().toISOString(),
      };
      saveBrief(next);
      setBrief(next);
      setMessage(`${provider === "meta" ? `Meta Direct · @${metaAccount?.username || "Instagram"}` : "Buffer"} scheduled ✓ · ${publishDate} ${publishTime} WIB`);
      window.dispatchEvent(new Event("proxsis:calendar-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scheduling Instagram gagal.");
    } finally {
      setScheduling(false);
    }
  }

  if (!target) return null;
  const service = channels.find((channel) => channel.id === channelId)?.service || diagnostics?.services?.join(", ") || "";
  const metaAvailable = isProxsisAcademy(brief);

  return createPortal(
    <div style={{ borderTop: "1px solid #e7dfe2", marginTop: 18, paddingTop: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", color: "#8b777e" }}>INSTAGRAM PUBLISHER</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 3 }}>Schedule to Instagram</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 800, color: "#a3152d", background: "#fff0f1", padding: "6px 9px", borderRadius: 999, height: "fit-content" }}>Instagram</span>
      </div>

      {!brief ? (
        <p style={{ fontSize: 12, color: "#756b70", lineHeight: 1.6 }}>Klik kartu <b>SOCIAL</b> di Calendar untuk membuka publisher.</p>
      ) : (
        <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
          <div style={{ border: "1px solid #e7dfe2", borderRadius: 12, padding: 12 }}>
            <small style={{ fontWeight: 800, color: "#8b777e" }}>SELECTED CONTENT · {brief.brand_name}</small>
            <div style={{ fontSize: 12, fontWeight: 800, lineHeight: 1.45, marginTop: 5 }}>{brief.working_title}</div>
            <div style={{ fontSize: 11, color: "#756b70", marginTop: 6 }}>QC {brief.human_qc === "approved" ? "Approved ✓" : "Pending"}</div>
          </div>

          <label style={label}>PUBLISH VIA</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button type="button" onClick={() => { setProvider("buffer"); setError(""); setMessage(""); }} style={providerButton(provider === "buffer")}>Buffer</button>
            <button type="button" disabled={!metaAvailable} onClick={() => { setProvider("meta"); setError(""); setMessage(""); }} style={{ ...providerButton(provider === "meta"), opacity: metaAvailable ? 1 : 0.45 }}>Meta Direct {metaAvailable ? "· Pilot" : ""}</button>
          </div>

          {provider === "buffer" ? (
            <>
              <label style={label}>INSTAGRAM ACCOUNT
                <select value={channelId} onChange={(event) => setChannelId(event.target.value)} disabled={loadingChannels} style={input}>
                  <option value="">{loadingChannels ? "Loading Buffer..." : "Pilih akun Instagram"}</option>
                  {channels.map((channel) => <option key={channel.id} value={channel.id}>{channel.displayName || channel.name}</option>)}
                </select>
              </label>
              {diagnostics && <div style={{ fontSize: 10, color: "#756b70" }}>Buffer connected · {diagnostics.organizationCount || 0} organization · {diagnostics.returnedChannelCount || 0} channel{service ? ` · ${service}` : ""}</div>}
            </>
          ) : (
            <div style={{ border: "1px solid #eadfe2", background: "#fbf7f8", borderRadius: 11, padding: 12 }}>
              <small style={{ display: "block", color: "#8b777e", fontWeight: 800 }}>META DIRECT ACCOUNT</small>
              {loadingMeta ? <div style={{ marginTop: 6, fontSize: 12 }}>Memeriksa koneksi Proxsis Academy…</div> : metaAccount ? (
                <div style={{ marginTop: 6 }}>
                  <b style={{ fontSize: 13 }}>@{metaAccount.username || metaAccount.name || "Instagram"}</b>
                  <div style={{ marginTop: 4, color: "#756b70", fontSize: 10 }}>{metaAccount.pageName || "Facebook Page terhubung"} · token tersimpan aman di server</div>
                </div>
              ) : <div style={{ marginTop: 6, color: "#a3152d", fontSize: 11, lineHeight: 1.5 }}>{metaError || "Koneksi Meta Direct belum siap."}</div>}
            </div>
          )}

          <label style={label}>UPLOAD DESIGN / VIDEO
            <span style={{ display: "grid", placeItems: "center", textAlign: "center", border: "1px dashed #d9cdd2", borderRadius: 12, padding: "16px 12px", cursor: "pointer" }}>
              <input type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime" style={{ display: "none" }} onChange={(event) => selectFile(event.target.files?.[0] || null)} />
              <b style={{ fontSize: 12 }}>{mediaFile ? mediaFile.name : "Pilih JPG / PNG / WEBP / MP4 / MOV"}</b>
              <span style={{ fontSize: 10, color: "#756b70", marginTop: 5 }}>{mediaFile ? fileSize(mediaFile.size) : "Maks. 50 MB · upload otomatis saat scheduling"}</span>
            </span>
          </label>
          {!mediaFile && mediaUrl && <div style={{ fontSize: 10, color: "#147a4d" }}>Media final tersimpan dan siap digunakan kembali.</div>}
          <label style={label}>CAPTION<textarea rows={7} value={caption} onChange={(event) => setCaption(event.target.value)} style={{ ...input, resize: "vertical", lineHeight: 1.55 }} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <label style={label}>PUBLISH DATE<input type="date" value={publishDate} onChange={(event) => setPublishDate(event.target.value)} style={input} /></label>
            <label style={label}>PUBLISH TIME (WIB)<input type="time" value={publishTime} onChange={(event) => setPublishTime(event.target.value)} style={input} /></label>
          </div>
          {message && <div style={{ background: "#eaf7f0", color: "#146c43", padding: 11, borderRadius: 10, fontSize: 12 }}>{message}</div>}
          {error && <div style={{ background: "#fff0f1", color: "#a3152d", padding: 11, borderRadius: 10, fontSize: 12, lineHeight: 1.5 }}>{error}</div>}
          <button onClick={schedule} disabled={scheduling || (provider === "buffer" && loadingChannels) || (provider === "meta" && loadingMeta)} style={{ border: 0, borderRadius: 10, padding: "12px 14px", background: "#DE0016", color: "white", fontWeight: 800, cursor: "pointer", opacity: scheduling ? 0.65 : 1 }}>
            {scheduling ? "Uploading & Scheduling..." : `Schedule via ${provider === "meta" ? "Meta Direct" : "Buffer"}`}
          </button>
          <div style={{ fontSize: 10, color: "#756b70", lineHeight: 1.55 }}>
            {provider === "meta"
              ? "Combined menyimpan jadwal di server dan memublikasikan media langsung ke Instagram Proxsis Academy melalui Meta Graph API."
              : "Combined meng-upload media ke storage publik, lalu Buffer menjadwalkannya ke Instagram."}
          </div>
        </div>
      )}
    </div>,
    target,
  );
}

function providerButton(active: boolean): React.CSSProperties {
  return {
    border: active ? "1px solid #a3152d" : "1px solid #d9cdd2",
    borderRadius: 10,
    padding: "10px 11px",
    background: active ? "#fff0f1" : "white",
    color: active ? "#a3152d" : "#4c4246",
    fontSize: 11,
    fontWeight: 800,
    cursor: "pointer",
  };
}

const label: React.CSSProperties = { display: "grid", gap: 7, fontSize: 10, fontWeight: 800, letterSpacing: ".05em", color: "#7a666d" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d9cdd2", borderRadius: 10, padding: "10px 11px", fontSize: 12, color: "#251f21", background: "white", outline: "none" };
