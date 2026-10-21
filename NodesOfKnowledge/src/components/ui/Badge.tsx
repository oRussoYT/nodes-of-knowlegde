import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";
export type BadgeSize = "sm" | "md";

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: "bg-tone-neutral-bg text-tone-neutral-fg border-tone-neutral-border",
  success: "bg-tone-success-bg text-tone-success-fg border-tone-success-border",
  warning: "bg-tone-warning-bg text-tone-warning-fg border-tone-warning-border",
  danger: "bg-tone-danger-bg text-tone-danger-fg border-tone-danger-border",
  info: "bg-tone-info-bg text-tone-info-fg border-tone-info-border",
};

const SIZE_CLASSES: Record<BadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-[0.6875rem]",
  md: "px-2 py-0.5 text-xs",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  size?: BadgeSize;
  children?: ReactNode;
}

// Small status label. Needed in M5.1 for generic "coming soon"-style
// labeling; verification-status *use* (docs/design-system-architecture.md's
// `status-*` tokens) is deferred with the data it depends on, but this
// component is the vehicle that will render those tokens once that data
// exists — nothing about its shape needs to change then. Server Component:
// no interactivity. Per docs/ui-vision.md, color is never the sole carrier
// of meaning — Badge always renders a text label, never a bare dot.
export function Badge({ tone = "neutral", size = "md", className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border font-medium",
        TONE_CLASSES[tone],
        SIZE_CLASSES[size],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
