"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

// Built on Radix's Dialog primitive, presented as a side-anchored variant —
// per docs/decisions/0003-...md: "Drawer (built on Radix's Dialog
// primitive, presented as a side-anchored variant)". Powers
// `MobileNavigation` (docs/design-system-architecture.md's component
// table) — not wired to any real navigation yet, since shells are M5.2
// scope. Same focus-trap/Escape/portal/ARIA behavior as Dialog, same
// no-animation-library CSS-transition approach (ADR-0005).

export const Drawer = DialogPrimitive.Root;
export const DrawerTrigger = DialogPrimitive.Trigger;
export const DrawerClose = DialogPrimitive.Close;
export const DrawerPortal = DialogPrimitive.Portal;

const DrawerOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-(--z-drawer) bg-overlay",
      "opacity-0 transition-opacity duration-(--duration-base) ease-(--ease-standard)",
      "data-[state=open]:opacity-100",
      className
    )}
    {...props}
  />
));
DrawerOverlay.displayName = "DrawerOverlay";

const SIDE_CLASSES = {
  right: "right-0 top-0 h-full w-full max-w-xs border-l translate-x-full data-[state=open]:translate-x-0",
  left: "left-0 top-0 h-full w-full max-w-xs border-r -translate-x-full data-[state=open]:translate-x-0",
  top: "top-0 left-0 w-full max-h-[80vh] border-b -translate-y-full data-[state=open]:translate-y-0",
  bottom: "bottom-0 left-0 w-full max-h-[80vh] border-t translate-y-full data-[state=open]:translate-y-0",
} as const;

export interface DrawerContentProps extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  side?: keyof typeof SIDE_CLASSES;
  showCloseButton?: boolean;
}

const DrawerContent = forwardRef<ElementRef<typeof DialogPrimitive.Content>, DrawerContentProps>(
  ({ className, children, side = "right", showCloseButton = true, ...props }, ref) => (
    <DrawerPortal>
      <DrawerOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed z-(--z-drawer) border-border-default bg-surface-raised p-6 shadow-lg",
          "transition-transform duration-(--duration-slow) ease-(--ease-standard)",
          "focus:outline-none",
          SIDE_CLASSES[side],
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
    </DrawerPortal>
  )
);
DrawerContent.displayName = "DrawerContent";

const DrawerTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title ref={ref} className={cn("text-lg font-semibold text-foreground", className)} {...props} />
));
DrawerTitle.displayName = "DrawerTitle";

const DrawerDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("mt-1 text-sm text-muted-foreground", className)} {...props} />
));
DrawerDescription.displayName = "DrawerDescription";

export { DrawerContent, DrawerDescription, DrawerOverlay, DrawerTitle };
