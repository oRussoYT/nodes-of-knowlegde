import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

const GAPS = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-10",
} as const;

// Responsive column counts, mobile-first — the only breakpoint that matters
// structurally for M5.1-scoped primitives is `md`
// (docs/application-information-architecture.md), so column counts step at
// base -> md -> lg, not every Tailwind breakpoint.
const COLS = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
} as const;

export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: keyof typeof COLS;
  gap?: keyof typeof GAPS;
  as?: ElementType;
  children?: ReactNode;
}

// Generic, mobile-first responsive grid primitive. No M5.1 page uses it yet
// (every current page is single-column) — defined now, per
// docs/ui-vision.md's "Responsive philosophy": desktop is where
// multi-column layouts are appropriate, mobile collapses to one column.
// Server Component: no interactivity.
export function Grid({ cols = 2, gap = "md", as: Component = "div", className, children, ...rest }: GridProps) {
  return (
    <Component className={cn("grid", COLS[cols], GAPS[gap], className)} {...rest}>
      {children}
    </Component>
  );
}
