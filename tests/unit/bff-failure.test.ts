import { describe, expect, it } from "vitest";

import { ApplicationError } from "@/lib/observability/errors/application-error";
import { failureState } from "@/server/bff-pages/failure";

describe("failureState", () => {
  it.each([
    [new ApplicationError("auth.unauthenticated", "x"), "unauthenticated"],
    [new ApplicationError("auth.forbidden", "x"), "forbidden"],
    [new ApplicationError("resource.not_found", "x"), "notFound"],
    [new ApplicationError("upstream.unavailable", "x", { retryable: false }), "notConnected"],
    [new ApplicationError("upstream.unavailable", "x", { retryable: true }), "unavailable"],
    [new ApplicationError("upstream.timeout", "x", { retryable: true }), "unavailable"],
    [new Error("boom"), "unavailable"],
  ])("maps %o to %s", (error, state) => {
    expect(failureState(error)).toBe(state);
  });
});
