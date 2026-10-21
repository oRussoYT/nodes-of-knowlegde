import type { SelectHTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

import { fieldControlBaseClasses, fieldControlBorderClasses } from "./field-control-classes";

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

// Native <select>, styled — not a custom listbox — per
// docs/design-system-architecture.md's component table: "the simplest
// accessible option". Deliberately keeps the browser's native dropdown
// affordance (no `appearance-none` + hand-drawn chevron) rather than
// reaching for an icon to replace it — native select behavior (keyboard,
// screen reader, platform-consistent) is exactly right here and free.
// `forwardRef` per the same accessibility requirement as Input.
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { invalid, className, "aria-invalid": ariaInvalid, children, ...rest },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={ariaInvalid ?? (invalid ? true : undefined)}
      className={cn(fieldControlBaseClasses, fieldControlBorderClasses(invalid), className)}
      {...rest}
    >
      {children}
    </select>
  );
});
