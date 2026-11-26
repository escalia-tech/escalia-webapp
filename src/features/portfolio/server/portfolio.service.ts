import "server-only";

import { ApplicationError } from "@/lib/observability/errors/application-error";
import { fetchBffPage } from "@/server/bff-pages/client";

import {
  type BuildingPage,
  type BuildingsPage,
  type BuildingsQuery,
  buildingPageSchema,
  buildingsPageSchema,
  PAGE_SIZE,
} from "../schemas/portfolio.schema";

const BUILDING_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The buildings of the signed-in organization (FR-PORT-01). The BFF and the core own every rule. */
export function fetchBuildings(query: BuildingsQuery, language: string): Promise<BuildingsPage> {
  return fetchBffPage("buildings.list", "/pages/buildings", buildingsPageSchema, {
    language,
    query: {
      q: query.q,
      page: String(query.page),
      pageSize: String(PAGE_SIZE),
      includeArchived: query.includeArchived ? "true" : undefined,
    },
  });
}

export function fetchBuilding(id: string, language: string): Promise<BuildingPage> {
  if (!BUILDING_ID.test(id)) {
    throw new ApplicationError("resource.not_found", "Building not found");
  }
  return fetchBffPage("buildings.get", `/pages/buildings/${id}`, buildingPageSchema, { language });
}
