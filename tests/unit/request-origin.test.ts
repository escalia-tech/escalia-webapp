import { describe, expect, it } from "vitest";

import { resolvePublicOrigin } from "@/lib/request-origin";

describe("resolvePublicOrigin", () => {
  it("uses x-forwarded host and proto", () => {
    const headers = new Headers({
      "x-forwarded-host": "app.example.com",
      "x-forwarded-proto": "https",
    });
    expect(resolvePublicOrigin(headers)).toBe("https://app.example.com");
  });

  it("falls back to host with https for non-local hosts", () => {
    const headers = new Headers({ host: "escalia-webapp.vercel.app" });
    expect(resolvePublicOrigin(headers)).toBe("https://escalia-webapp.vercel.app");
  });

  it("uses http for localhost", () => {
    const headers = new Headers({ host: "localhost:3000" });
    expect(resolvePublicOrigin(headers)).toBe("http://localhost:3000");
  });
});