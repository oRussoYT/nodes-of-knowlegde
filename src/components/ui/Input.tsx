import type { InputHTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

import { fieldControlBaseClasses, fieldControlBorderClasses } from "./field-control-classes";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

// Standalone `Input` — the same visual control FormField already wraps
// (M4), extracted so a future form can compose Label + Input + HelperText/
// FieldError directly without going through FormField, per
// docs/design-system-architecture.md's component table. FormField itself
// keeps its existing all-in-one API for every current call site (M5.1 does
// not touch pages) but is refactored in place to render this component
// internally — see FormField.tsx.
//
// `forwardRef` per docs/design-system-architecture.md's accessibility
// requirements — needed for form-error scroll-to-field focus management.
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, "aria-invalid": ariaInvalid, ...rest },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={ariaInvalid ?? (invalid ? true : undefined)}
      className={cn(fieldControlBaseClasses, fieldControlBorderClasses(invalid), className)}
      {...rest}
    />
  );
});
