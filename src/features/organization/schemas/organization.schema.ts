import { z } from "zod";

/** `GET /pages/organization` (escalia-bff `OrganizationPage`): the organization and its members (FR-PORT-01). */
export const organizationPageSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["OWNER", "CO_OWNER"]),
  members: z.array(
    z.object({
      personId: z.string(),
      displayName: z.string(),
      role: z.enum(["OWNER", "CO_OWNER"]),
      acceptedAt: z.string().nullish(),
    }),
  ),
});

export type OrganizationPage = z.infer<typeof organizationPageSchema>;

/** The organization's name, as the core accepts it (1 to 120 characters). */
export const organizationNameSchema = z.string().trim().min(1).max(120);
