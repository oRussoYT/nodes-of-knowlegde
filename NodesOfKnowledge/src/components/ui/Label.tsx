import type { LabelHTMLAttributes } from "react";

import { cn } from "@/lib/ui/cn";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Shows a required-field marker. The native `required` attribute on the
   * control itself is still the source of truth — this is a visual echo of
   * it, per docs/design-system-architecture.md's "Form conventions". */
  required?: boolean;
}

// Extracted from FormField's inline label markup so Textarea/Select/
// Checkbox/Radio/Switch can all compose the same label styling directly,
// per docs/design-system-architecture.md: "FormField generalizes ... to
// wrap Input/Textarea/Select/Checkbox/Radio uniformly". Server Component:
// no interactivity.
export function Label({ required, className, children, ...rest }: LabelProps) {
  return (
    <label className={cn("text-sm font-medium text-foreground", className)} {...rest}>
      {children}
      {required ? (
        <span aria-hidden="true" className="text-destructive">
          {" "}
          *
        </span>
      ) : null}
    </label>
  );
}
