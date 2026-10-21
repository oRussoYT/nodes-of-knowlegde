"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import type { ComponentPropsWithoutRef, ElementRef } from "react";
import { forwardRef } from "react";

import { cn } from "@/lib/ui/cn";

// Headless-backed (ADR-0003) — Radix supplies arrow-key roving-tabindex
// navigation between triggers and correct ARIA `tablist`/`tab`/`tabpanel`
// roles. Defined for `/account`'s future second page
// (`/account/security`), per docs/application-information-architecture.md's
// "Secondary navigation" — not used by any M5.1 page (shells/pages are
// M5.2 scope). Client Component throughout.

export const Tabs = TabsPrimitive.Root;

const TabsList = forwardRef<ElementRef<typeof TabsPrimitive.List>, ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...props }, ref) => (
    <TabsPrimitive.List
      ref={ref}
      className={cn("flex gap-1 border-b border-border-default", className)}
      {...props}
    />
  )
);
TabsList.displayName = "TabsList";

const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground transition-colors",
      "duration-(--duration-fast) ease-(--ease-standard)",
      "hover:text-foreground",
      "data-[state=active]:border-accent data-[state=active]:text-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus",
      "disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus",
      className
    )}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export { TabsContent, TabsList, TabsTrigger };
