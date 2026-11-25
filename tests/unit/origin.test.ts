import { describe, expect, it } from "vitest";

import { assertSameOrigin } from "@/server/security/origin";

const headers = (values: Record<string, string>) => new Headers(values);

describe("assertSameOrigin", () => {
  it("accepts a same-origin Origin header", () => {
    expect(() => assertSameOrigin(headers({ origin: "http://localhost:3000", host: "localhost:3000" }))).not.toThrow();
  });

  it("rejects a cross-origin Origin header", () => {
    expect(() => assertSameOrigin(headers({ origin: "https://evil.example", host: "localhost:3000" }))).toThrow(
      /Cross-origin/,
    );
  });

  it("rejects an unparsable Origin", () => {
    expect(() => assertSameOrigin(headers({ origin: "not a url", host: "localhost:3000" }))).toThrow();
  });

  it("rejects a missing Origin unless Sec-Fetch-Site is same-origin", () => {
    expect(() => assertSameOrigin(headers({ host: "localhost:3000" }))).toThrow();
    expect(() => assertSameOrigin(headers({ host: "localhost:3000", "sec-fetch-site": "cross-site" }))).toThrow();
    expect(() => assertSameOrigin(headers({ host: "localhost:3000", "sec-fetch-site": "same-origin" }))).not.toThrow();
  });

  it("prefers x-forwarded-host behind a proxy", () => {
    expect(() =>
      assertSameOrigin(
        headers({ origin: "https://app.example", host: "internal:3000", "x-forwarded-host": "app.example" }),
      ),
    ).not.toThrow();
  });
});
