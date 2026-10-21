import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

const SPACING = {
  sm: "py-8",
  md: "py-12",
  lg: "py-16",
  xl: "py-24",
} as const;

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  /** Vertical rhythm around the section boundary. Generous by default —
   * docs/ui-vision.md's "Information density": low density in framing
   * chrome/section boundaries, even where content inside is dense. */
  spacing?: keyof typeof SPACING;
  as?: ElementType;
  children?: ReactNode;
}

// Generic page-section primitive — a labeled unit of vertical rhythm, not a
// visual style. Formalizes the `py-16`/`py-24` spacing already used ad hoc
// on `/` and the auth pages. Server Component: no interactivity.
export function Section({ spacing = "md", as: Component = "section", className, children, ...rest }: SectionProps) {
  return (
    <Component className={cn(SPACING[spacing], className)} {...rest}>
      {children}
    </Component>
  );
}
