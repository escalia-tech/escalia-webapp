import { describe, expect, it } from "vitest";

import { REDACTED } from "@/lib/observability/logger/logger.config";
import {
  isSensitiveKey,
  redactString,
  redactValue,
  sanitizeMetadata,
  serializeError,
} from "@/lib/observability/logger/redaction";

describe("redactString", () => {
  it("redacts emails, bearer tokens, JWTs and cookie headers", () => {
    const jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.c2lnbmF0dXJl";
    const text = `user marie@example.org Authorization: Bearer abc.def.ghi cookie: session=abc; ${jwt}`;
    const output = redactString(text);
    expect(output).not.toContain("marie@example.org");
    expect(output).not.toContain("abc.def.ghi");
    expect(output).not.toContain(jwt);
    expect(output).not.toContain("session=abc");
  });

  it("redacts inline secret assignments in free text", () => {
    const output = redactString("failed with password=hunter2, token: abc123 and api_key=zzz999");
    for (const secret of ["hunter2", "abc123", "zzz999"]) expect(output).not.toContain(secret);
  });

  it("redacts secret query parameters in URLs", () => {
    const output = redactString("GET /reset?token=SECRETVALUE&page=2");
    expect(output).not.toContain("SECRETVALUE");
    expect(output).toContain("page=2");
  });

  it("redacts card numbers that pass the Luhn check but keeps other digit runs", () => {
    expect(redactString("card 4111 1111 1111 1111")).toContain(REDACTED);
    expect(redactString("order 1234 5678 9012 3456")).not.toContain(REDACTED);
  });

  it("redacts phone numbers and home directories", () => {
    expect(redactString("call +1 514 555 0199")).not.toContain("555 0199");
    expect(redactString("at /Users/marie/project/file.ts")).not.toContain("marie");
  });

  it("truncates very long strings", () => {
    expect(redactString("a".repeat(5000)).length).toBeLessThan(600);
  });
});

describe("isSensitiveKey", () => {
  it.each(["password", "newPassword", "access_token", "Authorization", "set-cookie", "iban", "otp", "apiKey"])(
    "flags %s",
    (key) => expect(isSensitiveKey(key)).toBe(true),
  );
  it.each(["durationMs", "route", "statusCode", "operation"])("does not flag %s", (key) =>
    expect(isSensitiveKey(key)).toBe(false),
  );
});

describe("redactValue", () => {
  it("redacts sensitive keys at any depth", () => {
    const output = redactValue({ a: { b: { password: "p4ss", ok: "fine" } }, list: [{ token: "t" }] }) as {
      a: { b: { password: string; ok: string } };
      list: { token: string }[];
    };
    expect(output.a.b.password).toBe(REDACTED);
    expect(output.a.b.ok).toBe("fine");
    expect(output.list[0]?.token).toBe(REDACTED);
  });

  it("handles circular references and depth limits without throwing", () => {
    const loop: Record<string, unknown> = { name: "x" };
    loop.self = loop;
    expect(() => redactValue(loop)).not.toThrow();
    expect(JSON.stringify(redactValue(loop))).toContain("[Circular]");
  });

  it("drops functions and symbols and stringifies bigint", () => {
    const output = redactValue({ fn: () => 1, sym: Symbol("s"), big: 10n }) as Record<string, unknown>;
    expect(output.fn).toBeUndefined();
    expect(output.sym).toBeUndefined();
    expect(output.big).toBe("10");
  });
});

describe("serializeError", () => {
  it("redacts personal data in message, stack and cause", () => {
    const error = new Error("failed for marie@example.org", { cause: new Error("token=ABCDEF1234567890ABCDEF") });
    const serialized = serializeError(error);
    const json = JSON.stringify(serialized);
    expect(json).not.toContain("marie@example.org");
    expect(json).not.toContain("ABCDEF1234567890ABCDEF");
    expect(serialized.errorName).toBe("Error");
    expect(serialized.cause?.errorName).toBe("Error");
  });

  it("never echoes a non-Error thrown object", () => {
    expect(serializeError({ password: "secret" }).errorMessage).toBe("Non-error value thrown");
  });
});

describe("sanitizeMetadata", () => {
  it("drops fields that are not in the allowlist and counts them", () => {
    const { metadata, droppedFieldCount } = sanitizeMetadata({ durationMs: 12, email: "a@b.co", customerName: "X" });
    expect(metadata).toEqual({ durationMs: 12 });
    expect(droppedFieldCount).toBe(2);
  });

  it("expands an error under the `error` key into redacted fields", () => {
    const { metadata } = sanitizeMetadata({ error: new Error("boom for marie@example.org") });
    expect(metadata.errorName).toBe("Error");
    expect(String(metadata.errorMessage)).not.toContain("marie@example.org");
  });
});
