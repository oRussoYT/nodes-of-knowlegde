import { cn } from "@/lib/ui/cn";

export interface SkeletonProps {
  className?: string;
  /** Rendered shape — affects default sizing/radius only. */
  variant?: "text" | "block" | "circle";
}

// Low-motion, shape-matching placeholder for content not yet available on
// initial render — never a generic centered spinner for page-level content,
// per docs/design-system-architecture.md's "Loading conventions". The
// pulse animation is a plain CSS/Tailwind `animate-pulse` (no animation
// library, ADR-0005) and is fully suppressed by the
// `prefers-reduced-motion` rule in globals.css. `aria-hidden` — a skeleton
// is a purely visual loading affordance; the real accessible loading
// status belongs on the container that renders it (e.g. `aria-busy` or an
// `aria-live` region), not on the placeholder shapes themselves. Server
// Component: no interactivity.
export function Skeleton({ className, variant = "block" }: SkeletonProps) {
  const shape =
    variant === "circle" ? "rounded-full" : variant === "text" ? "h-4 rounded-sm" : "rounded-md";

  return <div aria-hidden="true" className={cn("animate-pulse bg-border-muted", shape, className)} />;
}
