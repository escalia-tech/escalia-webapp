import {
  BarChart3,
  Building2,
  FileSignature,
  FileText,
  KeyRound,
  LayoutDashboard,
  type LucideIcon,
  Scale,
  Settings,
  Upload,
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
  | "imports"
  | "leases"
  | "tenant"
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
  /**
   * Who the entry is for (page model section 4: the menu follows the person's memberships, never a role picker).
   * `landlord`: owners and co-owners of the organization; `party`: tenants, occupants and guarantors of a lease;
   * `all`: everyone signed in.
   */
  audience: "landlord" | "party" | "all";
}

export const MAIN_NAV: readonly NavItem[] = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard, status: "available", audience: "landlord" },
  { key: "buildings", href: "/buildings", icon: Building2, status: "available", audience: "landlord" },
  { key: "leases", href: "/leases", icon: FileSignature, status: "available", audience: "landlord" },
  { key: "tenant", href: "/tenant", icon: KeyRound, status: "available", audience: "party" },
  { key: "payments", href: "/payments", icon: Wallet, status: "planned", audience: "landlord" },
  { key: "maintenance", href: "/maintenance", icon: Wrench, status: "planned", audience: "landlord" },
  { key: "documents", href: "/documents", icon: FileText, status: "planned", audience: "landlord" },
  { key: "reports", href: "/reports", icon: BarChart3, status: "planned", audience: "landlord" },
  { key: "imports", href: "/imports", icon: Upload, status: "available", audience: "landlord" },
  { key: "rules", href: "/rules", icon: Scale, status: "available", audience: "all" },
];

export const CONFIG_NAV: readonly NavItem[] = [
  { key: "settings", href: "/settings/preferences", icon: Settings, status: "available", audience: "all" },
];

export const ALL_NAV: readonly NavItem[] = [...MAIN_NAV, ...CONFIG_NAV];

/** What the signed-in person is, as far as the menu is concerned. */
export interface NavAudience {
  landlord: boolean;
  party: boolean;
}

/** Roles that make a person a landlord or a lease party (escalia-bff `ShellUser.roles`). */
const LANDLORD_ROLES = new Set(["OWNER", "CO_OWNER"]);
const PARTY_ROLES = new Set(["TENANT", "OCCUPANT", "GUARANTOR"]);

/**
 * The menu audience from the shell roles. Unknown roles (no BFF: the labelled demo) keep the landlord menu, which
 * is what the demo data shows.
 */
export function navAudience(roles: readonly string[] | null): NavAudience {
  if (roles === null) return { landlord: true, party: false };
  return {
    landlord: roles.some((role) => LANDLORD_ROLES.has(role)),
    party: roles.some((role) => PARTY_ROLES.has(role)),
  };
}

/** The entries one person sees. Hiding an entry is not access control: every page still checks on the server. */
export function navFor(items: readonly NavItem[], audience: NavAudience): NavItem[] {
  return items.filter(
    (item) =>
      item.audience === "all" ||
      (item.audience === "landlord" && audience.landlord) ||
      (item.audience === "party" && audience.party),
  );
}

/** Active when the pathname (without locale) equals or is nested under the item's section. */
export function isNavItemActive(pathnameWithoutLocale: string, item: NavItem): boolean {
  const section = item.key === "settings" ? "/settings" : item.href;
  return pathnameWithoutLocale === section || pathnameWithoutLocale.startsWith(`${section}/`);
}

/**
 * Where a person starts after signing in. A lease party who is not a landlord starts on "Mes baux": the dashboard is
 * the landlord's overview.
 */
export function homeFor(audience: NavAudience): "/dashboard" | "/tenant" {
  return audience.party && !audience.landlord ? "/tenant" : "/dashboard";
}
