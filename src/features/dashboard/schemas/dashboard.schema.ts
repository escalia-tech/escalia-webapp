import { z } from "zod";

/** The dashboard page of escalia-bff (`DashboardPage` in `pages.yaml`). The BFF owns this shape. */
export const dashboardPageSchema = z.object({
  buildingCount: z.number().int().nullish(),
  unitCount: z.number().int().nullish(),
  inForceLeaseCount: z.number().int().nullish(),
  unitsByBuilding: z.array(z.object({ id: z.string(), name: z.string(), unitCount: z.number().int() })),
  monthly: z.array(
    z.object({ month: z.string().regex(/^\d{4}-\d{2}$/), dueCents: z.number().int(), receivedCents: z.number().int() }),
  ),
  receivableCents: z.number().int(),
  creditCents: z.number().int(),
  ageing: z.object({
    currentCents: z.number().int(),
    days1to7Cents: z.number().int(),
    days8to21Cents: z.number().int(),
    days22PlusCents: z.number().int(),
  }),
  unavailable: z.array(z.enum(["buildings", "leases", "ledgers"])),
});
export type DashboardPage = z.infer<typeof dashboardPageSchema>;
