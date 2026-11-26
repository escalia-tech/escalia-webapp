import { getBuilding } from "@/features/buildings/server/buildings.service";
import { bffHandler } from "@/server/bff/with-bff";

/** Local BFF endpoint for one building (demo adapter only, no upstream contract yet). */
export const GET = bffHandler<{ id: string }>(
  { route: "/api/bff/buildings/[id]", operation: "buildings.detail" },
  async ({ params }) => ({ data: await getBuilding(params.id) }),
);
