"use client";

import { createContext, type ReactNode, useContext } from "react";

import type { NavAudience } from "@/config/navigation";

const NavAudienceContext = createContext<NavAudience>({ landlord: true, party: false });

/** Who the menu is for, set once by the app shell from the BFF shell roles. */
export function NavAudienceProvider({ value, children }: { value: NavAudience; children: ReactNode }) {
  return <NavAudienceContext.Provider value={value}>{children}</NavAudienceContext.Provider>;
}

export function useNavAudience(): NavAudience {
  return useContext(NavAudienceContext);
}
