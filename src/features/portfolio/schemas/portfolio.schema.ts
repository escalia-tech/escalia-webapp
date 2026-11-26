import { z } from "zod";

/** The buildings pages of escalia-bff (`BuildingsPage`, `BuildingPage` in `pages.yaml`). The BFF owns these shapes. */
export const buildingRowSchema = z.object({
  id: z.string(),
  code: z.string(),
  displayName: z.string(),
  street: z.string(),
  city: z.string(),
  jurisdiction: z.string(),
  unitCount: z.number().int(),
  archived: z.boolean(),
});
export type BuildingRow = z.infer<typeof buildingRowSchema>;

export const buildingsPageSchema = z.object({
  items: z.array(buildingRowSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
});
export type BuildingsPage = z.infer<typeof buildingsPageSchema>;

export const buildingPageSchema = z.object({
  id: z.string(),
  code: z.string(),
  displayName: z.string(),
  address: z.object({
    civicNumber: z.string(),
    street: z.string(),
    city: z.string(),
    province: z.string(),
    postalCode: z.string(),
  }),
  jurisdiction: z.string(),
  timeZone: z.string(),
  yearBuilt: z.number().int().nullish(),
  codeLocked: z.boolean(),
  archived: z.boolean(),
  units: z.array(z.object({ id: z.string(), label: z.string(), archived: z.boolean() })),
  commonAreas: z.array(z.object({ id: z.string(), name: z.string(), archived: z.boolean() })),
});
export type BuildingPage = z.infer<typeof buildingPageSchema>;

export const PAGE_SIZE = 25;

export interface BuildingsQuery {
  q: string | undefined;
  page: number;
  includeArchived: boolean;
}

/** Reads the query string of the list; anything invalid falls back to the defaults, never to an error page. */
export function parseBuildingsQuery(raw: Record<string, string | string[] | undefined>): BuildingsQuery {
  const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
  const q = first(raw.q)?.trim().slice(0, 80);
  const page = Number.parseInt(first(raw.page) ?? "1", 10);
  return {
    q: q || undefined,
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
    includeArchived: first(raw.archived) === "1",
  };
}

const text = (max: number) => z.string().trim().min(1).max(max);

/** What the add-building form sends. Units: either a count or a range, never both (FR-PORT-01 BR-10). */
export const newBuildingSchema = z
  .object({
    civicNumber: text(20),
    street: text(120),
    city: text(80),
    postalCode: text(7),
    displayName: z.string().trim().max(80).optional(),
    unitCount: z.coerce.number().int().min(1).max(200).optional(),
    unitRange: z.string().trim().max(20).optional(),
  })
  .refine((value) => !(value.unitCount !== undefined && value.unitRange), { path: ["unitRange"] });
export type NewBuilding = z.infer<typeof newBuildingSchema>;

/** The body of `POST /actions/create-building`. Quebec only in Phase 1; the core refuses anything else. */
export function toCreateBuildingRequest(input: NewBuilding) {
  const units = input.unitRange ? { range: input.unitRange } : input.unitCount ? { count: input.unitCount } : undefined;
  return {
    address: {
      civicNumber: input.civicNumber,
      street: input.street,
      city: input.city,
      province: "CA-QC",
      postalCode: input.postalCode,
      country: "CA",
    },
    ...(input.displayName ? { displayName: input.displayName } : {}),
    ...(units ? { units } : {}),
  };
}
