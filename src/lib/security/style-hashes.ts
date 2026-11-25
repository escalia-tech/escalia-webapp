/**
 * CSP hashes for inline <style> elements injected at runtime by third-party libraries that cannot
 * receive a nonce. Each entry is the sha256 of the exact CSS text the library injects.
 *
 * `tests/unit/style-hashes.test.ts` recomputes these from `node_modules`, so a dependency upgrade that
 * changes the injected CSS fails the test and the hash must be reviewed and updated here.
 */
export const THIRD_PARTY_STYLE_HASHES = {
  /** sonner@2.0.8 — `__insertCSS(...)` in dist/index.mjs. */
  sonner: "sha256-StEaX+se6YS7pqjzrzMIA0KaX9zF/8zAhvQXZAe5epY=",
  /**
   * sha256 of the empty string. Sonner appends an empty <style> element first and fills it afterwards;
   * the CSP is evaluated on both steps. Allowing an empty style element carries no risk.
   */
  emptyStyle: "sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU=",
} as const;
