import "server-only";

import { NextResponse } from "next/server";

import type { AppMetadata } from "@/lib/app-metadata";

const HEALTH_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate",
  Pragma: "no-cache",
} as const;

export interface HealthPayload {
  status: "ok" | "unavailable";
  name: string;
  version: string;
  revision?: string;
}

export function healthJson(metadata: AppMetadata, status: HealthPayload["status"], httpStatus: number): NextResponse {
  const body: HealthPayload = {
    status,
    name: metadata.name,
    version: metadata.version,
    ...(metadata.revision ? { revision: metadata.revision } : {}),
  };
  return NextResponse.json(body, { status: httpStatus, headers: HEALTH_HEADERS });
}
