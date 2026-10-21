import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

export type ButtonEmphasis = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md" | "lg";

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-4 py-2 text-sm", // matches SubmitButton's existing M4 sizing exactly
  lg: "px-5 py-2.5 text-base",
};

const EMPHASIS_CLASSES: Record<ButtonEmphasis, string> = {
  primary: "bg-accent text-accent-foreground shadow-sm hover:bg-accent-hover active:bg-accent-active",
  secondary:
    "border border-border-default bg-surface text-foreground shadow-sm hover:border-border-strong hover:bg-surface-sunken",
  ghost: "bg-transparent text-foreground hover:bg-surface",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive-hover",
};

/**
 * Shared class-builder so `Button` and `SubmitButton` (which cannot itself
 * be this component — it wraps `useFormStatus`, a hook only valid inside a
 * `<form>`) render visually identical variants from one source of truth.
 * Exported for that reuse, not intended as a general public API surface.
 */
export function buttonVariants({
  emphasis = "primary",
  size = "md",
  fullWidth = false,
}: {
  emphasis?: ButtonEmphasis;
  size?: ButtonSize;
  fullWidth?: boolean;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
    "duration-(--duration-fast) ease-(--ease-standard)",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus",
    "disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)",
    SIZE_CLASSES[size],
    EMPHASIS_CLASSES[emphasis],
    fullWidth && "w-full"
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  emphasis?: ButtonEmphasis;
  size?: ButtonSize;
  fullWidth?: boolean;
}

// Generic action trigger. Generalizes SubmitButton's existing visual
// language (docs/design-system-architecture.md, component table) —
// SubmitButton itself is kept as a separate component (its
// `useFormStatus`-driven pending state is only valid inside a <form>, so it
// can't simply extend this one), but both now render from
// `buttonVariants()` so they stay visually identical.
//
// `forwardRef`: required per docs/design-system-architecture.md's
// accessibility requirements ("forwardRef / ref passthrough on every
// primitive that wraps a native interactive element") — this is also what
// makes `<DialogTrigger asChild><Button/></DialogTrigger>`-style Radix
// composition work correctly (Radix's `Slot` needs a real ref to the
// underlying `<button>` for focus management). `forwardRef` itself is a
// universal React API, not client-only — this stays usable as a Server
// Component when rendered from one.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { emphasis = "primary", size = "md", fullWidth = false, className, type = "button", ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ emphasis, size, fullWidth }), className)}
      {...rest}
    />
  );
});
