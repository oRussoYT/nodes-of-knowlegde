import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

export interface PageHeaderProps {
  title: string;
  description?: string;
  /** Optional primary action — e.g. a `Button` or `Link`, right-aligned. */
  action?: ReactNode;
  className?: string;
}

// Formalizes the repeated `<h1>` + description pattern already on every M4
// page (`/`, `/member`, `/account`, etc.), per
// docs/design-system-architecture.md's component table and
// docs/application-information-architecture.md's "Page hierarchy" (item 1:
// "Page header — title, optional short description, optional primary
// action. No breadcrumb at this shallow depth"). Not wired into any real
// page in M5.1 (page redesigns are M5.2 scope) — defined and exported now,
// ready to compose. Server Component: no interactivity of its own.
export function PageHeader({ title, description, action, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-border-default pb-6", className)}>
      <div className="min-w-0">
        <h1 className="font-display text-4xl font-bold leading-[1] tracking-[-0.02em] text-foreground sm:text-6xl">
          {title}
        </h1>
        {description ? <p className="mt-3 max-w-prose text-base text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
