import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { resolvePublicLocale } from "@/lib/resolve-public-locale";

describe("resolvePublicLocale", () => {
  it("prefers the session override, then the locale cookie", () => {
    const session = new NextRequest("http://127.0.0.1/login", {
      headers: { cookie: "escalia_locale_session=en-CA; escalia_locale=fr-CA" },
    });
    expect(resolvePublicLocale(session)).toBe("en-CA");

    const cookie = new NextRequest("http://127.0.0.1/login", {
      headers: { cookie: "escalia_locale=en-CA", "accept-language": "fr-CA,fr;q=0.9" },
    });
    expect(resolvePublicLocale(cookie)).toBe("en-CA");
  });

  it("falls back to Accept-Language", () => {
    const english = new NextRequest("http://127.0.0.1/login", {
      headers: { "accept-language": "en-CA,en;q=0.9" },
    });
    expect(resolvePublicLocale(english)).toBe("en-CA");
  });
});