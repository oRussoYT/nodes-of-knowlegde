import type { HTMLAttributes } from "react";

import { cn } from "@/lib/ui/cn";

export type FieldErrorProps = HTMLAttributes<HTMLParagraphElement>;

// Extracted from FormField's inline error markup — see Label.tsx for why.
// `role="alert"` matches FormField's existing, established convention
// (extends to every new form component per
// docs/design-system-architecture.md's accessibility requirements). Callers
// are responsible for wiring the `id` this element needs to be referenced
// by a field's `aria-describedby`. Server Component.
export function FieldError({ className, ...rest }: FieldErrorProps) {
  return <p role="alert" className={cn("text-sm text-destructive", className)} {...rest} />;
}
