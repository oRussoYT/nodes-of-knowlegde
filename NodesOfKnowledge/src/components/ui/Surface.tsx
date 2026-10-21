import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

const LEVELS = {
  base: "bg-background",
  surface: "bg-surface",
  raised: "bg-surface-raised",
  sunken: "bg-surface-sunken",
} as const;

const ELEVATIONS = {
  none: "shadow-none",
  sm: "shadow-sm",
  lg: "shadow-lg",
} as const;

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  /** Which surface-hierarchy layer this element occupies. */
  level?: keyof typeof LEVELS;
  elevation?: keyof typeof ELEVATIONS;
  bordered?: boolean;
  rounded?: boolean;
  as?: ElementType;
  children?: ReactNode;
}

// The generic building block underneath Card/Dialog/Drawer/Dropdown
// surfaces — expresses Nodes BDFFP's surface hierarchy (background < surface <
// raised, plus a sunken variant for insets) as a single, reusable
// primitive, rather than each higher-level component picking its own
// background token ad hoc. Server Component: no interactivity.
export function Surface({
  level = "surface",
  elevation = "none",
  bordered = false,
  rounded = false,
  as: Component = "div",
  className,
  children,
  ...rest
}: SurfaceProps) {
  return (
    <Component
      className={cn(
        LEVELS[level],
        ELEVATIONS[elevation],
        bordered && "border border-border-default",
        rounded && "rounded-md",
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
