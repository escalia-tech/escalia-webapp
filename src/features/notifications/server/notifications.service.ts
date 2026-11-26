import "server-only";

import { fetchBffPage, postBffAction } from "@/server/bff-pages/client";

import {
  type NotificationPreferences,
  notificationsPageSchema,
  parsePreferencesForm,
  preferencesPageSchema,
  toNotifications,
} from "../schemas/notifications.schema";
import type { NotificationsState } from "../types";

const ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The bell of the header (FR-COM-02). Any failure of the BFF, including "no session", becomes `unavailable`: the
 * header says so instead of showing nothing or something invented.
 */
export async function getNotifications(language: string): Promise<NotificationsState> {
  try {
    const page = await fetchBffPage("notifications.list", "/pages/notifications", notificationsPageSchema, {
      language,
    });
    return { status: "ready", items: toNotifications(page), unreadCount: page.unreadCount };
  } catch {
    return { status: "unavailable" };
  }
}

/** The preferences screen; null when the BFF cannot answer. */
export async function getPreferences(language: string): Promise<NotificationPreferences | null> {
  try {
    const page = await fetchBffPage(
      "notifications.preferences",
      "/pages/notification-preferences",
      preferencesPageSchema,
      { language },
    );
    return page.preferences;
  } catch {
    return null;
  }
}

export type NotificationOutcome =
  | { status: "done" }
  | { status: "invalid"; reason: "id" | "digest" | "time" }
  | { status: "refused"; message: string | undefined };

/** Marks one notification, or all of them when `ids` is null, as read. */
export async function markRead(ids: string[] | null, language: string): Promise<NotificationOutcome> {
  if (ids?.some((id) => !ID.test(id))) return { status: "invalid", reason: "id" };
  const result = await postBffAction(
    "notifications.read",
    "/actions/mark-notifications-read",
    ids === null ? { all: true } : { ids },
    language,
  );
  return result.ok ? { status: "done" } : { status: "refused", message: result.message };
}

export async function savePreferences(form: FormData, language: string): Promise<NotificationOutcome> {
  const parsed = parsePreferencesForm(form);
  if (!parsed.ok) return { status: "invalid", reason: parsed.reason };
  const result = await postBffAction(
    "notifications.preferences.save",
    "/actions/update-notification-preferences",
    parsed.body,
    language,
  );
  return result.ok ? { status: "done" } : { status: "refused", message: result.message };
}
