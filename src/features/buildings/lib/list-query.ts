import { type BuildingListQuery, buildingListQuerySchema } from "../schemas/building.schema";

const DEFAULTS = buildingListQuerySchema.parse({});

/** Parse URL search params into a valid query; invalid values fall back to the defaults. */
export function parseListQuery(
  params: Record<string, string | string[] | undefined> | URLSearchParams,
): BuildingListQuery {
  const entries: Record<string, string> =
    params instanceof URLSearchParams
      ? Object.fromEntries(params.entries())
      : Object.fromEntries(
          Object.entries(params).flatMap(([key, value]) => {
            const first = Array.isArray(value) ? value[0] : value;
            return first === undefined ? [] : [[key, first]];
          }),
        );

  const parsed = buildingListQuerySchema.safeParse(entries);
  if (parsed.success) return parsed.data;

  // Keep each valid field individually so one bad parameter does not reset the others.
  const salvaged: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (buildingListQuerySchema.safeParse({ [key]: value }).success) salvaged[key] = value;
  }
  const retry = buildingListQuerySchema.safeParse(salvaged);
  return retry.success ? retry.data : DEFAULTS;
}

/** Canonical, minimal query string (defaults omitted) so equal queries share one cache key and URL. */
export function toSearchParams(query: BuildingListQuery): URLSearchParams {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.type) params.set("type", query.type);
  if (query.page !== DEFAULTS.page) params.set("page", String(query.page));
  if (query.pageSize !== DEFAULTS.pageSize) params.set("pageSize", String(query.pageSize));
  if (query.sort !== DEFAULTS.sort) params.set("sort", query.sort);
  if (query.dir !== DEFAULTS.dir) params.set("dir", query.dir);
  if (query.scenario) params.set("scenario", query.scenario);
  return params;
}
