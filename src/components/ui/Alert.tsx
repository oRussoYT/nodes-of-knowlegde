import type { ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

export type AlertTone = "neutral" | "success" | "warning" | "danger" | "info";

const TONE_CLASSES: Record<AlertTone, string> = {
  neutral: "border-tone-neutral-border bg-tone-neutral-bg text-tone-neutral-fg",
  success: "border-tone-success-border bg-tone-success-bg text-tone-success-fg",
  warning: "border-tone-warning-border bg-tone-warning-bg text-tone-warning-fg",
  danger: "border-tone-danger-border bg-tone-danger-bg text-tone-danger-fg",
  info: "border-tone-info-border bg-tone-info-bg text-tone-info-fg",
};

const ROLE_BY_TONE: Record<AlertTone, "alert" | "status"> = {
  neutral: "status",
  success: "status",
  warning: "status",
  danger: "alert",
  info: "status",
};

export interface AlertProps {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
}

// Page-level variant of FormMessage — for non-form banners (confirmation
// notices, expired-session notices, etc.), per
// docs/design-system-architecture.md's component table. Extends the tone
// set FormMessage already established (error/success/info) with
// warning/neutral, per that same table's "Component variants". Server
// Component: no interactivity. `role="alert"` only for `danger`, matching
// FormMessage's existing convention — everything else is `role="status"`
// (announced, not urgent/interrupting).
export function Alert({ tone = "neutral", title, children, className }: AlertProps) {
  return (
    <div role={ROLE_BY_TONE[tone]} className={cn("rounded-md border px-4 py-3 text-sm", TONE_CLASSES[tone], className)}>
      {title ? <p className="font-medium">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
    </div>
  );
}
