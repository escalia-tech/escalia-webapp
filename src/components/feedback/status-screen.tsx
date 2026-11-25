import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface StatusScreenProps {
  /** Short code such as "404"; decorative, the title carries the meaning. */
  code?: string;
  title: string;
  description: string;
  /** Support reference (correlation id / digest), shown only when available. */
  reference?: string;
  actions?: ReactNode;
  className?: string;
  /** `page` fills the viewport (public status routes), `inline` sits inside the app shell content. */
  variant?: "page" | "inline";
}

/** Full-width status screen (404, 403, 500, maintenance, session expired). Never exposes technical details. */
export function StatusScreen({
  code,
  title,
  description,
  reference,
  actions,
  className,
  variant = "inline",
}: StatusScreenProps) {
  return (
    <section
      aria-labelledby="status-title"
      className={cn(
        "mx-auto flex w-full max-w-lg flex-col items-center justify-center gap-4 px-4 text-center",
        variant === "page" ? "min-h-svh py-12" : "min-h-[50vh] py-12",
        className,
      )}
    >
      {code ? (
        <p aria-hidden className="text-muted-foreground text-6xl font-semibold tracking-tight tabular-nums">
          {code}
        </p>
      ) : null}
      <div className="space-y-2">
        <h1 id="status-title" className="text-2xl font-semibold tracking-tight text-balance">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm text-balance">{description}</p>
        {reference ? <p className="text-muted-foreground pt-1 font-mono text-xs">{reference}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center justify-center gap-2">{actions}</div> : null}
    </section>
  );
}
