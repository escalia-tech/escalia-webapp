import { z } from "zod";

import { locales } from "@/i18n/routing";

/**
 * Demo adapter of the user-preferences endpoint. When a backend profile exists, preferences are
 * persisted there through the BFF; until then this HttpOnly cookie (written only by the BFF, 1 year)
 * stores non-sensitive choices. Explicitly a DEMONSTRATION adapter, not a user profile.
 */

export const preferencesSchema = z.object({
  locale: z.enum(locales).optional(),
  timezone: z
    .string()
    .max(64)
    .refine((value) => {
      try {
        new Intl.DateTimeFormat("en-CA", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    }, "Unknown IANA time zone")
    .optional(),
});

export type Preferences = z.infer<typeof preferencesSchema>;

export function readPreferencesCookie(raw: string | undefined): Preferences {
  if (!raw) return {};
  try {
    const parsed = preferencesSchema.safeParse(JSON.parse(decodeURIComponent(raw)));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
}

export function serializePreferences(preferences: Preferences): string {
  return encodeURIComponent(JSON.stringify(preferences));
}
