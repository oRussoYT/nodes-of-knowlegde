import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

const GAPS = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-10",
} as const;

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** `column` (default) or `row`. */
  direction?: "column" | "row";
  gap?: keyof typeof GAPS;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between";
  wrap?: boolean;
  as?: ElementType;
  children?: ReactNode;
}

const ALIGN = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
} as const;

const JUSTIFY = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
} as const;

// Generic flex-layout primitive — replaces ad hoc `flex flex-col gap-*` /
// `flex items-center gap-*` combinations repeated across M4's components
// (FormField, PublicHeader, ProtectedNav all hand-roll this today). Server
// Component: no interactivity.
export function Stack({
  direction = "column",
  gap = "md",
  align,
  justify,
  wrap = false,
  as: Component = "div",
  className,
  children,
  ...rest
}: StackProps) {
  return (
    <Component
      className={cn(
        "flex",
        direction === "row" ? "flex-row" : "flex-col",
        GAPS[gap],
        align && ALIGN[align],
        justify && JUSTIFY[justify],
        wrap && "flex-wrap",
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}
