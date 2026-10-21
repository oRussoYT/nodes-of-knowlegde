import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

const WIDTHS = {
  form: "max-w-(--container-form)",
  shell: "max-w-(--container-shell)",
  content: "max-w-(--container-content)",
  full: "max-w-none",
} as const;

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Named, purpose-based max-width — never an ad hoc value per page. See
   * docs/design-system-architecture.md, "Responsive behavior". */
  width?: keyof typeof WIDTHS;
  /** Horizontal edge padding. Defaults to the existing M4 `px-6` convention. */
  padded?: boolean;
  as?: ElementType;
  children?: ReactNode;
}

// Generic, domain-neutral layout primitive — centers content at a named
// purpose-width. Formalizes the ad hoc `mx-auto max-w-*` pattern already
// repeated on every M4 page (`/`, `/member`, `/account`, header). Server
// Component: no interactivity.
export function Container({
  width = "content",
  padded = true,
  as: Component = "div",
  className,
  children,
  ...rest
}: ContainerProps) {
  return (
    <Component
      className={cn("mx-auto w-full", WIDTHS[width], padded && "px-6", className)}
      {...rest}
    >
      {children}
    </Component>
  );
}
