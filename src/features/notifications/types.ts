export type NotificationKind = "payment" | "maintenance" | "document";

export interface DemoNotification {
  id: string;
  kind: NotificationKind;
  /** Fictional property label interpolated into the translated message. */
  property: string;
  /** ISO timestamp. */
  at: string;
}

export type NotificationsState = { status: "demo"; items: DemoNotification[] } | { status: "unavailable" };
