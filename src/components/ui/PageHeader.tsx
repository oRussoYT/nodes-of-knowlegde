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
    <div className={cn("flex flex-wrap items-start justify-between gap-4", className)}>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
