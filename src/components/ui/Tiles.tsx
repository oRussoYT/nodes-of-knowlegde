import Link from "next/link";
import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

// Dashboard building blocks shared by the member area, the steward console and
// the outcomes panel. A StatTile shows one count of RECORDS (never a score of
// a person) with the number set large in the display face; an ActionTile is a
// whole-card link to the next place to work.

export function StatTile({
  value,
  label,
  emphasis = false,
  className,
}: {
  value: number | string;
  label: string;
  /** Accent the number (use for the one figure the page is about). */
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col-reverse justify-end gap-1 rounded-xl border border-border-default bg-surface px-4 py-4", className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-display text-4xl font-bold leading-none tracking-tight tabular-nums [font-stretch:85%]",
          emphasis ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function ActionTile({
  href,
  title,
  description,
  meta,
}: {
  href: string;
  title: string;
  description: string;
  /** Optional short line under the description, e.g. what is waiting. */
  meta?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="nk-tile group flex min-h-36 flex-col justify-between gap-4 rounded-xl border border-border-default bg-background p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span>
        <span className="flex items-start justify-between gap-3">
          <span className="font-display text-lg font-bold leading-tight tracking-tight text-foreground">{title}</span>
          <span aria-hidden="true" className="nk-arrow text-accent">
            ↗
          </span>
        </span>
        <span className="mt-2 block text-sm text-muted-foreground">{description}</span>
      </span>
      {meta ? <span className="text-sm font-medium text-foreground">{meta}</span> : null}
    </Link>
  );
}
