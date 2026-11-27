import "server-only";

import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import { type OrganizationPage, organizationNameSchema, organizationPageSchema } from "../schemas/organization.schema";

export type OrganizationOutcome =
  | { status: "saved" }
  | { status: "invalid" }
  | { status: "refused"; message: string | undefined };

/** The signed-in person's organization; throws `organization.missing` when they have none yet. */
export function fetchOrganization(language: string): Promise<OrganizationPage> {
  return fetchBffPage("organization.get", "/pages/organization", organizationPageSchema, { language });
}

/** Creates the person's organization (FR-PORT-01 BR-1). Without a name the core uses the person's full name. */
export async function createOrganization(name: string, language: string): Promise<OrganizationOutcome> {
  const trimmed = name.trim();
  if (trimmed !== "" && !organizationNameSchema.safeParse(trimmed).success) return { status: "invalid" };
  const body = trimmed === "" ? {} : { name: trimmed };
  const result = await postBffAction("organization.create", "/actions/create-organization", body, language);
  return result.ok ? { status: "saved" } : { status: "refused", message: result.message };
}

export async function renameOrganization(name: string, language: string): Promise<OrganizationOutcome> {
  const parsed = organizationNameSchema.safeParse(name);
  if (!parsed.success) return { status: "invalid" };
  const result = await postBffAction(
    "organization.rename",
    "/actions/rename-organization",
    { name: parsed.data },
    language,
  );
  return result.ok ? { status: "saved" } : { status: "refused", message: result.message };
}
