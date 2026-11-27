"use client";

import type { CSSProperties, ReactNode } from "react";

import { useTranslations } from "next-intl";

import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { NavAudienceProvider } from "@/components/layout/nav-audience";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import type { NavAudience } from "@/config/navigation";
import type { NotificationsState } from "@/features/notifications/types";

interface AppShellProps {
  children: ReactNode;
  /** Sidebar state read from the `escalia_sidebar` cookie on the server (no layout flash). */
  defaultSidebarOpen: boolean;
  user: { displayName: string; initials: string };
  notifications: NotificationsState;
  /** Which menu entries this person sees (landlord, lease party, or both). */
  navAudience: NavAudience;
}

/**
 * Application shell: global header (64px) over a seamless sidebar (232px / 56px) and the content
 * area. The content scrolls with the page; header and sidebar stay fixed. A skip link is the first
 * focusable element for keyboard users.
 */
export function AppShell({ children, defaultSidebarOpen, user, notifications, navAudience }: AppShellProps) {
  const t = useTranslations("common.a11y");

  return (
    <NavAudienceProvider value={navAudience}>
      <SidebarProvider
        defaultOpen={defaultSidebarOpen}
        style={{ "--sidebar-width": "14.5rem", "--sidebar-width-icon": "3.5rem" } as CSSProperties}
      >
        <a
          href="#main-content"
          className="bg-primary text-primary-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          {t("skipToContent")}
        </a>
        <AppHeader user={user} notifications={notifications} />
        <AppSidebar />
        <SidebarInset id="main-content" tabIndex={-1} className="min-w-0 pt-(--header-height) outline-none">
          <div className="pb-safe mx-auto w-full max-w-[1600px] flex-1 p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </NavAudienceProvider>
  );
}
