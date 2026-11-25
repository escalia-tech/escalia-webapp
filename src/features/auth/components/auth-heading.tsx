import type { ReactNode } from "react";

/** Page title block of an authentication screen (one h1 per page). */
export function AuthHeading({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 space-y-1.5">
      <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
      {subtitle ? <p className="text-muted-foreground text-sm text-balance">{subtitle}</p> : null}
      {children}
    </div>
  );
}
