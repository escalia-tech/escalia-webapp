import { describe, expect, it } from "vitest";

import { MESSAGE_DOMAINS } from "@/i18n/config";
import { locales } from "@/i18n/routing";

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Tree = { [key: string]: string | Tree };

const root = join(process.cwd(), "messages");
const load = (locale: string, domain: string): Tree =>
  JSON.parse(readFileSync(join(root, locale, `${domain}.json`), "utf8"));

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const entries = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") entries.set(path, value);
    else for (const [nestedKey, nestedValue] of flatten(value, path)) entries.set(nestedKey, nestedValue);
  }
  return entries;
}

/** ICU argument names used in a message (`{count}`, `{count, plural, ...}`) and rich tags (`<terms>`). */
function placeholders(message: string): string[] {
  const args = [...message.matchAll(/\{(\w+)(?:,|\})/g)].map((match) => `{${match[1]}}`);
  const tags = [...message.matchAll(/<(\w+)>/g)].map((match) => `<${match[1]}>`);
  return [...new Set([...args, ...tags])].sort();
}

describe("message catalogues", () => {
  it("contains exactly one file per declared domain in every locale", () => {
    for (const locale of locales) {
      const files = readdirSync(join(root, locale))
        .filter((file) => file.endsWith(".json"))
        .map((file) => file.replace(".json", ""))
        .sort();
      expect(files).toEqual([...MESSAGE_DOMAINS].sort());
    }
  });

  for (const domain of MESSAGE_DOMAINS) {
    describe(domain, () => {
      const [reference, ...others] = locales;
      const referenceEntries = flatten(load(reference as string, domain));

      it("is not empty", () => {
        expect(referenceEntries.size).toBeGreaterThan(0);
      });

      it("has no dot or empty segment inside a key (next-intl uses dots for nesting)", () => {
        const raw = JSON.stringify(load(reference as string, domain));
        for (const match of raw.matchAll(/"([^"]*)":/g)) {
          expect(match[1]).not.toContain(".");
          expect(match[1]).not.toBe("");
        }
      });

      for (const locale of others) {
        it(`has identical keys in ${locale}`, () => {
          const entries = flatten(load(locale, domain));
          expect([...entries.keys()].sort()).toEqual([...referenceEntries.keys()].sort());
        });

        it(`keeps the same ICU placeholders in ${locale}`, () => {
          const entries = flatten(load(locale, domain));
          for (const [key, message] of referenceEntries) {
            expect(placeholders(entries.get(key) ?? ""), key).toEqual(placeholders(message));
          }
        });

        it(`has no empty translation in ${locale}`, () => {
          for (const [key, message] of flatten(load(locale, domain))) {
            expect(message.trim(), key).not.toBe("");
          }
        });
      }
    });
  }
});
