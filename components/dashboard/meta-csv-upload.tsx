"use client";

import { ChangeEvent, useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { clearImportedAnalytics, importMetaBusinessSuiteCsvFiles, saveImportedAnalytics } from "@/lib/social-dashboard/csv-import";
import { LiveMetaAccount } from "@/lib/social-dashboard/meta-live-connection";
import { hasPermission, readSession } from "@/lib/access-control";
import { useActiveBrand } from "@/components/active-brand";

async function readCsvText(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let oddNullBytes = 0;
  for (let index = 1; index < Math.min(bytes.length, 200); index += 2) if (bytes[index] === 0) oddNullBytes += 1;
  const isUtf16Le = (bytes[0] === 0xff && bytes[1] === 0xfe) || oddNullBytes > 20;
  const isUtf16Be = bytes[0] === 0xfe && bytes[1] === 0xff;
  if (isUtf16Le) return new TextDecoder("utf-16le").decode(buffer);
  if (isUtf16Be) return new TextDecoder("utf-16be").decode(buffer);
  return new TextDecoder("utf-8").decode(buffer);
}

export function MetaCsvUpload({ onImported, hasImport }: { onImported: () => void; hasImport: boolean }) {
  const { activeBrand } = useActiveBrand();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [accounts, setAccounts] = useState<LiveMetaAccount[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [canConfigure, setCanConfigure] = useState(false);
  const [configuring, setConfiguring] = useState(false);
  useEffect(() => {
    let cancelled = false;
    setAccounts([]);
    setSelectedAccountId("");
    setStatus("");
    void hasPermission("brand.edit").then(async (allowed) => {
      if (cancelled) return;
      setCanConfigure(allowed);
      if (!allowed) return;
      const session = readSession();
      const response = await fetch("/api/meta/instagram/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ action: "accounts", brandId: activeBrand.id }),
        cache: "no-store",
      });
      const payload = await response.json().catch(() => ({}));
      if (cancelled) return;
      if (!response.ok) { setStatus(payload?.error || "Daftar akun Meta tidak dapat dimuat."); return; }
      setAccounts(Array.isArray(payload?.accounts) ? payload.accounts : []);
      setSelectedAccountId(String(payload?.selectedAccountId || ""));
    });
    return () => { cancelled = true; };
  }, [activeBrand.id]);
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const invalid = files.find((file) => !file.name.toLowerCase().endsWith(".csv"));
    if (invalid) { setStatus(`${invalid.name} bukan file CSV.`); return; }
    try {
      const analytics = importMetaBusinessSuiteCsvFiles(await Promise.all(files.map(async (file) => ({ fileName: file.name, text: await readCsvText(file) }))));
      saveImportedAnalytics(activeBrand.id, analytics);
      setStatus(`${files.length} file CSV selesai diproses menjadi ${analytics.media.length} baris data.`);
      onImported();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "CSV tidak dapat diproses.");
    } finally { event.target.value = ""; }
  };
  const assignAccount = async () => {
    if (!selectedAccountId) return;
    setConfiguring(true);
    try {
      const session = readSession();
      const response = await fetch("/api/meta/instagram/analytics", {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json", ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({ action: "assign", brandId: activeBrand.id, igUserId: selectedAccountId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Akun Instagram tidak dapat disimpan.");
      clearImportedAnalytics(activeBrand.id);
      const account = payload?.account as LiveMetaAccount;
      setStatus(`${account?.username ? `@${account.username}` : account?.name || "Akun Instagram"} tersimpan untuk ${activeBrand.name}. Semua user akan memakai koneksi ini.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Konfigurasi Meta tidak dapat disimpan.");
    } finally { setConfiguring(false); }
  };
  return <div className="csv-import">
    <div><strong>Impor CSV Meta Business Suite</strong><span>Pilih satu atau beberapa CSV. File Tayangan, Jangkauan, Interaksi, Pengikut, Kunjungan, dan Klik Tautan akan digabung berdasarkan tanggal.</span></div>
    <div className="csv-import-actions">
      <input ref={inputRef} type="file" accept=".csv,text/csv" multiple onChange={onFile} hidden />
      <button type="button" className="ghost" onClick={() => inputRef.current?.click()}>Upload CSV Files</button>
      {hasImport && <button type="button" className="ghost" onClick={() => { clearImportedAnalytics(activeBrand.id); setStatus(`Data CSV ${activeBrand.name} dihapus.`); onImported(); }}>Hapus data CSV</button>}
    </div>
    <div className="meta-token-form">
      <div className="meta-connection-copy">
        <span className="meta-central-label"><ShieldCheck size={13}/> Live Meta terpusat · {activeBrand.name}</span>
        <small>Dashboard otomatis mengikuti brand aktif. User lain tidak perlu memasukkan access token.</small>
      </div>
      {canConfigure && accounts.length > 0 && <div className="meta-account-picker">
        <label htmlFor={`meta-account-${activeBrand.id}`}><span>Akun Instagram yang ditampilkan</span>
          <select id={`meta-account-${activeBrand.id}`} value={selectedAccountId} onChange={(event) => setSelectedAccountId(event.target.value)}>
            <option value="">Pilih akun Instagram</option>
            {accounts.map((account) => <option key={account.id} value={account.id}>{account.username ? `@${account.username}` : account.name} · {account.pageName}</option>)}
          </select>
        </label>
        <button type="button" className="meta-connect-button" disabled={!selectedAccountId || configuring} onClick={() => void assignAccount()}>{configuring ? "Menyimpan…" : "Simpan untuk brand"}</button>
      </div>}
    </div>
    {status && <small>{status}</small>}
  </div>;
}
