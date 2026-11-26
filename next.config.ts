import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isProduction = process.env.NODE_ENV === "production";

/**
 * Static security headers. The Content-Security-Policy (nonce based) is generated per request
 * in `src/proxy.ts`, because a nonce cannot be produced at build time.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  // Self-hosted Docker/Kubernetes; Vercel deployments ignore this output mode.
  output: "standalone",
  // Next.js must not rewrite AGENTS.md / CLAUDE.md (project-owned agent instructions).
  agentRules: false,
  poweredByHeader: false,
  // The section was renamed from "properties" to "buildings" (domain vocabulary, escalia-specs page-model).
  async redirects() {
    return [
      { source: "/properties", destination: "/buildings", permanent: true },
      { source: "/properties/:id", destination: "/buildings/:id", permanent: true },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
