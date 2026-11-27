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
  occupiedUnitCount: z.number().int().nullish(),
  endingSoon: z
    .object({
      within60: z.number().int(),
      within90: z.number().int(),
      next: z.array(
        z.object({
          buildingName: z.string(),
          unitLabel: z.string(),
          endDate: z.string(),
          daysLeft: z.number().int(),
        }),
      ),
    })
    .nullish(),
  waiting: z
    .object({ outForSignature: z.number().int(), invitationsPending: z.number().int(), neverInvited: z.number().int() })
    .nullish(),
  vacantUnits: z.array(
    z.object({
      buildingName: z.string(),
      unitLabel: z.string(),
      daysVacant: z.number().int().nullish(),
      lastRentCents: z.number().int().nullish(),
    }),
  ),
  rent: z
    .object({ actualCents: z.number().int(), vacancyCents: z.number().int(), unitsWithoutKnownRent: z.number().int() })
    .nullish(),
  unavailable: z.array(z.enum(["buildings", "leases", "ledgers"])),
});
export type DashboardPage = z.infer<typeof dashboardPageSchema>;
