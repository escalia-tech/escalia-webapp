"use client";

import { Bell } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { NotificationsState } from "@/features/notifications/types";

/**
 * Notifications popover. Data comes from the server layout: fictional demo items in dev/test, an
 * explicit "unavailable" state otherwise. There are no actions (no mark-as-read) because no contract exists.
 */
export function NotificationsMenu({ state }: { state: NotificationsState }) {
  const t = useTranslations("shell.header.notifications");
  const format = useFormatter();
  const count = state.status === "demo" ? state.items.length : 0;

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
          {state.status === "demo" ? <Badge variant="secondary">{t("unread", { count })}</Badge> : null}
        </div>
        {state.status === "demo" ? (
          <>
            <ul className="divide-y">
              {state.items.map((item) => (
                <li key={item.id} className="px-4 py-3">
                  <p className="text-sm">{t(`kinds.${item.kind}`, { building: item.building })}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    <time dateTime={item.at}>
                      {format.dateTime(new Date(item.at), { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })}
                    </time>
                  </p>
                </li>
              ))}
            </ul>
            <p className="bg-info-surface text-info-foreground border-t px-4 py-2.5 text-xs">{t("demoNotice")}</p>
          </>
        ) : (
          <p className="text-muted-foreground px-4 py-6 text-sm">{t("unavailable")}</p>
        )}
      </PopoverContent>
    </Popover>
  );
}
