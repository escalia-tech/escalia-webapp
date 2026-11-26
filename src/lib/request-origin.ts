/**
 * Public origin for metadata and diagnostics — derived from the incoming request, not from env.
 */
export function resolvePublicOrigin(headers: Pick<Headers, "get">): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (host) {
    const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const proto = forwardedProto ?? (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
    return `${proto}://${host}`;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return vercelUrl.startsWith("http") ? vercelUrl : `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}
