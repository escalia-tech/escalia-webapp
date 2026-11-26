import "server-only";

import { isDemoModeEnabled } from "@/server/config/env";

import type { NotificationsState } from "../types";

/**
 * Notifications for the header menu. No notification backend exists yet: only FICTIONAL demo items
 * are returned, and only when demo mode is enabled in a non-production environment. Everywhere else
 * the state is `unavailable` (the UI says so instead of showing fake data).
 */
export async function getNotifications(): Promise<NotificationsState> {
  if (!isDemoModeEnabled()) return { status: "unavailable" };
  return {
    status: "demo",
    items: [
      { id: "demo-n1", kind: "payment", building: "Résidence Démo Cèdre", at: "2026-11-24T14:05:00Z" },
      { id: "demo-n2", kind: "maintenance", building: "Les Érables (fictif)", at: "2026-11-23T09:40:00Z" },
      { id: "demo-n3", kind: "document", building: "Condos du Lac (fictif)", at: "2026-11-21T17:20:00Z" },
    ],
  };
}
