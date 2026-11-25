import "server-only";

import { ApplicationError } from "@/lib/observability/errors/application-error";
import { getLogger } from "@/lib/observability/logger/logger.server";
import { elapsedMs } from "@/lib/observability/tracing/request-context";
import { demoPropertiesRepository } from "@/server/adapters/demo/properties.demo-repository";
import { withTimeout } from "@/server/bff/timeout";
import { isDemoModeEnabled } from "@/server/config/env";

import type {
  DashboardSummary,
  PropertyDetailResult,
  PropertyListQuery,
  PropertyListResult,
} from "../schemas/property.schema";
import type { PropertiesRepository } from "./properties.repository";

/**
 * Properties service (server only). Used directly by Server Components and by the BFF route
 * handlers, so both paths share validation, timeout, logging and error mapping.
 *
 * Fail closed: without an approved data source the service refuses to answer. The demo adapter is
 * selected ONLY when demo mode is enabled in a non-production environment.
 */

const PROPERTY_ID = /^[a-z0-9-]{3,40}$/;

function getRepository(): PropertiesRepository {
  if (isDemoModeEnabled()) return demoPropertiesRepository;
  throw new ApplicationError("upstream.unavailable", "No properties data source is configured", {
    retryable: false,
  });
}

export async function listProperties(query: PropertyListQuery): Promise<PropertyListResult> {
  const logger = getLogger("properties");
  const repository = getRepository();
  const startedAt = performance.now();

  const page = await withTimeout("properties.list", (signal) => repository.list(query, { signal }));
  const pageCount = Math.max(1, Math.ceil(page.totalCount / query.pageSize));

  logger.info("properties.list.completed", {
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

export async function getProperty(id: string): Promise<PropertyDetailResult> {
  const logger = getLogger("properties");
  if (!PROPERTY_ID.test(id)) {
    throw new ApplicationError("resource.not_found", "Property not found");
  }
  const repository = getRepository();
  const startedAt = performance.now();

  const property = await withTimeout("properties.get", (signal) => repository.get(id, { signal }));
  if (!property) {
    throw new ApplicationError("resource.not_found", "Property not found");
  }

  logger.info("properties.detail.completed", { durationMs: elapsedMs(startedAt) });
  return { property, meta: { source: repository.source, period: repository.period } };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const logger = getLogger("dashboard");
  const repository = getRepository();
  const startedAt = performance.now();

  const summary = await withTimeout("dashboard.summary", (signal) => repository.dashboard({ signal }));

  logger.info("dashboard.summary.completed", { durationMs: elapsedMs(startedAt), resultCount: summary.monthly.length });
  return { ...summary, meta: { source: repository.source, period: repository.period } };
}
