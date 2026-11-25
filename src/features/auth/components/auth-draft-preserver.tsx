"use client";

import { useEffect } from "react";

const PREFIX = "escalia_auth_draft:";

/**
 * Keeps non-sensitive auth fields through a locale navigation. Password inputs are intentionally
 * excluded and no draft leaves the current browser session.
 */
export function AuthDraftPreserver() {
  useEffect(() => {
    const key = `${PREFIX}${window.location.pathname.replace(/^\/(fr-CA|en-CA)/, "")}`;
    const restore = () => {
      try {
        const draft = JSON.parse(sessionStorage.getItem(key) ?? "{}") as Record<string, string>;
        for (const [name, value] of Object.entries(draft)) {
          const input = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
            `[name="${CSS.escape(name)}"]`,
          );
          if (input && (!(input instanceof HTMLInputElement) || input.type !== "password")) {
            input.value = value;
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      } catch {
        // A malformed local draft is ignored; it is not application data.
      }
    };

    const save = () => {
      const values: Record<string, string> = {};
      document
        .querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("form [name]")
        .forEach((field) => {
          if ((!(field instanceof HTMLInputElement) || field.type !== "password") && field.name) {
            values[field.name] = field.value;
          }
        });
      sessionStorage.setItem(key, JSON.stringify(values));
    };

    restore();
    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
    };
  }, []);

  return null;
}
