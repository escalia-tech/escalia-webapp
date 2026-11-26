import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  notificationsPageSchema,
  parsePreferencesForm,
  toNotifications,
} from "@/features/notifications/schemas/notifications.schema";

const store = {
  toString: () => "ESCALIA_SESSION=abc; XSRF-TOKEN=tok",
  get: (name: string) => (name === "XSRF-TOKEN" ? { value: "tok" } : undefined),
};
vi.mock("next/headers", () => ({ cookies: async () => store }));
const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (...args: unknown[]) => revalidatePath(...args) }));
vi.mock("next-intl/server", () => ({ getLocale: async () => "fr-CA" }));

const ID = "0197a000-0000-7000-8000-000000000001";
const answer = (status: number, body: unknown) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

const page = {
  items: [
    {
      id: ID,
      code: "RENT_DUE_SOON",
      category: "OPERATIONAL",
      title: "Loyer à venir",
      body: "Le loyer arrive à échéance.",
      createdAt: "2027-04-01T12:00:00Z",
    },
  ],
  unreadCount: 1,
  total: 1,
  page: 1,
  pageSize: 20,
};

const preferences = {
  preferences: {
    categories: [{ category: "OPERATIONAL", channels: ["IN_APP"], locked: false }],
    digestFrequency: "DAILY",
    quietHoursEnabled: false,
    emailInvalid: false,
    pushSubscribed: false,
  },
};

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("notification schemas (FR-COM-02)", () => {
  it("reads the page and turns a missing read time into null", () => {
    const items = toNotifications(notificationsPageSchema.parse(page));

    expect(items[0]?.readAt).toBeNull();
    expect(
      toNotifications({ ...page, items: [{ ...page.items[0], readAt: "2027-04-02T00:00:00Z" }] } as never)[0]?.readAt,
    ).toBe("2027-04-02T00:00:00Z");
  });

  it("builds the preferences body, without the locked categories", () => {
    const parsed = parsePreferencesForm(
      form({
        digestFrequency: "WEEKLY",
        operationalEmail: "on",
        operationalPush: "on",
        quietHoursEnabled: "on",
        quietFrom: "21:00",
        quietTo: "08:00",
      }),
    );

    expect(parsed).toEqual({
      ok: true,
      body: {
        categories: [{ category: "OPERATIONAL", channels: ["IN_APP", "EMAIL", "WEB_PUSH"] }],
        digestFrequency: "WEEKLY",
        quietHoursEnabled: true,
        quietFrom: "21:00",
        quietTo: "08:00",
      },
    });
    const plain = parsePreferencesForm(form({ digestFrequency: "OFF", quietFrom: "x" }));
    expect(plain.ok && plain.body.categories[0]?.channels).toEqual(["IN_APP"]);
    expect(plain.ok && "quietFrom" in plain.body).toBe(false);
  });

  it("refuses an unknown digest and incomplete quiet hours", () => {
    expect(parsePreferencesForm(form({ digestFrequency: "HOURLY" }))).toEqual({ ok: false, reason: "digest" });
    expect(parsePreferencesForm(new FormData())).toEqual({ ok: false, reason: "digest" });
    expect(
      parsePreferencesForm(form({ digestFrequency: "DAILY", quietHoursEnabled: "on", quietFrom: "25:00" })),
    ).toEqual({
      ok: false,
      reason: "time",
    });
  });
});

describe("notification service and actions (FR-COM-02)", () => {
  beforeEach(() => {
    vi.resetModules();
    revalidatePath.mockClear();
    vi.stubEnv("ESCALIA_BFF_URL", "http://bff.test");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("loads the bell, and says unavailable when the BFF fails", async () => {
    const { getNotifications } = await import("@/features/notifications/server/notifications.service");

    vi.stubGlobal("fetch", answer(200, page));
    expect(await getNotifications("fr-CA")).toMatchObject({ status: "ready", unreadCount: 1 });
    vi.stubGlobal("fetch", answer(401, { code: "auth.required" }));
    expect(await getNotifications("fr-CA")).toEqual({ status: "unavailable" });
  });

  it("loads the preferences, or null", async () => {
    const { getPreferences } = await import("@/features/notifications/server/notifications.service");

    vi.stubGlobal("fetch", answer(200, preferences));
    expect((await getPreferences("fr-CA"))?.digestFrequency).toBe("DAILY");
    vi.stubGlobal("fetch", answer(500, {}));
    expect(await getPreferences("fr-CA")).toBeNull();
  });

  it("marks read through the BFF and refuses a malformed id", async () => {
    const { markRead } = await import("@/features/notifications/server/notifications.service");
    const fetcher = answer(200, { unreadCount: 0 });
    vi.stubGlobal("fetch", fetcher);

    expect(await markRead(null, "fr-CA")).toEqual({ status: "done" });
    expect(await markRead([ID], "fr-CA")).toEqual({ status: "done" });
    expect(await markRead(["nope"], "fr-CA")).toEqual({ status: "invalid", reason: "id" });
    expect(fetcher).toHaveBeenCalledTimes(2);
    vi.stubGlobal("fetch", answer(422, { code: "x" }));
    expect((await markRead(null, "fr-CA")).status).toBe("refused");
  });

  it("saves the preferences, and reports invalid or refused forms", async () => {
    const { savePreferences } = await import("@/features/notifications/server/notifications.service");

    vi.stubGlobal("fetch", answer(200, preferences.preferences));
    expect(await savePreferences(form({ digestFrequency: "DAILY" }), "fr-CA")).toEqual({ status: "done" });
    expect(await savePreferences(form({ digestFrequency: "?" }), "fr-CA")).toEqual({
      status: "invalid",
      reason: "digest",
    });
    vi.stubGlobal("fetch", answer(422, { code: "x" }));
    expect((await savePreferences(form({ digestFrequency: "DAILY" }), "fr-CA")).status).toBe("refused");
  });

  it("revalidates the layout only when something changed", async () => {
    const actions = await import("@/features/notifications/server/notifications.actions");

    vi.stubGlobal("fetch", answer(200, { unreadCount: 0 }));
    expect(await actions.markAllReadAction()).toEqual({ status: "done" });
    expect(await actions.markReadAction(ID)).toEqual({ status: "done" });
    expect(await actions.savePreferencesAction(undefined, form({ digestFrequency: "DAILY" }))).toEqual({
      status: "done",
    });
    expect(revalidatePath).toHaveBeenCalledTimes(3);
    revalidatePath.mockClear();
    expect(await actions.markReadAction("nope")).toEqual({ status: "invalid", reason: "id" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
