import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ALL_NAV, CONFIG_NAV, homeFor, isNavItemActive, MAIN_NAV, navAudience, navFor } from "@/config/navigation";

const keys = (items: { key: string }[]) => items.map((item) => item.key);

describe("menu by membership (page model section 4)", () => {
  it("shows an owner the landlord menu without the tenant's leases", () => {
    const menu = keys(navFor(MAIN_NAV, navAudience(["OWNER"])));
    expect(menu).toContain("leases");
    expect(menu).toContain("buildings");
    expect(menu).not.toContain("tenant");
    expect(keys(navFor(MAIN_NAV, navAudience(["CO_OWNER"])))).toEqual(menu);
  });

  it("shows a tenant, an occupant or a guarantor only their leases and the shared entries", () => {
    for (const role of ["TENANT", "OCCUPANT", "GUARANTOR"]) {
      expect(keys(navFor(MAIN_NAV, navAudience([role])))).toEqual(["tenant", "rules"]);
    }
  });

  it("shows both menus to someone who is both, and only the shared entries to anyone else", () => {
    const both = keys(navFor(MAIN_NAV, navAudience(["OWNER", "TENANT"])));
    expect(both).toContain("leases");
    expect(both).toContain("tenant");
    expect(keys(navFor(MAIN_NAV, navAudience(["APPLICANT"])))).toEqual(["rules"]);
    expect(keys(navFor(CONFIG_NAV, navAudience([])))).toEqual(["settings"]);
  });

  it("keeps the landlord menu when the roles are unknown (the labelled demo)", () => {
    expect(navAudience(null)).toEqual({ landlord: true, party: false });
  });

  it("marks the current section active, settings for any of its pages", () => {
    const leases = MAIN_NAV.find((item) => item.key === "leases");
    const settings = CONFIG_NAV.find((item) => item.key === "settings");
    if (!leases || !settings) throw new Error("menu entries missing");
    expect(isNavItemActive("/leases", leases)).toBe(true);
    expect(isNavItemActive("/leases/abc", leases)).toBe(true);
    expect(isNavItemActive("/leasesx", leases)).toBe(false);
    expect(isNavItemActive("/settings/organization", settings)).toBe(true);
    expect(isNavItemActive("/buildings", settings)).toBe(false);
  });

  it("starts a lease party on Mes baux and everyone else on the dashboard", () => {
    expect(homeFor(navAudience(["TENANT"]))).toBe("/tenant");
    expect(homeFor(navAudience(["GUARANTOR"]))).toBe("/tenant");
    expect(homeFor(navAudience(["OWNER"]))).toBe("/dashboard");
    expect(homeFor(navAudience(["OWNER", "TENANT"]))).toBe("/dashboard");
    expect(homeFor(navAudience(["APPLICANT"]))).toBe("/dashboard");
    expect(homeFor(navAudience(null))).toBe("/dashboard");
  });

  it("no longer lists the units and tenants placeholders", () => {
    expect(keys([...ALL_NAV])).not.toContain("units");
    expect(keys([...ALL_NAV])).not.toContain("tenants");
  });
});

vi.mock("next/headers", () => ({
  cookies: async () => ({ toString: () => "ESCALIA_SESSION=x", get: () => undefined }),
}));

describe("fetchShellRoles", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

  it("reads the roles from the BFF shell, and gives up quietly when it cannot", async () => {
    const { fetchShellRoles } = await import("@/server/auth/shell");
    vi.stubGlobal("fetch", answer(200, { user: { subject: "landlord-1", roles: ["OWNER"] }, authMode: "dev" }));
    expect(await fetchShellRoles("fr-CA")).toEqual(["OWNER"]);
    vi.stubGlobal("fetch", answer(401, {}));
    expect(await fetchShellRoles("fr-CA")).toBeNull();
  });

  it("has no roles to read without a BFF", async () => {
    vi.stubEnv("ESCALIA_BFF_URL", "");
    const { fetchShellRoles } = await import("@/server/auth/shell");
    expect(await fetchShellRoles("fr-CA")).toBeNull();
  });
});
