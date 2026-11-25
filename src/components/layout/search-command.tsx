"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { Building2, Search } from "lucide-react";
import { useTranslations } from "next-intl";

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
import { ALL_NAV } from "@/config/navigation";
import type { PropertyListResult } from "@/features/properties/schemas/property.schema";
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
 * Global search (Ctrl/Cmd + K): navigation pages plus demo properties fetched through the BFF.
 * Properties come from fictional fixtures; the group label says so.
 */
export function SearchCommand() {
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

  const properties = useQuery({
    queryKey: ["properties", "search", debounced],
    queryFn: ({ signal }) =>
      bffFetch<PropertyListResult>(`/api/bff/properties?q=${encodeURIComponent(debounced)}&pageSize=10`, { signal }),
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
            <CommandEmpty>
              {properties.isError ? t("header.search.unavailable") : t("header.search.empty")}
            </CommandEmpty>
            <CommandGroup heading={t("header.search.groupPages")}>
              {ALL_NAV.map((item) => {
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
            {properties.data && properties.data.items.length > 0 ? (
              <CommandGroup heading={t("header.search.groupProperties")}>
                {properties.data.items.map((property) => (
                  <CommandItem
                    key={property.id}
                    value={`${property.name} ${property.address.city}`}
                    onSelect={() => go(`/properties/${property.id}`)}
                  >
                    <Building2 aria-hidden />
                    <span>{property.name}</span>
                    <span className="text-muted-foreground ml-auto text-xs">{property.address.city}</span>
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
