"use client";

import { useCallback, useEffect, useState } from "react";
import { AnalyticsPayload, getImportedAnalytics } from "@/lib/social-dashboard/csv-import";
import { readSession } from "@/lib/access-control";

export function useMetaAnalytics() {
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const imported = getImportedAnalytics();
    if (imported) { setData(imported); setError(""); setLoading(false); return; }
    try {
      setLoading(true); setError("");
      const session = readSession();
      const response = await fetch("/api/meta/instagram/analytics", {
        cache: "no-store",
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Gagal memuat Meta analytics.");
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : "Gagal memuat Meta analytics.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void refresh();
    window.addEventListener("meta-csv-imported", refresh);
    return () => window.removeEventListener("meta-csv-imported", refresh);
  }, [refresh]);
  return { data, loading, error, refresh, hasImportedCsv: Boolean(getImportedAnalytics()) };
}
