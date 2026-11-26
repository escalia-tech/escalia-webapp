import type { ReactNode } from "react";

import { PublicShell } from "@/components/layout/public-shell";

/** Signing by link and checking a sealed file need no account: the link and the emailed code are the proof. */
export default function SignLayout({ children }: { children: ReactNode }) {
  return <PublicShell width="max-w-4xl">{children}</PublicShell>;
}
