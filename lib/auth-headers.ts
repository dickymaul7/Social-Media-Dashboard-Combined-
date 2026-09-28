// Bearer header for the AI routes, which now require a workspace session.
// Reads the same session record AuthGuard/access-control already use.
const SESSION_KEY = "proxsis-auth:session:v1";

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  if (typeof window === "undefined") return { ...extra };
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    const session = raw ? JSON.parse(raw) : null;
    const token = session?.access_token;
    return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
  } catch {
    return { ...extra };
  }
}
