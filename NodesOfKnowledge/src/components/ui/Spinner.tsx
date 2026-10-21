import { cn } from "@/lib/ui/cn";

export type SpinnerSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<SpinnerSize, string> = {
  sm: "size-4 border-2",
  md: "size-5 border-2",
  lg: "size-7 border-[3px]",
};

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /**
   * Accessible status text — required, not optional, per
   * docs/design-system-architecture.md's "Loading conventions": "never a
   * spinner alone with no text equivalent". Visually hidden by default
   * (`showLabel`) since most call sites pair the spinner with visible
   * label text of their own; set `showLabel` to render it inline instead.
   */
  label: string;
  showLabel?: boolean;
}

// Short, indeterminate in-page action indicator — distinct from
// SubmitButton's own built-in pending state, for non-form async actions
// (docs/design-system-architecture.md's component table). No animation
// library (ADR-0005): a plain CSS `animate-spin` border-spinner, fully
// suppressed by the `prefers-reduced-motion` rule in globals.css (the
// spin stops; the `role="status"` text equivalent still communicates
// "in progress"). Server Component: no interactivity of its own.
export function Spinner({ size = "md", className, label, showLabel = false }: SpinnerProps) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "animate-spin rounded-full border-border-default border-t-accent",
          SIZE_CLASSES[size]
        )}
      />
      <span className={showLabel ? "text-sm text-muted-foreground" : "sr-only"}>{label}</span>
    </span>
  );
}
