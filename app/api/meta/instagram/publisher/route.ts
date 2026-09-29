import { NextResponse } from "next/server";
import {
  metaPublishingSupabase,
  resolvePublishingAccount,
} from "@/lib/server/meta-instagram-publishing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStoreHeaders = { "Cache-Control": "no-store, max-age=0" };

function getBearer(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

async function validateWorkspaceSession(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return { id: "local" };
  const token = getBearer(request);
  if (!token) return null;
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return response.ok ? response.json().catch(() => null) : null;
  } catch {
    return null;
  }
}

async function hasWorkspacePermission(request: Request, permission: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return true;
  const token = getBearer(request);
  if (!token) return false;
  const response = await fetch(`${url}/rest/v1/rpc/smm_has_access_permission`, {
    method: "POST",
    headers: { apikey: anon, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_permission_key: permission }),
    cache: "no-store",
  }).catch(() => null);
  return Boolean(response?.ok && await response.json().catch(() => false));
}

async function canAccessBrand(actorId: string, brandId: string) {
  const { url, service, headers } = metaPublishingSupabase();
  if (!url || !service || actorId === "local") return true;
  const roleResponse = await fetch(
    `${url}/rest/v1/user_roles?select=roles(key)&user_id=eq.${encodeURIComponent(actorId)}&limit=1`,
    { headers, cache: "no-store" },
  );
  const roles = await roleResponse.json().catch(() => []);
  if (roles?.[0]?.roles?.key === "super_admin") return true;
  const accessResponse = await fetch(
    `${url}/rest/v1/user_brand_access?select=brand_id&user_id=eq.${encodeURIComponent(actorId)}&brand_id=eq.${encodeURIComponent(brandId)}&limit=1`,
    { headers, cache: "no-store" },
  );
  const rows = await accessResponse.json().catch(() => []);
  return accessResponse.ok && Array.isArray(rows) && rows.length > 0;
}

async function authenticatedBrand(request: Request, brandId: string) {
  const actor = await validateWorkspaceSession(request);
  if (!actor?.id) return { error: "Session login tidak valid.", status: 401 } as const;
  if (!brandId || !(await canAccessBrand(String(actor.id), brandId))) {
    return { error: "Brand tidak valid atau tidak dapat diakses.", status: 403 } as const;
  }
  return { actor } as const;
}

export async function GET(request: Request) {
  const brandId = new URL(request.url).searchParams.get("brandId")?.trim() || "";
  const auth = await authenticatedBrand(request, brandId);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status, headers: noStoreHeaders });
  }
  try {
    const { account, brandName } = await resolvePublishingAccount(brandId);
    return NextResponse.json({
      ok: true,
      eligible: true,
      brand: { id: brandId, name: brandName },
      account: { id: account.id, username: account.username, name: account.name, pageName: account.pageName },
    }, { headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      eligible: false,
      error: error instanceof Error ? error.message : "Koneksi Meta Direct tidak tersedia.",
    }, { status: 409, headers: noStoreHeaders });
  }
}

type ScheduleBody = {
  brandId?: string;
  briefId?: string;
  caption?: string;
  mediaUrl?: string;
  mediaType?: "image" | "video";
  scheduledFor?: string;
};

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as ScheduleBody;
  const brandId = body.brandId?.trim() || "";
  const auth = await authenticatedBrand(request, brandId);
  if ("error" in auth) {
    return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status, headers: noStoreHeaders });
  }
  if (!(await hasWorkspacePermission(request, "calendar.schedule"))) {
    return NextResponse.json({ ok: false, error: "Akun ini tidak memiliki izin calendar.schedule." }, { status: 403, headers: noStoreHeaders });
  }

  const mediaUrl = body.mediaUrl?.trim() || "";
  const scheduledFor = body.scheduledFor?.trim() || "";
  const due = new Date(scheduledFor);
  if (!mediaUrl || !/^https:\/\//i.test(mediaUrl)) {
    return NextResponse.json({ ok: false, error: "Meta membutuhkan direct public media URL dengan https://." }, { status: 400, headers: noStoreHeaders });
  }
  if (!scheduledFor || Number.isNaN(due.getTime()) || due.getTime() <= Date.now() + 60_000) {
    return NextResponse.json({ ok: false, error: "Waktu publish harus valid dan berada di masa depan." }, { status: 400, headers: noStoreHeaders });
  }

  try {
    const { account, brandName } = await resolvePublishingAccount(brandId);
    const { url, service, headers } = metaPublishingSupabase();
    if (!url || !service) throw new Error("Supabase service role belum dikonfigurasi untuk antrean Meta Direct.");
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const job = {
      id,
      brand_id: brandId,
      brand_name: brandName,
      brief_id: body.briefId?.trim() || null,
      instagram_account_id: account.id,
      instagram_username: account.username,
      caption: body.caption?.trim() || "",
      media_url: mediaUrl,
      media_type: body.mediaType === "video" ? "video" : "image",
      scheduled_for: due.toISOString(),
      status: "scheduled",
      attempts: 0,
      next_attempt_at: due.toISOString(),
      created_by: String(auth.actor.id),
      created_at: now,
      updated_at: now,
    };
    const response = await fetch(`${url}/rest/v1/meta_publish_jobs`, {
      method: "POST",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify(job),
      cache: "no-store",
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const databaseMessage = String(payload?.message || "");
      if (payload?.code === "PGRST205" || databaseMessage.includes("meta_publish_jobs")) {
        throw new Error("Tabel antrean Meta Direct belum tersedia di Supabase. Jalankan migration 20260929_meta_direct_publishing.sql terlebih dahulu.");
      }
      throw new Error(databaseMessage || "Antrean Meta Direct gagal disimpan.");
    }
    return NextResponse.json({
      ok: true,
      job: { id, status: "scheduled", scheduledFor: due.toISOString() },
      account: { id: account.id, username: account.username, name: account.name },
    }, { status: 201, headers: noStoreHeaders });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Scheduling Meta Direct gagal.",
    }, { status: 502, headers: noStoreHeaders });
  }
}
