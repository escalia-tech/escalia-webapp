import {
  BarChart3,
  Building2,
  DoorOpen,
  FileSignature,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Scale,
  Settings,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";

/**
 * Application navigation. `status: "planned"` items point to a translated placeholder page with an
 * explicit "coming soon" state: no fake actions, no invented workflow (docs/product/PRODUCT_SPECIFICATION.md).
 * Hiding an item here is NOT an access-control mechanism; authorisation is enforced server-side.
 */

export type NavKey =
  | "dashboard"
  | "buildings"
  | "rules"
  | "units"
  | "tenants"
  | "leases"
  | "payments"
  | "maintenance"
  | "documents"
  | "reports"
  | "settings";

export interface NavItem {
  key: NavKey;
  href: `/${string}`;
  icon: LucideIcon;
  status: "available" | "planned";
}

export const MAIN_NAV: readonly NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, status: "available" },
  { key: "buildings", href: "/buildings", icon: Building2, status: "available" },
  { key: "units", href: "/units", icon: DoorOpen, status: "planned" },
  { key: "tenants", href: "/tenants", icon: Users, status: "planned" },
  { key: "leases", href: "/leases", icon: FileSignature, status: "planned" },
  { key: "payments", href: "/payments", icon: Wallet, status: "planned" },
  { key: "maintenance", href: "/maintenance", icon: Wrench, status: "planned" },
  { key: "documents", href: "/documents", icon: FileText, status: "planned" },
  { key: "reports", href: "/reports", icon: BarChart3, status: "planned" },
  { key: "rules", href: "/rules", icon: Scale, status: "available" },
];

export const CONFIG_NAV: readonly NavItem[] = [
  { key: "settings", href: "/settings/preferences", icon: Settings, status: "available" },
];

export const ALL_NAV: readonly NavItem[] = [...MAIN_NAV, ...CONFIG_NAV];

/** Active when the pathname (without locale) equals or is nested under the item's section. */
export function isNavItemActive(pathnameWithoutLocale: string, item: NavItem): boolean {
  const section = item.key === "settings" ? "/settings" : item.href;
  return pathnameWithoutLocale === section || pathnameWithoutLocale.startsWith(`${section}/`);
}
