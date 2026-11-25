import { type PropertyListQuery, propertyListQuerySchema } from "../schemas/property.schema";

const DEFAULTS = propertyListQuerySchema.parse({});

/** Parse URL search params into a valid query; invalid values fall back to the defaults. */
export function parseListQuery(
  params: Record<string, string | string[] | undefined> | URLSearchParams,
): PropertyListQuery {
  const entries: Record<string, string> =
    params instanceof URLSearchParams
      ? Object.fromEntries(params.entries())
      : Object.fromEntries(
          Object.entries(params).flatMap(([key, value]) => {
            const first = Array.isArray(value) ? value[0] : value;
            return first === undefined ? [] : [[key, first]];
          }),
        );

  const parsed = propertyListQuerySchema.safeParse(entries);
  if (parsed.success) return parsed.data;

  // Keep each valid field individually so one bad parameter does not reset the others.
  const salvaged: Record<string, string> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (propertyListQuerySchema.safeParse({ [key]: value }).success) salvaged[key] = value;
  }
  const retry = propertyListQuerySchema.safeParse(salvaged);
  return retry.success ? retry.data : DEFAULTS;
}

/** Canonical, minimal query string (defaults omitted) so equal queries share one cache key and URL. */
export function toSearchParams(query: PropertyListQuery): URLSearchParams {
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
