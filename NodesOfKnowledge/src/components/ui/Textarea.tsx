import type { TextareaHTMLAttributes } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

import { fieldControlBaseClasses, fieldControlBorderClasses } from "./field-control-classes";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

// No current M4 use, but trivial and needed for near-future forms
// (docs/design-system-architecture.md's component table). Same visual
// chrome as Input via the shared field-control classes. `forwardRef` per
// the same accessibility requirement as Input.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { invalid, className, rows = 4, "aria-invalid": ariaInvalid, ...rest },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={ariaInvalid ?? (invalid ? true : undefined)}
      className={cn(fieldControlBaseClasses, fieldControlBorderClasses(invalid), "resize-y", className)}
      {...rest}
    />
  );
});
