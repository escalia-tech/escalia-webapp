import { getProperty } from "@/features/properties/server/properties.service";
import { bffHandler } from "@/server/bff/with-bff";

/** Local BFF endpoint for one property (demo adapter only, no upstream contract yet). */
export const GET = bffHandler<{ id: string }>(
  { route: "/api/bff/properties/[id]", operation: "properties.detail" },
  async ({ params }) => ({ data: await getProperty(params.id) }),
);
