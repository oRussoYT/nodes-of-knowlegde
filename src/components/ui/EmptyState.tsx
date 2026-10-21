import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** Optional next action — e.g. a `Button` or `Link`. Rendered as-is. */
  action?: ReactNode;
  className?: string;
}

// Content that could exist but doesn't yet for this user/record — e.g.
// `/member`'s "not yet connected" state (docs/application-information-architecture.md,
// "Dashboard hierarchy" and "Empty, loading, error, and permission-denied
// states"). A short, honest explanation and, where relevant, a next
// action — never styled identically to an error, never a fabricated zero
// or a skeleton pretending to load real data. Server Component: no
// interactivity of its own (the `action` slot may contain a Client
// Component, but EmptyState itself does not need to be one).
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border-default bg-surface px-4 py-6 text-center",
        className
      )}
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
