"use client";

import { ChangeEvent, useRef, useState } from "react";
import { clearImportedAnalytics, importMetaBusinessSuiteCsvFiles, saveImportedAnalytics } from "@/lib/social-dashboard/csv-import";

export function MetaCsvUpload({ onImported, hasImport }: { onImported: () => void; hasImport: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const invalid = files.find((file) => !file.name.toLowerCase().endsWith(".csv"));
    if (invalid) { setStatus(`${invalid.name} bukan file CSV.`); return; }
    try {
      const analytics = importMetaBusinessSuiteCsvFiles(await Promise.all(files.map(async (file) => ({ fileName: file.name, text: await file.text() }))));
      saveImportedAnalytics(analytics);
      setStatus(`${files.length} file CSV selesai diproses menjadi ${analytics.media.length} baris data.`);
      onImported();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "CSV tidak dapat diproses.");
    } finally { event.target.value = ""; }
  };
  return <div className="csv-import">
    <div><strong>Impor CSV Meta Business Suite</strong><span>Pilih satu atau beberapa CSV. File Tayangan, Jangkauan, Interaksi, Pengikut, Kunjungan, dan Klik Tautan akan digabung berdasarkan tanggal.</span></div>
    <div className="csv-import-actions">
      <input ref={inputRef} type="file" accept=".csv,text/csv" multiple onChange={onFile} hidden />
      <button type="button" className="ghost" onClick={() => inputRef.current?.click()}>Upload CSV Files</button>
      {hasImport && <button type="button" className="ghost" onClick={() => { clearImportedAnalytics(); setStatus("Data CSV dihapus. Analytics kembali ke Meta Graph API."); onImported(); }}>Gunakan Live Meta</button>}
    </div>
    {status && <small>{status}</small>}
  </div>;
}
