"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Building2, Search } from "lucide-react";
import { useTranslations } from "next-intl";

import { useNavAudience } from "@/components/layout/nav-audience";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { ALL_NAV, navFor } from "@/config/navigation";
import type { BuildingListResult } from "@/features/buildings/schemas/building.schema";
import { useRouter } from "@/i18n/navigation";
import { bffFetch } from "@/lib/bff-client";

function useDebounced(value: string, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/**
 * Global search (Ctrl/Cmd + K): navigation pages plus demo buildings fetched through the BFF.
 * Buildings come from fictional fixtures; the group label says so.
 */
export function SearchCommand() {
  const audience = useNavAudience();
  const t = useTranslations("shell");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query.trim(), 250);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const buildings = useQuery({
    queryKey: ["buildings", "search", debounced],
    queryFn: ({ signal }) =>
      bffFetch<BuildingListResult>(`/api/bff/buildings?q=${encodeURIComponent(debounced)}&pageSize=10`, { signal }),
    enabled: open && debounced.length >= 2,
  });

  function go(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        aria-keyshortcuts="Control+K Meta+K"
        className="text-muted-foreground h-(--control-height) w-9 justify-center px-0 font-normal md:w-full md:max-w-sm md:justify-start md:gap-2 md:px-3"
      >
        <Search className="size-4 shrink-0" aria-hidden />
        <span className="sr-only truncate md:not-sr-only">{t("header.search.trigger")}</span>
        <kbd
          aria-hidden
          className="bg-muted text-muted-foreground pointer-events-none ml-auto hidden rounded border px-1.5 font-sans text-[11px] font-medium md:inline"
        >
          ⌘K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title={t("header.search.title")}
        description={t("header.search.description")}
      >
        <Command shouldFilter>
          <CommandInput value={query} onValueChange={setQuery} placeholder={t("header.search.placeholder")} />
          <CommandList>
            <CommandEmpty>{buildings.isError ? t("header.search.unavailable") : t("header.search.empty")}</CommandEmpty>
            <CommandGroup heading={t("header.search.groupPages")}>
              {navFor(ALL_NAV, audience).map((item) => {
                const Icon = item.icon;
                const label = t(`nav.items.${item.key}`);
                return (
                  <CommandItem key={item.key} value={label} onSelect={() => go(item.href)}>
                    <Icon aria-hidden />
                    {label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {buildings.data && buildings.data.items.length > 0 ? (
              <CommandGroup heading={t("header.search.groupBuildings")}>
                {buildings.data.items.map((building) => (
                  <CommandItem
                    key={building.id}
                    value={`${building.name} ${building.address.city}`}
                    onSelect={() => go(`/buildings/${building.id}`)}
                  >
                    <Building2 aria-hidden />
                    <span>{building.name}</span>
                    <span className="text-muted-foreground ml-auto text-xs">{building.address.city}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
