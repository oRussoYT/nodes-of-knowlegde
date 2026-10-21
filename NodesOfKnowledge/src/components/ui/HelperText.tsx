import type { HTMLAttributes } from "react";

import { cn } from "@/lib/ui/cn";

export type HelperTextProps = HTMLAttributes<HTMLParagraphElement>;

// Extracted from FormField's inline hint markup — see Label.tsx for why.
// Callers are responsible for wiring the `id` this element needs to be
// referenced by a field's `aria-describedby` (FormField does this
// internally; a hand-composed field must do the same). Server Component.
export function HelperText({ className, ...rest }: HelperTextProps) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...rest} />;
}
