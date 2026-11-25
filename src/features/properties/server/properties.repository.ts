import "server-only";

import type { DashboardSummary, PropertyDetail, PropertyListQuery, PropertySummary } from "../schemas/property.schema";

/**
 * Data-source port of the properties feature. The only implementation today is the demo adapter
 * (fixtures). When the real backend contract is specified, add a new adapter here; services, the BFF
 * and the UI keep working against this interface. No upstream endpoint is assumed.
 */
export interface RepositoryContext {
  signal: AbortSignal;
}

export interface PropertiesPage {
  items: PropertySummary[];
  totalCount: number;
}

export interface PropertiesRepository {
  readonly source: "demo-fixtures";
  readonly period: string;
  list(query: PropertyListQuery, context: RepositoryContext): Promise<PropertiesPage>;
  get(id: string, context: RepositoryContext): Promise<PropertyDetail | null>;
  dashboard(context: RepositoryContext): Promise<Omit<DashboardSummary, "meta">>;
}
