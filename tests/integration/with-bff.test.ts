import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

const getSession = vi.fn();
vi.mock("@/server/auth/session", () => ({ getSession: () => getSession() }));

const { bffHandler, parseJsonBody, parseSearchParams, publicBffHandler } = await import("@/server/bff/with-bff");
const { ApplicationError } = await import("@/lib/observability/errors/application-error");

const demoSession = {
  kind: "demo",
  id: "abc12345",
  user: { displayName: "Démo", initials: "D", email: "demo@example.org" },
};
const routeContext = { params: Promise.resolve({}) };
const get = (url = "http://localhost:3000/api/bff/test", headers: Record<string, string> = {}) =>
  new Request(url, { headers });
const post = (headers: Record<string, string> = {}, body: unknown = {}) =>
  new Request("http://localhost:3000/api/bff/test", {
    method: "POST",
    headers: { "content-type": "application/json", host: "localhost:3000", ...headers },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  getSession.mockReset();
});

describe("bffHandler", () => {
  it("fails closed without a session (401, no data)", async () => {
    getSession.mockResolvedValue(null);
    const handler = vi.fn();
    const response = await bffHandler({ route: "/api/bff/test", operation: "test.read" }, handler)(get(), routeContext);
    expect(response.status).toBe(401);
    expect(handler).not.toHaveBeenCalled();
    expect((await response.json()).error.code).toBe("auth.unauthenticated");
  });

  it("returns data with no-store caching and the correlation id header", async () => {
    getSession.mockResolvedValue(demoSession);
    const response = await bffHandler({ route: "/api/bff/test", operation: "test.read" }, async () => ({
      data: { hello: "world" },
    }))(get(), routeContext);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-correlation-id")).toMatch(/^[\w-]{8,}$/);
    expect(await response.json()).toEqual({ hello: "world" });
  });

  it("propagates a valid inbound correlation id and replaces a hostile one", async () => {
    getSession.mockResolvedValue(demoSession);
    const handler = bffHandler({ route: "/api/bff/test", operation: "test.read" }, async () => ({ data: {} }));
    const kept = await handler(get(undefined, { "x-correlation-id": "client-req-12345678" }), routeContext);
    expect(kept.headers.get("x-correlation-id")).toBe("client-req-12345678");
    const replaced = await handler(get(undefined, { "x-correlation-id": "bad id\twith spaces" }), routeContext);
    expect(replaced.headers.get("x-correlation-id")).not.toContain(" ");
  });

  it("rejects cross-origin mutations before touching the handler", async () => {
    getSession.mockResolvedValue(demoSession);
    const handler = vi.fn(async () => ({ data: {} }));
    const response = await bffHandler({ route: "/api/bff/test", operation: "test.write", mutation: true }, handler)(
      post({ origin: "https://evil.example" }),
      routeContext,
    );
    expect(response.status).toBe(403);
    expect(handler).not.toHaveBeenCalled();
  });

  it("accepts same-origin mutations", async () => {
    getSession.mockResolvedValue(demoSession);
    const response = await bffHandler(
      { route: "/api/bff/test", operation: "test.write", mutation: true },
      async () => ({
        data: { saved: true },
        status: 201,
      }),
    )(post({ origin: "http://localhost:3000" }), routeContext);
    expect(response.status).toBe(201);
  });

  it("maps application errors and hides unexpected ones", async () => {
    getSession.mockResolvedValue(demoSession);
    const notFound = await bffHandler({ route: "/api/bff/test", operation: "test.read" }, async () => {
      throw new ApplicationError("resource.not_found", "Nope");
    })(get(), routeContext);
    expect(notFound.status).toBe(404);

    const crash = await bffHandler({ route: "/api/bff/test", operation: "test.read" }, async () => {
      throw new Error("secret=hunter2 leaked");
    })(get(), routeContext);
    expect(crash.status).toBe(500);
    expect(JSON.stringify(await crash.json())).not.toContain("hunter2");
  });
});

describe("publicBffHandler", () => {
  it("does not require a session", async () => {
    const response = await publicBffHandler(
      { route: "/api/bff/test", operation: "test.public" },
      async ({ session }) => ({
        data: { session },
      }),
    )(get(), routeContext);
    expect(response.status).toBe(200);
    expect(getSession).not.toHaveBeenCalled();
  });
});

describe("input parsing", () => {
  const schema = z.object({ page: z.coerce.number().int().min(1) });

  it("reports invalid field NAMES only", () => {
    try {
      parseSearchParams(schema, "http://localhost/x?page=secret-value");
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as InstanceType<typeof ApplicationError>).invalidFields).toEqual(["page"]);
      expect((error as Error).message).not.toContain("secret-value");
    }
  });

  it("rejects malformed JSON bodies as validation errors", async () => {
    const request = new Request("http://localhost/x", { method: "POST", body: "{not json" });
    await expect(parseJsonBody(schema, request)).rejects.toMatchObject({ code: "validation.failed" });
  });
});
