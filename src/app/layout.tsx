import type { ReactNode } from "react";

/**
 * Pass-through root layout: the real <html>/<body> live in `[locale]/layout.tsx` so the `lang`
 * attribute follows the URL locale (next-intl pattern).
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
