import { NextResponse } from "next/server";
import {
  createInstagramContainer,
  getInstagramContainerStatus,
  metaPublishingSupabase,
  publishInstagramContainer,
  resolvePublishingAccount,
} from "@/lib/server/meta-instagram-publishing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

type PublishJob = {
  id: string;
  brand_id: string;
  instagram_account_id: string;
  caption: string;
  media_url: string;
  media_type: "image" | "video";
  status: "scheduled" | "processing";
  meta_container_id: string | null;
  attempts: number;
};

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

async function patchJob(
  id: string,
  values: Record<string, unknown>,
  expected?: { status?: string; attempts?: number },
) {
  const { url, headers } = metaPublishingSupabase();
  const statusFilter = expected?.status ? `&status=eq.${encodeURIComponent(expected.status)}` : "";
  const attemptFilter = typeof expected?.attempts === "number" ? `&attempts=eq.${expected.attempts}` : "";
  const response = await fetch(`${url}/rest/v1/meta_publish_jobs?id=eq.${encodeURIComponent(id)}${statusFilter}${attemptFilter}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ ...values, updated_at: new Date().toISOString() }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => []);
  if (!response.ok) throw new Error(payload?.message || "Status publish job gagal diperbarui.");
  return Array.isArray(payload) ? payload : [];
}

async function processJob(job: PublishJob) {
  const attempt = Number(job.attempts || 0) + 1;
  // Status + attempt count form an optimistic lock, preventing two overlapping
  // cron invocations from publishing the same container twice.
  const claimed = await patchJob(
    job.id,
    { status: "processing", attempts: attempt },
    { status: job.status, attempts: Number(job.attempts || 0) },
  );
  if (!claimed.length) return { id: job.id, status: "skipped" };
  try {
    const { account } = await resolvePublishingAccount(job.brand_id);
    if (account.id !== job.instagram_account_id) {
      throw new Error("Akun Instagram brand berubah sejak jadwal dibuat. Buat jadwal baru untuk keamanan.");
    }

    let containerId = job.meta_container_id;
    if (!containerId) {
      containerId = await createInstagramContainer({
        account,
        caption: job.caption,
        mediaUrl: job.media_url,
        mediaType: job.media_type,
      });
      await patchJob(job.id, { meta_container_id: containerId });
    }

    const container = await getInstagramContainerStatus(containerId, account.token);
    if (["ERROR", "EXPIRED"].includes(container.code)) {
      throw new Error(container.message || `Media container berstatus ${container.code}.`);
    }
    if (container.code !== "FINISHED") {
      const nextAttempt = new Date(Date.now() + 60_000).toISOString();
      await patchJob(job.id, {
        status: "processing",
        next_attempt_at: nextAttempt,
        error_message: container.message || "Media masih diproses Meta.",
      });
      return { id: job.id, status: "processing", container: container.code || "IN_PROGRESS" };
    }

    const mediaId = await publishInstagramContainer(account.id, containerId, account.token);
    await patchJob(job.id, {
      status: "published",
      meta_media_id: mediaId,
      published_at: new Date().toISOString(),
      next_attempt_at: null,
      error_message: null,
    });
    return { id: job.id, status: "published", mediaId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Publikasi Meta gagal.";
    const finalFailure = attempt >= 5;
    await patchJob(job.id, {
      status: finalFailure ? "failed" : "processing",
      next_attempt_at: finalFailure ? null : new Date(Date.now() + Math.min(attempt * 2, 10) * 60_000).toISOString(),
      error_message: message,
    });
    return { id: job.id, status: finalFailure ? "failed" : "retrying", error: message };
  }
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const { url, service, headers } = metaPublishingSupabase();
  if (!url || !service) {
    return NextResponse.json({ ok: false, error: "Supabase service role belum dikonfigurasi." }, { status: 500 });
  }
  const now = encodeURIComponent(new Date().toISOString());
  const query = `select=id,brand_id,instagram_account_id,caption,media_url,media_type,status,meta_container_id,attempts&status=in.(scheduled,processing)&scheduled_for=lte.${now}&next_attempt_at=lte.${now}&order=scheduled_for.asc&limit=10`;
  const response = await fetch(`${url}/rest/v1/meta_publish_jobs?${query}`, { headers, cache: "no-store" });
  const jobs = await response.json().catch(() => []);
  if (!response.ok) {
    return NextResponse.json({ ok: false, error: jobs?.message || "Antrean Meta Direct gagal dibaca." }, { status: 502 });
  }
  const results = [];
  for (const job of jobs as PublishJob[]) results.push(await processJob(job));
  return NextResponse.json({ ok: true, processed: results.length, results });
}
