import "server-only";

import { ApplicationError } from "@/lib/observability/errors/application-error";
import { getLogger } from "@/lib/observability/logger/logger.server";
import { elapsedMs } from "@/lib/observability/tracing/request-context";
import { demoBuildingsRepository } from "@/server/adapters/demo/buildings.demo-repository";
import { withTimeout } from "@/server/bff/timeout";
import { isDemoModeEnabled } from "@/server/config/env";

import type {
  BuildingDetailResult,
  BuildingListQuery,
  BuildingListResult,
  DashboardSummary,
} from "../schemas/building.schema";
import type { BuildingsRepository } from "./buildings.repository";

/**
 * Buildings service (server only). Used directly by Server Components and by the BFF route
 * handlers, so both paths share validation, timeout, logging and error mapping.
 *
 * Fail closed: without an approved data source the service refuses to answer. The demo adapter is
 * selected ONLY when demo mode is enabled in a non-production environment.
 */

const BUILDING_ID = /^[a-z0-9-]{3,40}$/;

function getRepository(): BuildingsRepository {
  if (isDemoModeEnabled()) return demoBuildingsRepository;
  throw new ApplicationError("upstream.unavailable", "No buildings data source is configured", {
    retryable: false,
  });
}

export async function listBuildings(query: BuildingListQuery): Promise<BuildingListResult> {
  const logger = getLogger("buildings");
  const repository = getRepository();
  const startedAt = performance.now();

  const page = await withTimeout("buildings.list", (signal) => repository.list(query, { signal }));
  const pageCount = Math.max(1, Math.ceil(page.totalCount / query.pageSize));

  logger.info("buildings.list.completed", {
    durationMs: elapsedMs(startedAt),
    resultCount: page.items.length,
    totalCount: page.totalCount,
    page: query.page,
    pageSize: query.pageSize,
  });

  return {
    items: page.items,
    page: query.page,
    pageSize: query.pageSize,
    totalCount: page.totalCount,
    pageCount,
    meta: { source: repository.source, period: repository.period },
  };
}

export async function getBuilding(id: string): Promise<BuildingDetailResult> {
  const logger = getLogger("buildings");
  if (!BUILDING_ID.test(id)) {
    throw new ApplicationError("resource.not_found", "Building not found");
  }
  const repository = getRepository();
  const startedAt = performance.now();

  const building = await withTimeout("buildings.get", (signal) => repository.get(id, { signal }));
  if (!building) {
    throw new ApplicationError("resource.not_found", "Building not found");
  }

  logger.info("buildings.detail.completed", { durationMs: elapsedMs(startedAt) });
  return { building, meta: { source: repository.source, period: repository.period } };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const logger = getLogger("dashboard");
  const repository = getRepository();
  const startedAt = performance.now();

  const summary = await withTimeout("dashboard.summary", (signal) => repository.dashboard({ signal }));

  logger.info("dashboard.summary.completed", { durationMs: elapsedMs(startedAt), resultCount: summary.monthly.length });
  return { ...summary, meta: { source: repository.source, period: repository.period } };
}
