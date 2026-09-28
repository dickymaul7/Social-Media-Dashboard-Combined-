import { NextResponse } from "next/server";
import { localWorkspaceAllowed } from "@/lib/local-mode";

// Server-side session gate for the AI routes. Mirrors the bearer check already
// used by /api/buffer/* and /api/meta/*. Fail-closed when Supabase is
// configured; open only when ALLOW_LOCAL_WORKSPACE=1 (offline dev).
export async function requireWorkspaceSession(request: Request): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return localWorkspaceAllowed();
  const raw = request.headers.get("authorization") || "";
  const token = raw.toLowerCase().startsWith("bearer ") ? raw.slice(7).trim() : "";
  if (!token) return false;
  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function unauthorizedJson() {
  return NextResponse.json({ ok: false, error: "Sesi workspace tidak valid." }, { status: 401 });
}
