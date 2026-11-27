import "server-only";

import { cookies } from "next/headers";

import { getServerEnv } from "@/server/config/env";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The ledger of a lease as a CSV, read for this request only and never cached (FR-LEDG-01 section 3). */
export async function fetchLedgerCsv(params: URLSearchParams, fetcher: typeof fetch = fetch): Promise<Response> {
  const leaseId = params.get("leaseId");
  const tenant = params.get("as") === "tenant";
  const baseUrl = getServerEnv().bffBaseUrl;
  if (leaseId === null || !ID.test(leaseId) || !baseUrl) return new Response(null, { status: 404 });
  const path = tenant ? `/pages/tenant/leases/${leaseId}/ledger.csv` : `/pages/leases/${leaseId}/ledger.csv`;
  const upstream = await fetcher(new URL(path, baseUrl), {
    headers: { accept: "text/csv", cookie: (await cookies()).toString() },
    cache: "no-store",
  });
  if (upstream.status === 403 || upstream.status === 404) return new Response(null, { status: upstream.status });
  if (!upstream.ok) return new Response(null, { status: 502 });
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="ledger-${leaseId.slice(0, 8)}.csv"`,
      "x-content-type-options": "nosniff",
    },
  });
}
