import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApplicationError } from "@/lib/observability/errors/application-error";

vi.mock("server-only", () => ({}));
const redirect = vi.hoisted(() => vi.fn());
vi.mock("@/i18n/navigation", () => ({ redirect }));

import { redirectIfUnauthenticated } from "@/server/auth/sign-in-redirect";

describe("redirectIfUnauthenticated", () => {
  beforeEach(() => redirect.mockClear());

  it("sends an unauthenticated person to the login page with the way back", () => {
    redirectIfUnauthenticated(new ApplicationError("auth.unauthenticated", "x"), "fr-CA", "/units/u 1");
    expect(redirect).toHaveBeenCalledWith({ href: "/login?returnTo=%2Funits%2Fu%201", locale: "fr-CA" });
  });

  it("falls back to the default locale for an unknown one", () => {
    redirectIfUnauthenticated(new ApplicationError("auth.unauthenticated", "x"), "xx", "/buildings");
    expect(redirect).toHaveBeenCalledWith(expect.objectContaining({ locale: "fr-CA" }));
  });

  it("leaves other failures to the page", () => {
    redirectIfUnauthenticated(new ApplicationError("auth.forbidden", "x"), "fr-CA", "/buildings");
    redirectIfUnauthenticated(new Error("boom"), "fr-CA", "/buildings");
    expect(redirect).not.toHaveBeenCalled();
  });
});
