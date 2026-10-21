"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

// Headless-backed compound primitive, per
// docs/decisions/0003-component-primitives-headless-for-complex-interactions.md:
// Radix supplies focus trapping, focus return, portal rendering, `Escape`
// handling, and correct ARIA roles/states; every pixel of visual styling
// below is this project's own Tailwind classes on tokens. No confirmed M5.1
// page use yet (logout-confirmation / destructive-action confirmation is
// the anticipated near-term need per
// docs/design-system-architecture.md's component table) — built now so the
// pattern exists before it's urgently needed. Client Component throughout:
// genuinely interactive, and Radix's primitives are themselves Client
// Components.
//
// No animation library (ADR-0005): enter/exit transitions are plain CSS
// transitions keyed off Radix's own `data-[state]` attribute, which Radix's
// internal Presence component correctly waits for before unmounting — no
// `tailwindcss-animate`-style plugin classes, none installed.

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
export const DialogPortal = DialogPrimitive.Portal;

const DialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-(--z-dialog) bg-overlay",
      "opacity-0 transition-opacity duration-(--duration-base) ease-(--ease-standard)",
      "data-[state=open]:opacity-100",
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

export interface DialogContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  /** Renders a labeled close button (top-right `X`) — every dialog needs an
   * explicit close affordance beyond `Escape`/overlay click, per the
   * accessibility requirements in docs/design-system-architecture.md
   * ("Every icon-only control has an accessible name"). Set `false` only if
   * the caller renders its own close control (e.g. inside custom footer
   * actions). */
  showCloseButton?: boolean;
}

const DialogContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DialogContentProps>(
  ({ className, children, showCloseButton = true, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed top-1/2 left-1/2 z-(--z-dialog) w-full max-w-(--container-form) -translate-x-1/2 -translate-y-1/2",
          "rounded-lg border border-border-default bg-surface-raised p-6 shadow-lg",
          "opacity-0 scale-95 transition-[opacity,transform] duration-(--duration-base) ease-(--ease-standard)",
          "data-[state=open]:scale-100 data-[state=open]:opacity-100",
          "focus:outline-none",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            className={cn(
              "absolute top-4 right-4 rounded-md p-1 text-muted-foreground transition-colors",
              "hover:bg-surface hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus"
            )}
            aria-label="Close"
          >
            <X aria-hidden="true" className="size-4" />
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
);
DialogContent.displayName = "DialogContent";

const DialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
));
DialogTitle.displayName = "DialogTitle";

const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("mt-1 text-sm text-muted-foreground", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export { DialogContent, DialogDescription, DialogOverlay, DialogTitle };
