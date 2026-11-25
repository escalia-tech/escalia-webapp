import "server-only";

import { getServerEnv } from "../config/env";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Demo session token (HMAC signed, HttpOnly cookie). It exists ONLY while demo mode is enabled in a
 * non-production environment and stands in for the real identity-provider session, which is not
 * available yet. No credential is ever collected or stored; the token proves nothing about a person.
 *
 * Format: v1.<expiresAtEpochSeconds>.<nonce>.<signature>
 */

export const DEMO_SESSION_TTL_SECONDS = 8 * 60 * 60;

const globalStore = globalThis as typeof globalThis & { __escaliaDemoSecret?: string };

function getSecret(): string {
  const configured = getServerEnv().demoSessionSecret;
  if (configured) return configured;

  const vercelProjectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (vercelProjectId) {
    // Vercel serverless: one secret per project so POST and RSC verify on different lambdas still match.
    return createHmac("sha256", "escalia-vercel-demo-v1").update(vercelProjectId).digest("hex");
  }

  // Ephemeral per-process secret: sessions are invalidated on restart. Shared through globalThis
  // because Next.js can bundle route handlers and server components separately.
  globalStore.__escaliaDemoSecret ??= randomBytes(32).toString("hex");
  return globalStore.__escaliaDemoSecret;
}

function sign(payload: string): string {
  return createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function issueDemoSessionToken(nowMs: number = Date.now()): string {
  const expiresAt = Math.floor(nowMs / 1000) + DEMO_SESSION_TTL_SECONDS;
  const payload = `v1.${expiresAt}.${randomBytes(12).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyDemoSessionToken(token: string | undefined, nowMs: number = Date.now()): { id: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [version, expires, nonce, signature] = parts as [string, string, string, string];
  if (version !== "v1") return null;

  const payload = `${version}.${expires}.${nonce}`;
  const expected = Buffer.from(sign(payload));
  const provided = Buffer.from(signature);
  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) return null;

  const expiresAt = Number(expires);
  if (!Number.isInteger(expiresAt) || expiresAt * 1000 <= nowMs) return null;
  return { id: nonce.slice(0, 8) };
}
