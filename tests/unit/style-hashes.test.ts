import { describe, expect, it } from "vitest";

import { THIRD_PARTY_STYLE_HASHES } from "@/lib/security/style-hashes";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("third-party CSP style hashes", () => {
  it("matches the CSS currently injected by sonner", () => {
    const source = readFileSync(join(process.cwd(), "node_modules", "sonner", "dist", "index.mjs"), "utf8");
    const literal = source.match(/__insertCSS\("((?:[^"\\]|\\.)*)"\)/);
    expect(literal, "sonner no longer injects CSS through __insertCSS; review the CSP").not.toBeNull();
    const css = JSON.parse(`"${literal?.[1]}"`) as string;
    const hash = `sha256-${createHash("sha256").update(css).digest("base64")}`;
    expect(hash).toBe(THIRD_PARTY_STYLE_HASHES.sonner);
  });

  it("keeps the empty-string hash correct", () => {
    expect(`sha256-${createHash("sha256").update("").digest("base64")}`).toBe(THIRD_PARTY_STYLE_HASHES.emptyStyle);
  });
});
