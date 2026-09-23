const tokensByBrand = new Map<string, string>();

export function getLiveMetaToken(brandId: string) {
  return tokensByBrand.get(brandId) || "";
}

export function setLiveMetaToken(brandId: string, token: string, notify = true) {
  const value = token.trim();
  if (value) tokensByBrand.set(brandId, value);
  else tokensByBrand.delete(brandId);
  if (notify && typeof window !== "undefined") window.dispatchEvent(new Event("meta-live-connection-changed"));
}

export function clearLiveMetaToken(brandId: string) {
  tokensByBrand.delete(brandId);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("meta-live-connection-changed"));
}
