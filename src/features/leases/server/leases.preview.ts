import "server-only";

import { cookies } from "next/headers";

import { getServerEnv } from "@/server/config/env";

const LEASE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The draft preview of a lease as the BFF serves it (FR-LEASE-01). It is a working copy marked as a draft, read for
 * this request only (never cached) and sent on with the same type so the page can open it in a frame.
 */
export async function fetchLeasePreview(params: URLSearchParams, fetcher: typeof fetch = fetch): Promise<Response> {
  const leaseId = params.get("leaseId");
  const baseUrl = getServerEnv().bffBaseUrl;
  if (leaseId === null || !LEASE_ID.test(leaseId) || !baseUrl) return new Response(null, { status: 404 });
  const upstream = await fetcher(new URL(`/pages/leases/${leaseId}/preview`, baseUrl), {
    headers: { accept: "application/pdf", cookie: (await cookies()).toString() },
    cache: "no-store",
  });
  if (!upstream.ok) return new Response(null, { status: upstream.status === 404 ? 404 : 502 });
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "cache-control": "no-store",
      "content-disposition": 'inline; filename="lease-draft.pdf"',
      "x-content-type-options": "nosniff",
    },
  });
}
