import { describe, expect, it } from "vitest";

import {
  formatTraceparent,
  generateCorrelationId,
  isValidCorrelationId,
  parseTraceparent,
  resolveCorrelationId,
  resolveTraceContext,
} from "@/lib/observability/tracing/correlation";
import {
  createRequestContext,
  getRequestContext,
  runWithRequestContext,
} from "@/lib/observability/tracing/request-context";

describe("correlation ids", () => {
  it("generates valid, unique ids", () => {
    const ids = new Set(Array.from({ length: 200 }, generateCorrelationId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(isValidCorrelationId(id)).toBe(true);
  });

  it("accepts a well-formed inbound id and replaces malformed or hostile ones", () => {
    const good = generateCorrelationId();
    expect(resolveCorrelationId(good)).toBe(good);
    expect(resolveCorrelationId("x\r\nSet-Cookie: a=b")).not.toContain("Set-Cookie");
    expect(resolveCorrelationId("a".repeat(500))).not.toHaveLength(500);
    expect(isValidCorrelationId(undefined)).toBe(false);
  });
});

describe("traceparent", () => {
  it("round-trips a valid header and rejects invalid ones", () => {
    const context = resolveTraceContext(undefined);
    const header = formatTraceparent(context);
    expect(parseTraceparent(header)).toMatchObject({ traceId: context.traceId });
    expect(parseTraceparent("garbage")).toBeUndefined();
    expect(parseTraceparent("00-00000000000000000000000000000000-0000000000000000-01")).toBeUndefined();
  });
});

describe("request context", () => {
  it("isolates concurrent requests (no correlation id leakage)", async () => {
    const run = (name: string, delay: number) => {
      const context = createRequestContext(new Headers({ "x-correlation-id": generateCorrelationId() }));
      return runWithRequestContext(context, async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        return { expected: context.correlationId, seen: getRequestContext()?.correlationId, name };
      });
    };
    const results = await Promise.all([run("a", 30), run("b", 5), run("c", 15), run("d", 1)]);
    for (const result of results) expect(result.seen).toBe(result.expected);
    expect(new Set(results.map((result) => result.seen)).size).toBe(4);
  });

  it("has no context outside runWithRequestContext", () => {
    expect(getRequestContext()).toBeUndefined();
  });
});
