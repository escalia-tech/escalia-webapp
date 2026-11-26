import "server-only";

import type { BuildingDetail, BuildingListQuery, BuildingSummary, DashboardSummary } from "../schemas/building.schema";

/**
 * Data-source port of the buildings feature. The only implementation today is the demo adapter
 * (fixtures). When the real backend contract is specified, add a new adapter here; services, the BFF
 * and the UI keep working against this interface. No upstream endpoint is assumed.
 */
export interface RepositoryContext {
  signal: AbortSignal;
}

export interface BuildingsPage {
  items: BuildingSummary[];
  totalCount: number;
}

export interface BuildingsRepository {
  readonly source: "demo-fixtures";
  readonly period: string;
  list(query: BuildingListQuery, context: RepositoryContext): Promise<BuildingsPage>;
  get(id: string, context: RepositoryContext): Promise<BuildingDetail | null>;
  dashboard(context: RepositoryContext): Promise<Omit<DashboardSummary, "meta">>;
}
