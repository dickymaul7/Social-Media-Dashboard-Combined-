"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnalyticsPayload, getImportedAnalytics } from "@/lib/social-dashboard/csv-import";
import { readSession } from "@/lib/access-control";
import { useActiveBrand } from "@/components/active-brand";

export function useMetaAnalytics() {
  const { activeBrand } = useActiveBrand();
  const [data, setData] = useState<AnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestNumber = useRef(0);
  const refresh = useCallback(async () => {
    const currentRequest = ++requestNumber.current;
    const imported = getImportedAnalytics(activeBrand.id);
    if (imported) {
      if (currentRequest === requestNumber.current) { setData(imported); setError(""); setLoading(false); }
      return;
    }
    try {
      setData(null); setLoading(true); setError("");
      const session = readSession();
      const response = await fetch(`/api/meta/instagram/analytics?brandId=${encodeURIComponent(activeBrand.id)}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error || "Gagal memuat Meta analytics.");
      if (currentRequest === requestNumber.current) setData(payload);
    } catch (err) {
      if (currentRequest === requestNumber.current) {
        setData(null);
        setError(err instanceof Error ? err.message : "Gagal memuat Meta analytics.");
      }
    } finally {
      if (currentRequest === requestNumber.current) setLoading(false);
    }
  }, [activeBrand.id]);
  useEffect(() => {
    void refresh();
    window.addEventListener("meta-csv-imported", refresh);
    window.addEventListener("meta-live-connection-changed", refresh);
    return () => {
      window.removeEventListener("meta-csv-imported", refresh);
      window.removeEventListener("meta-live-connection-changed", refresh);
    };
  }, [refresh]);
  return { data, loading, error, refresh, hasImportedCsv: Boolean(getImportedAnalytics(activeBrand.id)) };
}
