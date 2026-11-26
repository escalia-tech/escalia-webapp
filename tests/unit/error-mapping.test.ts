import { describe, expect, it } from "vitest";

import { ApplicationError, toErrorResponse } from "@/lib/observability/errors/application-error";
import { markReported } from "@/lib/observability/errors/error-reporter";

describe("toErrorResponse", () => {
  it("maps application errors with their status and a stable code", () => {
    const { status, body } = toErrorResponse(new ApplicationError("resource.not_found", "Building not found"), "cid");
    expect(status).toBe(404);
    expect(body.error).toMatchObject({ code: "resource.not_found", correlationId: "cid", retryable: false });
  });

  it("flags upstream failures as retryable and includes invalid field names only", () => {
    expect(toErrorResponse(new ApplicationError("upstream.timeout", "t"), "c").body.error.retryable).toBe(true);
    const invalid = toErrorResponse(new ApplicationError("validation.failed", "bad", { invalidFields: ["page"] }), "c");
    expect(invalid.body.error.invalidFields).toEqual(["page"]);
  });

  it("never leaks the message of an unexpected error", () => {
    const { status, body } = toErrorResponse(new Error("db password=hunter2 at 10.0.0.5"), "cid");
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("hunter2");
    expect(body.error.code).toBe("internal.unexpected");
  });
});

describe("markReported", () => {
  it("reports an error instance only once", () => {
    const error = new Error("x");
    expect(markReported(error)).toBe(true);
    expect(markReported(error)).toBe(false);
  });
});
