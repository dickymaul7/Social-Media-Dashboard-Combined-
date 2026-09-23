"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { clearImportedAnalytics, importMetaBusinessSuiteCsvFiles, saveImportedAnalytics } from "@/lib/social-dashboard/csv-import";
import { clearLiveMetaToken, getLiveMetaToken, setLiveMetaToken } from "@/lib/social-dashboard/meta-live-connection";
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
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const hasLiveToken = Boolean(getLiveMetaToken(activeBrand.id));
  useEffect(() => { setToken(""); setShowToken(false); setStatus(""); }, [activeBrand.id]);
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const invalid = files.find((file) => !file.name.toLowerCase().endsWith(".csv"));
    if (invalid) { setStatus(`${invalid.name} bukan file CSV.`); return; }
    try {
      const analytics = importMetaBusinessSuiteCsvFiles(await Promise.all(files.map(async (file) => ({ fileName: file.name, text: await readCsvText(file) }))));
      saveImportedAnalytics(analytics);
      setStatus(`${files.length} file CSV selesai diproses menjadi ${analytics.media.length} baris data.`);
      onImported();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "CSV tidak dapat diproses.");
    } finally { event.target.value = ""; }
  };
  const connectLiveMeta = (event: FormEvent) => {
    event.preventDefault();
    const value = token.trim();
    if (!value) { setStatus("Masukkan Meta Graph API token terlebih dahulu."); return; }
    if (value.length > 4096) { setStatus("Token terlalu panjang dan tidak dapat diproses."); return; }
    setConnecting(true);
    setLiveMetaToken(activeBrand.id, value, false);
    clearImportedAnalytics();
    setToken("");
    setShowToken(false);
    setStatus(`Menghubungkan data live untuk ${activeBrand.name}…`);
    setConnecting(false);
  };
  return <div className="csv-import">
    <div><strong>Impor CSV Meta Business Suite</strong><span>Pilih satu atau beberapa CSV. File Tayangan, Jangkauan, Interaksi, Pengikut, Kunjungan, dan Klik Tautan akan digabung berdasarkan tanggal.</span></div>
    <div className="csv-import-actions">
      <input ref={inputRef} type="file" accept=".csv,text/csv" multiple onChange={onFile} hidden />
      <button type="button" className="ghost" onClick={() => inputRef.current?.click()}>Upload CSV Files</button>
      {hasImport && <button type="button" className="ghost" onClick={() => { clearImportedAnalytics(); setStatus("Data CSV dihapus."); onImported(); }}>Hapus data CSV</button>}
    </div>
    <form className="meta-token-form" onSubmit={connectLiveMeta}>
      <label htmlFor={`meta-token-${activeBrand.id}`}>
        <span><ShieldCheck size={13}/> Meta Graph API Token · {activeBrand.name}</span>
        <small>Token hanya dipakai selama tab ini terbuka dan tidak disimpan di dashboard.</small>
      </label>
      <div className="meta-token-input">
        <input id={`meta-token-${activeBrand.id}`} type={showToken ? "text" : "password"} value={token} onChange={(event) => setToken(event.target.value)} placeholder={hasLiveToken ? "Token live sudah terhubung" : "Tempel access token Meta"} autoComplete="off" spellCheck={false}/>
        <button type="button" aria-label={showToken ? "Sembunyikan token" : "Tampilkan token"} onClick={() => setShowToken((value) => !value)}>{showToken ? <EyeOff size={15}/> : <Eye size={15}/>}</button>
      </div>
      <button type="submit" className="meta-connect-button" disabled={connecting || !token.trim()}>{connecting ? "Menghubungkan…" : "Hubungkan Live Meta"}</button>
      {hasLiveToken && <button type="button" className="ghost" onClick={() => { clearLiveMetaToken(activeBrand.id); setStatus(`Koneksi live ${activeBrand.name} diputus.`); }}>Putuskan</button>}
    </form>
    {status && <small>{status}</small>}
  </div>;
}
