/** One notification of the centre, already written by the core in the reader's language (FR-COM-02). */
export interface AppNotification {
  id: string;
  code: string;
  category: "LEGAL" | "ACCOUNT" | "URGENT" | "OPERATIONAL" | "DIGEST";
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export type NotificationsState =
  | { status: "ready"; items: AppNotification[]; unreadCount: number }
  | { status: "unavailable" };
