"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

// Headless-backed (ADR-0003). Needed for the uncertainty/approximate-date
// disclosure pattern and truncated-name-with-full-text-on-hover, per
// docs/design-system-architecture.md's "Signature Nodes of Knowledge interaction
// principles" and docs/ui-vision.md's multilingual principles — not used by
// any M5.1 page yet (that content doesn't exist until later milestones).
// `TooltipProvider` must wrap the app once, near the root, so every
// `Tooltip` instance shares one `delayDuration` — not done in M5.1 (no
// shell exists yet to add it to); a future page/shell composing `Tooltip`
// must render `TooltipProvider` itself until then. Client Component
// throughout.

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = forwardRef<
  ElementRef<typeof TooltipPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-(--z-tooltip) max-w-64 rounded-md border border-border-default bg-surface-raised px-3 py-1.5 text-xs text-foreground shadow-lg",
        "opacity-0 scale-95 transition-[opacity,transform] duration-(--duration-fast) ease-(--ease-standard)",
        "data-[state=delayed-open]:scale-100 data-[state=delayed-open]:opacity-100",
        className
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";

export { TooltipContent };
