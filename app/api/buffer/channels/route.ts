import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BUFFER_ENDPOINT = "https://api.buffer.com";

function getBearer(request: Request) {
  const value = request.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value.slice(7).trim() : "";
}

async function validateWorkspaceSession(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return true;
  const token = getBearer(request);
  if (!token) return false;
  try {
    const response = await fetch(`${url}/auth/v1/user`, {
      headers: { apikey: anon, Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function bufferRequest(query: string, variables?: Record<string, unknown>) {
  const apiKey = process.env.BUFFER_API_KEY;
  if (!apiKey) throw new Error("BUFFER_API_KEY belum dikonfigurasi di environment Vercel.");
  const response = await fetch(BUFFER_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.message || `Buffer API error ${response.status}.`);
  if (payload?.errors?.length) throw new Error(payload.errors[0]?.message || "Buffer API request gagal.");
  return payload?.data;
}

export async function GET(request: Request) {
  if (!(await validateWorkspaceSession(request))) {
    return NextResponse.json({ ok: false, error: "Session login tidak valid." }, { status: 401 });
  }
  try {
    const account = await bufferRequest(`
      query BufferOrganizations {
        account { organizations { id name channelCount } }
      }
    `);
    const organizations = account?.account?.organizations ?? [];
    if (!organizations.length) {
      return NextResponse.json({ ok: false, error: "Tidak ada Buffer organization pada API key ini." }, { status: 404 });
    }
    const channelQuery = `
      query BufferChannels($organizationId: OrganizationId!) {
        channels(input: { organizationId: $organizationId }) {
          id name displayName service descriptor externalLink avatar
          isQueuePaused isDisconnected isLocked timezone
        }
      }
    `;
    const organizationResults = await Promise.all(
      organizations.map(async (organization: { id: string; name: string; channelCount?: number }) => {
        const channelData = await bufferRequest(channelQuery, { organizationId: organization.id });
        return (channelData?.channels ?? []).map((channel: any) => ({
          ...channel,
          organizationId: organization.id,
          organizationName: organization.name,
        }));
      }),
    );
    const channels = organizationResults.flat();
    const activeChannels = channels.filter((channel: any) => !channel.isDisconnected && !channel.isLocked);
    return NextResponse.json({
      ok: true,
      organizations: organizations.map((organization: { id: string; name: string; channelCount?: number }) => ({
        id: organization.id,
        name: organization.name,
        channelCount: organization.channelCount ?? null,
      })),
      channels,
      diagnostics: {
        organizationCount: organizations.length,
        declaredChannelCount: organizations.reduce((total: number, organization: { channelCount?: number }) => total + Number(organization.channelCount || 0), 0),
        returnedChannelCount: channels.length,
        activeChannelCount: activeChannels.length,
        services: Array.from(new Set(channels.map((channel: any) => String(channel.service || "unknown")))),
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Gagal membaca channel Buffer." }, { status: 500 });
  }
}
