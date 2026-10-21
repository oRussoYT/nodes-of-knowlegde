"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

// Headless-backed (ADR-0003) — Radix supplies arrow-key item navigation,
// type-ahead, and correct ARIA `menu`/`menuitem` roles. Powers the user
// menu in ProtectedHeader (M5.2 — see src/components/layout/ProtectedHeader.tsx),
// replacing the old ProtectedNav's inline "email · Log out" text, per
// docs/application-information-architecture.md's "User menu" section.
// Client Component throughout.

export const Dropdown = DropdownMenuPrimitive.Root;
export const DropdownTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownGroup = DropdownMenuPrimitive.Group;

const DropdownContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-(--z-dropdown) min-w-40 rounded-md border border-border-default bg-surface-raised p-1 text-sm text-foreground shadow-lg",
        "opacity-0 scale-95 transition-[opacity,transform] duration-(--duration-fast) ease-(--ease-standard)",
        "data-[state=open]:scale-100 data-[state=open]:opacity-100",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownContent.displayName = "DropdownContent";

const DropdownItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "cursor-pointer rounded-sm px-2 py-1.5 outline-none transition-colors",
      "focus:bg-surface data-[highlighted]:bg-surface",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-(--opacity-disabled)",
      className
    )}
    {...props}
  />
));
DropdownItem.displayName = "DropdownItem";

const DropdownLabel = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-xs font-medium text-muted-foreground", className)}
    {...props}
  />
));
DropdownLabel.displayName = "DropdownLabel";

const DropdownSeparator = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator ref={ref} className={cn("my-1 h-px bg-border-default", className)} {...props} />
));
DropdownSeparator.displayName = "DropdownSeparator";

export { DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator };
