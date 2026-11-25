import type { ReactNode } from "react";

import type { LucideIcon } from "lucide-react";

import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Empty state. Callers must distinguish "no data yet" from "filters returned nothing" by passing
 * different copy and actions (e.g. a "clear filters" button for the latter).
 */
export function EmptyState({ icon: Icon, title, description, actions, className }: EmptyStateProps) {
  return (
    <Empty className={cn("bg-card rounded-lg border border-dashed py-12", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? <EmptyDescription>{description}</EmptyDescription> : null}
      </EmptyHeader>
      {actions ? <EmptyContent>{actions}</EmptyContent> : null}
    </Empty>
  );
}
