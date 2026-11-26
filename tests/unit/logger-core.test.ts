import { describe, expect, it, vi } from "vitest";

import { createLoggerCore, humanizeEvent } from "@/lib/observability/logger/logger.core";
import type { LogLevel } from "@/lib/observability/logger/logger.types";

type Emitted = { level: LogLevel; fields: Record<string, unknown>; message: string };

function setup(threshold: LogLevel = "info") {
  const emitted: Emitted[] = [];
  const logger = createLoggerCore({
    layer: "server",
    module: "test",
    threshold,
    emit: (level, fields, message) => emitted.push({ level, fields, message }),
    resolveContext: () => ({ correlationId: "ambient-id" }),
  });
  return { logger, emitted };
}

describe("logger core", () => {
  it("gates levels by threshold", () => {
    const { logger, emitted } = setup("warn");
    logger.debug("app.test.debug");
    logger.info("app.test.info");
    logger.warn("app.test.warn");
    logger.error("app.test.error");
    expect(emitted.map((entry) => entry.level)).toEqual(["warn", "error"]);
  });

  it("adds layer, module, event and the ambient correlation id", () => {
    const { logger, emitted } = setup();
    logger.info("buildings.list.completed", { durationMs: 5 });
    expect(emitted[0]?.fields).toMatchObject({
      layer: "server",
      module: "test",
      event: "buildings.list.completed",
      correlationId: "ambient-id",
      durationMs: 5,
    });
    expect(emitted[0]?.message).toBe("buildings list completed");
  });

  it("lets explicit bindings override ambient context", () => {
    const { logger, emitted } = setup();
    logger.child({ correlationId: "explicit" }).info("app.test.child");
    expect(emitted[0]?.fields.correlationId).toBe("explicit");
  });

  it("replaces malformed event names and never leaks non-allowlisted metadata", () => {
    const { logger, emitted } = setup();
    logger.info("Not A Valid Event", { email: "a@b.co", route: "/x" });
    expect(emitted[0]?.fields.event).toBe("logger.event.invalid");
    expect(emitted[0]?.fields).not.toHaveProperty("email");
    expect(emitted[0]?.fields.droppedFieldCount).toBe(1);
  });

  it("never throws when the sink fails", () => {
    const logger = createLoggerCore({
      layer: "server",
      module: "test",
      threshold: "info",
      emit: () => {
        throw new Error("sink down");
      },
    });
    expect(() => logger.error("app.test.failure", { error: new Error("x") })).not.toThrow();
  });

  it("supports a runtime-reconfigurable threshold", () => {
    const emitted: string[] = [];
    let level: LogLevel = "error";
    const logger = createLoggerCore({
      layer: "client",
      module: "t",
      threshold: () => level,
      emit: (_l, fields) => emitted.push(String(fields.event)),
    });
    logger.info("app.test.one");
    level = "info";
    logger.info("app.test.two");
    expect(emitted).toEqual(["app.test.two"]);
  });

  it("humanizes event names", () => {
    expect(humanizeEvent("bff.upstream.timeout")).toBe("bff upstream timeout");
    const spy = vi.fn();
    spy(humanizeEvent("a_b.c-d"));
    expect(spy).toHaveBeenCalledWith("a b c d");
  });
});
