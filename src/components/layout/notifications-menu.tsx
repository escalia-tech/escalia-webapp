"use client";

import { useTransition } from "react";

import { Bell } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { markAllReadAction, markReadAction } from "@/features/notifications/server/notifications.actions";
import type { NotificationsState } from "@/features/notifications/types";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The bell (FR-COM-02): the notifications the core wrote for the signed-in person, unread first, with "mark all
 * as read" and a link to the preferences. Without a BFF session the state is "unavailable" and says so.
 */
export function NotificationsMenu({ state }: { state: NotificationsState }) {
  const t = useTranslations("shell.header.notifications");
  const format = useFormatter();
  const [pending, startTransition] = useTransition();
  const count = state.status === "ready" ? state.unreadCount : 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`${t("label")} — ${t("unread", { count })}`}
        >
          <Bell className="size-[18px]" aria-hidden />
          {count > 0 ? (
            <span
              aria-hidden
              className="bg-primary ring-header absolute top-1.5 right-1.5 size-2 rounded-full ring-2"
            />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1.5rem))] gap-0 p-0">
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h2 className="text-base leading-[22px] font-semibold">{t("title")}</h2>
          {state.status === "ready" ? <Badge variant="secondary">{t("unread", { count })}</Badge> : null}
        </div>
        {state.status === "ready" ? (
          <>
            {state.items.length === 0 ? (
              <p className="text-muted-foreground px-4 py-6 text-sm">{t("empty")}</p>
            ) : (
              <ul className="max-h-96 divide-y overflow-y-auto">
                {state.items.map((item) => (
                  <li key={item.id} className={cn("px-4 py-3", item.readAt === null && "bg-muted/40")}>
                    <p className={cn("text-sm", item.readAt === null && "font-semibold")}>{item.title}</p>
                    <p className="text-muted-foreground mt-0.5 text-sm">{item.body}</p>
                    <p className="text-muted-foreground mt-1 flex items-center justify-between gap-2 text-xs">
                      <time dateTime={item.createdAt}>
                        {format.dateTime(new Date(item.createdAt), { dateStyle: "medium", timeStyle: "short" })}
                      </time>
                      {item.readAt === null ? (
                        <Button
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          disabled={pending}
                          onClick={() => startTransition(() => void markReadAction(item.id))}
                        >
                          {t("markRead")}
                        </Button>
                      ) : null}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center justify-between gap-2 border-t px-4 py-2.5">
              <Button
                variant="ghost"
                size="sm"
                disabled={pending || count === 0}
                onClick={() => startTransition(() => void markAllReadAction())}
              >
                {t("markAllRead")}
              </Button>
              <Button variant="link" size="sm" asChild>
                <Link href="/settings/notifications">{t("preferences")}</Link>
              </Button>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground px-4 py-6 text-sm">{t("unavailable")}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
