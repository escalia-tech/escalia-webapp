"use client";

import { useTranslations } from "next-intl";

import { useNavAudience } from "@/components/layout/nav-audience";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { CONFIG_NAV, isNavItemActive, MAIN_NAV, type NavItem, navFor } from "@/config/navigation";
import { Link, usePathname } from "@/i18n/navigation";

function NavGroup({ items, label }: { items: readonly NavItem[]; label: string }) {
  const t = useTranslations("shell.nav");
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  return (
    <SidebarGroup className="px-2 py-2">
      <SidebarGroupLabel className="text-muted-foreground px-2 text-xs font-medium tracking-wide uppercase">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isNavItemActive(pathname, item);
            const itemLabel = t(`items.${item.key}`);
            const Icon = item.icon;
            return (
              <SidebarMenuItem key={item.key}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.status === "planned" ? `${itemLabel} — ${t("soon")}` : itemLabel}
                  className="rounded-lg font-medium"
                >
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpenMobile(false)}
                  >
                    <Icon aria-hidden />
                    <span className="min-w-0 flex-1 leading-tight">{itemLabel}</span>
                    {item.status === "planned" ? (
                      <span className="text-muted-foreground ml-auto shrink-0 overflow-visible! text-xs font-normal text-clip! group-data-[collapsible=icon]:hidden">
                        {t("soon")}
                      </span>
                    ) : null}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

/**
 * Seamless sidebar (V7): 232px / 56px, tinted background, flush with the header and the content,
 * no outer border, shadow or radius on the container; radius only on items. The logo lives in the
 * header, not here. On mobile it becomes an accessible drawer.
 */
export function AppSidebar() {
  const t = useTranslations("shell.nav");
  const audience = useNavAudience();

  return (
    <Sidebar
      collapsible="icon"
      mobileTitle={t("mobileTitle")}
      mobileDescription={t("mobileDescription")}
      className="top-(--header-height) h-[calc(100svh-var(--header-height))] shadow-none group-data-[side=left]:border-r-0"
    >
      <SidebarContent className="gap-0 pt-2">
        <nav aria-label={t("label")} className="flex flex-col">
          <NavGroup items={navFor(MAIN_NAV, audience)} label={t("groupMain")} />
          <NavGroup items={navFor(CONFIG_NAV, audience)} label={t("groupConfig")} />
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}
