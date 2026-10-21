import { cn } from "@/lib/ui/cn";

export interface DividerProps {
  orientation?: "horizontal" | "vertical";
  /** Visually hidden by default — a divider is a presentation detail, not
   * content; screen readers get the semantic `<hr>`/separator role instead. */
  className?: string;
  /** Optional inline label (e.g. "or") centered on the rule, matching the
   * common auth-page "or continue with" pattern for a future milestone. */
  label?: string;
}

// Generic, domain-neutral divider. No current M5.1 page uses one (login's
// single `<details>` disclosure and every other M4 page has no need yet) —
// defined now since a labeled divider is a common near-term auth-page need.
// Server Component: no interactivity.
export function Divider({ orientation = "horizontal", label, className }: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn("w-px self-stretch bg-border-default", className)}
      />
    );
  }

  if (label) {
    return (
      <div className={cn("flex items-center gap-3", className)} role="separator">
        <span className="h-px flex-1 bg-border-default" aria-hidden="true" />
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="h-px flex-1 bg-border-default" aria-hidden="true" />
      </div>
    );
  }

  return <hr className={cn("border-t border-border-default", className)} />;
}
