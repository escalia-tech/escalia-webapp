import { propertyListQuerySchema } from "@/features/properties/schemas/property.schema";
import { listProperties } from "@/features/properties/server/properties.service";
import { bffHandler, parseSearchParams } from "@/server/bff/with-bff";

/**
 * Local BFF endpoint for the properties list (consumed by interactive client components through
 * TanStack Query). It is served by the demo adapter only; there is no upstream backend contract yet.
 * Server Components call `listProperties` directly instead of this HTTP route.
 */
export const GET = bffHandler({ route: "/api/bff/properties", operation: "properties.list" }, async ({ request }) => {
  const query = parseSearchParams(propertyListQuerySchema, request.url);
  return { data: await listProperties(query) };
});
