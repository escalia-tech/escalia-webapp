import "server-only";

import { cookies } from "next/headers";

import { getServerEnv } from "@/server/config/env";

import { ID } from "../schemas/imports.schema";

/** The rows that were not imported, as CSV with an error column, read for this request only (FR-PORT-03 BR-5). */
export async function fetchImportErrorsCsv(params: URLSearchParams, fetcher: typeof fetch = fetch): Promise<Response> {
  const jobId = params.get("jobId");
  const baseUrl = getServerEnv().bffBaseUrl;
  if (jobId === null || !ID.test(jobId) || !baseUrl) return new Response(null, { status: 404 });
  const upstream = await fetcher(new URL(`/pages/imports/${jobId}/errors.csv`, baseUrl), {
    headers: { accept: "text/csv", cookie: (await cookies()).toString() },
    cache: "no-store",
  });
  if (upstream.status === 403 || upstream.status === 404 || upstream.status === 410) {
    return new Response(null, { status: upstream.status });
  }
  if (!upstream.ok) return new Response(null, { status: 502 });
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "cache-control": "no-store",
      "content-disposition": `attachment; filename="erreurs-import-${jobId.slice(0, 8)}.csv"`,
      "x-content-type-options": "nosniff",
    },
  });
}
