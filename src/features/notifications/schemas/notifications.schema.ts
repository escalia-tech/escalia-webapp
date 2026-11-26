import { z } from "zod";

import type { AppNotification } from "../types";

/** The notification centre of escalia-bff (`NotificationsPage` in `pages.yaml`). */
export const CATEGORIES = ["LEGAL", "ACCOUNT", "URGENT", "OPERATIONAL", "DIGEST"] as const;
export const CHANNELS = ["IN_APP", "EMAIL", "WEB_PUSH"] as const;
export const DIGEST_FREQUENCIES = ["DAILY", "WEEKLY", "OFF"] as const;

const notificationSchema = z.object({
  id: z.string(),
  code: z.string(),
  category: z.enum(CATEGORIES),
  title: z.string(),
  body: z.string(),
  createdAt: z.string(),
  readAt: z.string().nullish(),
});

export const notificationsPageSchema = z.object({
  items: z.array(notificationSchema),
  unreadCount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  page: z.number().int(),
  pageSize: z.number().int(),
});
export type NotificationsPage = z.infer<typeof notificationsPageSchema>;

export function toNotifications(page: NotificationsPage): AppNotification[] {
  return page.items.map((item) => ({ ...item, readAt: item.readAt ?? null }));
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

const preferencesSchema = z.object({
  categories: z.array(
    z.object({
      category: z.enum(CATEGORIES),
      channels: z.array(z.enum(CHANNELS)),
      locked: z.boolean(),
    }),
  ),
  digestFrequency: z.enum(DIGEST_FREQUENCIES),
  quietHoursEnabled: z.boolean(),
  quietFrom: z.string().regex(TIME).nullish(),
  quietTo: z.string().regex(TIME).nullish(),
  emailMasked: z.string().nullish(),
  emailInvalid: z.boolean(),
  pushSubscribed: z.boolean(),
  vapidPublicKey: z.string().nullish(),
});
export type NotificationPreferences = z.infer<typeof preferencesSchema>;

/** The preferences screen of escalia-bff (`NotificationPreferencesPage` in `pages.yaml`). */
export const preferencesPageSchema = z.object({ preferences: preferencesSchema });

export interface PreferencesBody {
  categories: { category: "OPERATIONAL"; channels: string[] }[];
  digestFrequency: (typeof DIGEST_FREQUENCIES)[number];
  quietHoursEnabled: boolean;
  quietFrom?: string;
  quietTo?: string;
}

export type ParsedPreferences = { ok: true; body: PreferencesBody } | { ok: false; reason: "digest" | "time" };

/**
 * Reads the preferences form. Official notices, account alerts and urgent repairs are not in it on purpose: they
 * cannot be turned off (FR-COM-02 BR-2), so the form never sends them. The app channel always stays on.
 */
export function parsePreferencesForm(form: FormData): ParsedPreferences {
  const digest = DIGEST_FREQUENCIES.find((value) => value === form.get("digestFrequency"));
  if (!digest) return { ok: false, reason: "digest" };
  const quietHoursEnabled = form.get("quietHoursEnabled") === "on";
  const from = String(form.get("quietFrom") ?? "");
  const to = String(form.get("quietTo") ?? "");
  if (quietHoursEnabled && !(TIME.test(from) && TIME.test(to))) return { ok: false, reason: "time" };
  const channels = ["IN_APP"];
  if (form.get("operationalEmail") === "on") channels.push("EMAIL");
  if (form.get("operationalPush") === "on") channels.push("WEB_PUSH");
  return {
    ok: true,
    body: {
      categories: [{ category: "OPERATIONAL", channels }],
      digestFrequency: digest,
      quietHoursEnabled,
      ...(quietHoursEnabled ? { quietFrom: from, quietTo: to } : {}),
    },
  };
}

const HTTPS = /^https:\/\/\S{1,990}$/;

export interface PushBody {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** What a browser's `PushSubscription.toJSON()` gives, checked before it goes to the core (the core checks again). */
export function parsePushSubscription(value: unknown): PushBody | null {
  const parsed = z
    .object({
      endpoint: z.string().regex(HTTPS),
      keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
    })
    .safeParse(value);
  return parsed.success
    ? { endpoint: parsed.data.endpoint, p256dh: parsed.data.keys.p256dh, auth: parsed.data.keys.auth }
    : null;
}
