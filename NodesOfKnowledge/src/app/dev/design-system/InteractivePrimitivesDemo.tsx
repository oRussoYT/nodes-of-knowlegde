"use client";

import { Button } from "@/components/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle, DrawerTrigger } from "@/components/ui/Drawer";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/Dropdown";
import { Stack } from "@/components/ui/Stack";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/Tooltip";

// Internal-only: exercises the Radix-backed primitives end to end (real
// open/close state, focus trap, Escape handling) since no real page wires
// any of them in yet — shells and pages are M5.2 scope. Client Component:
// every primitive composed here is itself interactive.
export function InteractivePrimitivesDemo() {
  return (
    <Stack direction="row" gap="md" wrap>
      <Dialog>
        <DialogTrigger asChild>
          <Button emphasis="secondary">Open Dialog</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Example dialog</DialogTitle>
          <DialogDescription>Focus-trapped, Escape closes, focus returns to the trigger.</DialogDescription>
          <div className="mt-4 flex justify-end gap-2">
            <DialogClose asChild>
              <Button emphasis="ghost">Cancel</Button>
            </DialogClose>
            <DialogClose asChild>
              <Button emphasis="primary">Confirm</Button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>

      <Drawer>
        <DrawerTrigger asChild>
          <Button emphasis="secondary">Open Drawer</Button>
        </DrawerTrigger>
        <DrawerContent side="right">
          <DrawerTitle>Example drawer</DrawerTitle>
          <DrawerDescription>Side-anchored variant of the same Dialog primitive (ADR-0003).</DrawerDescription>
          <div className="mt-4">
            <DrawerClose asChild>
              <Button emphasis="ghost">Close</Button>
            </DrawerClose>
          </div>
        </DrawerContent>
      </Drawer>

      <Dropdown>
        <DropdownTrigger asChild>
          <Button emphasis="secondary">Open Dropdown</Button>
        </DropdownTrigger>
        <DropdownContent align="start">
          <DropdownLabel>dev@netpdbff.example</DropdownLabel>
          <DropdownSeparator />
          <DropdownItem>Member</DropdownItem>
          <DropdownItem>Account</DropdownItem>
          <DropdownSeparator />
          <DropdownItem>Log out</DropdownItem>
        </DropdownContent>
      </Dropdown>

      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button emphasis="secondary">Hover for tooltip</Button>
          </TooltipTrigger>
          <TooltipContent>Approximate date, provenance disclosure, etc.</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="w-full max-w-xs">
        <Tabs defaultValue="one">
          <TabsList>
            <TabsTrigger value="one">One</TabsTrigger>
            <TabsTrigger value="two">Two</TabsTrigger>
          </TabsList>
          <TabsContent value="one">Panel one — arrow-key roving tabindex between triggers.</TabsContent>
          <TabsContent value="two">Panel two.</TabsContent>
        </Tabs>
      </div>
    </Stack>
  );
}
