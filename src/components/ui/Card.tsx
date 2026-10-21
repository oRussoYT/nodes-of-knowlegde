import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/ui/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  children?: ReactNode;
}

// Formalizes the ad hoc bordered box already used on `/`, `/member`, and
// `/account` (`rounded-md border border-neutral-200 bg-neutral-50 ...`,
// repeated by hand in three places today) into one token-driven primitive.
// Server Component: no interactivity.
export function Card({ padded = true, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-border-default bg-surface text-foreground",
        padded && "px-4 py-3",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
