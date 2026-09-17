"use client";

import { ChangeEvent, useRef, useState } from "react";
import { clearImportedAnalytics, importMetaBusinessSuiteCsv, saveImportedAnalytics } from "@/lib/social-dashboard/csv-import";

export function MetaCsvUpload({ onImported, hasImport }: { onImported: () => void; hasImport: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) { setStatus("Pilih file berformat CSV."); return; }
    try {
      const analytics = importMetaBusinessSuiteCsv(file.name, await file.text());
      saveImportedAnalytics(analytics);
      setStatus(`${analytics.media.length} baris data berhasil diimpor dan divisualkan.`);
      onImported();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "CSV tidak dapat diproses.");
    } finally { event.target.value = ""; }
  };
  return <div className="csv-import">
    <div><strong>Impor CSV Meta Business Suite</strong><span>Unggah ekspor Content atau Insights untuk menampilkan datanya langsung di Analytics.</span></div>
    <div className="csv-import-actions">
      <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={onFile} hidden />
      <button type="button" className="ghost" onClick={() => inputRef.current?.click()}>Upload CSV</button>
      {hasImport && <button type="button" className="ghost" onClick={() => { clearImportedAnalytics(); setStatus("Data CSV dihapus. Analytics kembali ke Meta Graph API."); onImported(); }}>Gunakan Live Meta</button>}
    </div>
    {status && <small>{status}</small>}
  </div>;
}
