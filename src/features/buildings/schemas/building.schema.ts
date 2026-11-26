import { z } from "zod";

/**
 * Buildings DTOs. IMPORTANT: no backend contract exists yet. These shapes describe what the demo
 * adapter returns and what the UI consumes; they are NOT an upstream contract. When the real API is
 * specified (docs/features/TEMPLATE.md), only the adapter and the mapping layer change.
 */

export const BUILDING_TYPES = ["multi-residential", "single-family", "condominium", "commercial", "mixed-use"] as const;
export type BuildingType = (typeof BUILDING_TYPES)[number];

export const PROVINCES = ["QC", "ON", "NB", "NS"] as const;

/** `amountCents: null` means "not available", which is different from zero. */
export const moneySchema = z.object({
  amountCents: z.number().int().nullable(),
  currency: z.literal("CAD"),
});
export type Money = z.infer<typeof moneySchema>;

export const buildingSummarySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{3,40}$/),
  name: z.string().min(1).max(120),
  buildingType: z.enum(BUILDING_TYPES),
  address: z.object({
    line1: z.string(),
    city: z.string(),
    province: z.enum(PROVINCES),
    postalCode: z.string(),
  }),
  unitCount: z.number().int().min(0),
  /** Provided by the data source (0..1); never computed or aggregated by the UI. */
  occupancyRate: z.number().min(0).max(1).nullable(),
  /** Rent due and rent received are DISTINCT figures and are never conflated or divided. */
  monthlyRentDue: moneySchema,
  monthlyRentReceived: moneySchema,
});
export type BuildingSummary = z.infer<typeof buildingSummarySchema>;

export const monthlyAmountSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  dueCents: z.number().int().nullable(),
  receivedCents: z.number().int().nullable(),
});
export type MonthlyAmount = z.infer<typeof monthlyAmountSchema>;

export const buildingDetailSchema = buildingSummarySchema.extend({
  rentHistory: z.array(monthlyAmountSchema),
});
export type BuildingDetail = z.infer<typeof buildingDetailSchema>;

export const dataSourceSchema = z.object({
  /** Where the data came from. The UI shows a "fictional data" label whenever it is `demo-fixtures`. */
  source: z.enum(["demo-fixtures"]),
  /** Reference month of the monetary figures (YYYY-MM). */
  period: z.string().regex(/^\d{4}-\d{2}$/),
});
export type DataSourceMeta = z.infer<typeof dataSourceSchema>;

export const PAGE_SIZES = [10, 20, 50] as const;
export const SORT_FIELDS = ["name", "city", "unitCount"] as const;

/** Query accepted by the list endpoint (URL parameters; also used for shareable filter state). */
export const buildingListQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  type: z.enum(BUILDING_TYPES).optional(),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .refine((value): value is (typeof PAGE_SIZES)[number] => (PAGE_SIZES as readonly number[]).includes(value))
    .default(10),
  sort: z.enum(SORT_FIELDS).default("name"),
  dir: z.enum(["asc", "desc"]).default("asc"),
  /** Demo-only failure injection used to exercise loading/error states. Ignored outside demo mode. */
  scenario: z.enum(["slow", "error", "timeout"]).optional(),
});
export type BuildingListQuery = z.infer<typeof buildingListQuerySchema>;

export const buildingListResultSchema = z.object({
  items: z.array(buildingSummarySchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalCount: z.number().int(),
  pageCount: z.number().int(),
  meta: dataSourceSchema,
});
export type BuildingListResult = z.infer<typeof buildingListResultSchema>;

export const buildingDetailResultSchema = z.object({
  building: buildingDetailSchema,
  meta: dataSourceSchema,
});
export type BuildingDetailResult = z.infer<typeof buildingDetailResultSchema>;

export const dashboardSummarySchema = z.object({
  meta: dataSourceSchema,
  kpis: z.object({
    buildingCount: z.number().int(),
    unitCount: z.number().int(),
    rentDueCents: z.number().int(),
    /** Sum of the figures that ARE available; missing data is reported separately, never counted as zero. */
    rentReceivedCents: z.number().int(),
    receivedMissingCount: z.number().int(),
  }),
  monthly: z.array(monthlyAmountSchema),
  unitsByBuilding: z.array(z.object({ id: z.string(), name: z.string(), unitCount: z.number().int() })),
  buildingsByType: z.array(z.object({ buildingType: z.enum(BUILDING_TYPES), count: z.number().int() })),
});
export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;
