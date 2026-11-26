import "server-only";

import { cookies } from "next/headers";

import { getServerEnv } from "@/server/config/env";

import { LINK_TOKEN, REQUEST_ID } from "../schemas/signing.schema";

/**
 * The PDF the signer is asked to sign, as the BFF serves it. It is read for this request only (never cached) and sent
 * on with the same type, so the page can show it in a frame (FR-DOC-02 BR-4: the signer reads before signing).
 */
export async function fetchSignDocument(params: URLSearchParams, fetcher: typeof fetch = fetch): Promise<Response> {
  const requestId = params.get("requestId");
  const token = params.get("token");
  const path =
    requestId !== null && REQUEST_ID.test(requestId)
      ? `/pages/sign/${requestId}/document`
      : token !== null && LINK_TOKEN.test(token)
        ? `/pages/sign/link/${token}/document`
        : undefined;
  const baseUrl = getServerEnv().bffBaseUrl;
  if (!path || !baseUrl) return new Response(null, { status: 404 });
  const upstream = await fetcher(new URL(path, baseUrl), {
    headers: { accept: "application/pdf", cookie: (await cookies()).toString() },
    cache: "no-store",
  });
  if (!upstream.ok) return new Response(null, { status: upstream.status === 404 ? 404 : 502 });
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "cache-control": "no-store",
      "content-disposition": 'inline; filename="document.pdf"',
      "x-content-type-options": "nosniff",
    },
  });
}
