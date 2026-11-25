import { afterEach, describe, expect, it } from "vitest";

import { getAppMetadata } from "@/lib/app-metadata";

describe("getAppMetadata", () => {
  const previous = { ...process.env };

  afterEach(() => {
    process.env = { ...previous };
  });

  it("prefers ESCALIA_APP_* env vars over package.json", () => {
    process.env.ESCALIA_APP_NAME = "escalia-webapp";
    process.env.ESCALIA_APP_VERSION = "9.9.9";
    process.env.ESCALIA_APP_REVISION = "abc123";

    const meta = getAppMetadata();
    expect(meta).toEqual({
      name: "escalia-webapp",
      version: "9.9.9",
      revision: "abc123",
    });
  });

  it("falls back to package.json when env is unset", () => {
    delete process.env.ESCALIA_APP_NAME;
    delete process.env.ESCALIA_APP_VERSION;

    const meta = getAppMetadata();
    expect(meta.name).toBe("escalia-webapp");
    expect(meta.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});
