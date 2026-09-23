export type LiveMetaAccount = {
  id: string;
  username: string;
  name: string;
  pageName: string;
};

export type LiveMetaConnection = {
  token: string;
  igUserId: string;
  username?: string;
  name?: string;
  pageName?: string;
  accounts?: LiveMetaAccount[];
};

const connectionsByBrand = new Map<string, LiveMetaConnection>();

export function getLiveMetaConnection(brandId: string) {
  return connectionsByBrand.get(brandId) || null;
}

export function setLiveMetaConnection(brandId: string, connection: LiveMetaConnection, notify = true) {
  const token = connection.token.trim();
  if (token && connection.igUserId) connectionsByBrand.set(brandId, { ...connection, token });
  else connectionsByBrand.delete(brandId);
  if (notify && typeof window !== "undefined") window.dispatchEvent(new Event("meta-live-connection-changed"));
}

export function clearLiveMetaConnection(brandId: string) {
  connectionsByBrand.delete(brandId);
  if (typeof window !== "undefined") window.dispatchEvent(new Event("meta-live-connection-changed"));
}
