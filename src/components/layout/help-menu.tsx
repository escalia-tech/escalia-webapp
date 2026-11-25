"use client";

import { CircleHelp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Help menu. The help center does not exist yet: the entry is disabled and says so (no dead link). */
export function HelpMenu() {
  const t = useTranslations("shell.header.help");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t("label")}>
          <CircleHelp className="size-[18px]" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t("title")}</DropdownMenuLabel>
        <DropdownMenuItem disabled>
          {t("docs")}
          <span className="text-muted-foreground ml-auto text-xs">{t("docsStatus")}</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <p className="text-muted-foreground px-2 py-1.5 text-xs">{t("shortcuts")}</p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
