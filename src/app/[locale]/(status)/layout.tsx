import type { ReactNode } from "react";

import { PublicShell } from "@/components/layout/public-shell";

export default function StatusLayout({ children }: { children: ReactNode }) {
  return <PublicShell width="max-w-xl">{children}</PublicShell>;
}
