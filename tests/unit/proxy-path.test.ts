import { NextRequest, NextResponse } from "next/server";

import { describe, expect, it, vi } from "vitest";

import { PATH_HEADER } from "@/lib/return-to";
import { proxy } from "@/proxy";

// The language routing is next-intl's own; only what the proxy forwards matters here.
vi.mock("next-intl/middleware", () => ({
  default: () => (request: NextRequest) => NextResponse.next({ request: { headers: request.headers } }),
}));

describe("proxy: the path that was asked for", () => {
  it("is forwarded to the render, with its query, so a sign-in can return to it", () => {
    const response = proxy(new NextRequest("http://localhost/invitation/abc_DEF-1?step=2"));

    expect(response.headers.get(`x-middleware-request-${PATH_HEADER}`)).toBe("/invitation/abc_DEF-1?step=2");
  });

  it("is not trusted from the browser: the proxy overwrites a header the visitor sent", () => {
    const response = proxy(
      new NextRequest("http://localhost/dashboard", { headers: { [PATH_HEADER]: "//evil.example" } }),
    );

    expect(response.headers.get(`x-middleware-request-${PATH_HEADER}`)).toBe("/dashboard");
  });
});
