import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));

const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));
const sentBody = (fetcher: ReturnType<typeof answer>, call = 0) =>
  JSON.parse(String((fetcher.mock.calls[call] as unknown as [string, RequestInit])[1].body));

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("organization (FR-PORT-01)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("APP_ENV", "test");
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
    revalidatePath.mockClear();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("reads the organization and its members", async () => {
    const { fetchOrganization } = await import("@/features/organization/server/organization.service");
    vi.stubGlobal(
      "fetch",
      answer(200, {
        id: "o1",
        name: "Gestion Fictive",
        role: "OWNER",
        members: [{ personId: "p1", displayName: "Alex", role: "OWNER", acceptedAt: null }],
      }),
    );
    expect((await fetchOrganization("fr-CA")).members).toHaveLength(1);
  });

  it("creates with or without a name, and refuses a name that is too long", async () => {
    const { createOrganizationAction } = await import("@/features/organization/server/organization.actions");
    const fetcher = answer(201, { id: "o1", name: "Alex", role: "OWNER" });
    vi.stubGlobal("fetch", fetcher);

    expect(await createOrganizationAction(undefined, form({ name: "  " }))).toEqual({ status: "saved" });
    expect(sentBody(fetcher)).toEqual({});
    expect(await createOrganizationAction(undefined, form({ name: " Gestion Fictive " }))).toEqual({
      status: "saved",
    });
    expect(sentBody(fetcher, 1)).toEqual({ name: "Gestion Fictive" });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(await createOrganizationAction(undefined, form({ name: "x".repeat(121) }))).toEqual({
      status: "invalid",
    });
    expect(await createOrganizationAction(undefined, new FormData())).toEqual({ status: "saved" });

    vi.stubGlobal("fetch", answer(409, { code: "identity.organization.exists", message: "Déjà créée." }));
    expect(await createOrganizationAction(undefined, form({ name: "" }))).toMatchObject({ status: "refused" });
  });

  it("renames with a valid name only", async () => {
    const { renameOrganizationAction } = await import("@/features/organization/server/organization.actions");
    const fetcher = answer(200, { id: "o1", name: "Nouveau", role: "OWNER" });
    vi.stubGlobal("fetch", fetcher);

    expect(await renameOrganizationAction(undefined, form({ name: "Nouveau" }))).toEqual({ status: "saved" });
    expect(sentBody(fetcher)).toEqual({ name: "Nouveau" });
    expect(revalidatePath).toHaveBeenCalledWith("/settings/organization", "page");
    expect(await renameOrganizationAction(undefined, form({ name: " " }))).toEqual({ status: "invalid" });
    expect(await renameOrganizationAction(undefined, new FormData())).toEqual({ status: "invalid" });

    vi.stubGlobal("fetch", answer(403, { code: "auth.forbidden" }));
    expect(await renameOrganizationAction(undefined, form({ name: "Autre" }))).toMatchObject({ status: "refused" });
  });
});
