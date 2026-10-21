import type { InputHTMLAttributes, ReactNode } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
}

// No current M4 use; needed once a form has mutually exclusive options
// (docs/design-system-architecture.md's component table — future vocab/
// role pickers). Same `accent-color`-based theming approach as Checkbox,
// for the same reasons, including `forwardRef`.
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio({ label, className, id, ...rest }, ref) {
  const control = (
    <input
      ref={ref}
      type="radio"
      id={id}
      className={cn(
        "size-4 border-border-default text-accent accent-accent",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus",
        "disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)",
        className
      )}
      {...rest}
    />
  );

  if (!label) return control;

  return (
    <label htmlFor={id} className="flex items-start gap-2 text-sm text-foreground">
      {control}
      <span>{label}</span>
    </label>
  );
});
