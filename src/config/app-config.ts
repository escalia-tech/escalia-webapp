/** Static application constants. Copy shown to users lives in messages/, not here. */
export const APP_CONFIG = {
  name: "Escalia",
  /** Local dev fallback when no request headers are present (see resolvePublicOrigin). */
  fallbackUrl: "http://localhost:3000",
} as const;
