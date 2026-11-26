import { buildingListQuerySchema } from "@/features/buildings/schemas/building.schema";
import { listBuildings } from "@/features/buildings/server/buildings.service";
import { bffHandler, parseSearchParams } from "@/server/bff/with-bff";

/**
 * Local BFF endpoint for the buildings list (consumed by interactive client components through
 * TanStack Query). It is served by the demo adapter only; there is no upstream backend contract yet.
 * Server Components call `listBuildings` directly instead of this HTTP route.
 */
export const GET = bffHandler({ route: "/api/bff/buildings", operation: "buildings.list" }, async ({ request }) => {
  const query = parseSearchParams(buildingListQuerySchema, request.url);
  return { data: await listBuildings(query) };
});
