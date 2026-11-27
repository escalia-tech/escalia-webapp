import "server-only";

import { cookies } from "next/headers";

import { getServerEnv } from "@/server/config/env";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const VERSION = /^[1-9]\d{0,5}$/;

/** One version of the by-laws as a PDF, read for this request only and never cached (FR-LEASE-03 BR-10). */
export async function fetchBylawsPdf(params: URLSearchParams, fetcher: typeof fetch = fetch): Promise<Response> {
  const buildingId = params.get("buildingId");
  const version = params.get("version");
  const baseUrl = getServerEnv().bffBaseUrl;
  if (buildingId === null || !ID.test(buildingId) || version === null || !VERSION.test(version) || !baseUrl) {
    return new Response(null, { status: 404 });
  }
  const upstream = await fetcher(new URL(`/pages/buildings/${buildingId}/bylaws/${version}/pdf`, baseUrl), {
    headers: { accept: "application/pdf", cookie: (await cookies()).toString() },
    cache: "no-store",
  });
  if (!upstream.ok) return new Response(null, { status: upstream.status === 404 ? 404 : 502 });
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "cache-control": "no-store",
      "content-disposition": `inline; filename="bylaws-v${version}.pdf"`,
      "x-content-type-options": "nosniff",
    },
  });
}
