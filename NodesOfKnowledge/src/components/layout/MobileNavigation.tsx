"use client";

import { Menu } from "lucide-react";
import { useState } from "react";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { NavLink } from "@/components/layout/NavLink";
import { REVIEW_NAV_ITEM } from "@/components/layout/reviewNavItem";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/Drawer";
import { getNavItemsByGroup } from "@/lib/navigation/select";

export interface MobileNavigationProps {
  audience: "public" | "protected";
  /** Signed-in email, shown above Log out. Only meaningful when audience is "protected". */
  email?: string;
  /**
   * Whether the signed-in account is an authorized reviewer, per
   * src/features/review/authorization.ts's am_i_a_reviewer() read. Only
   * meaningful when audience is "protected". Deliberately not part of
   * navigationConfig (like `email`, this is account-specific, not a
   * fixed destination) -- and, per the milestone's explicit "do not rely
   * on hiding navigation as the authorization boundary" requirement, this
   * only controls whether the link *renders*; every /review route and
   * database function re-checks reviewer authorization independently.
   */
  isReviewer?: boolean;
}

// Below the `md` breakpoint (docs/design-system-architecture.md,
// "Breakpoints" — the navigation-collapse point), both shells' link sets
// move here — a Drawer, per docs/application-information-architecture.md's
// "Mobile navigation" ("a full-height drawer or slide-down panel — exact
// treatment is a component-implementation decision, not an architectural
// one"). Reads navigationConfig through the exact same `getNavItemsByGroup`
// selector and the exact same `NavLink` rendering rule the desktop headers
// use — same data, same active-state logic, only the container markup
// differs, per the "desktop and mobile rendering from the same source"
// requirement. The trigger is a real, labeled control (`aria-label`, plus
// Radix's own `aria-expanded`/`aria-controls`/`aria-haspopup` on
// `DrawerTrigger`) — never an unlabeled icon-only hamburger.
//
// Every "protected-primary" entry in navigationConfig is also tagged
// "user-menu" today (see config.ts), so the single list below already
// satisfies "every link reachable in desktop primary navigation and the
// user menu is also reachable via MobileNavigation" without a second,
// separately-rendered list. If a future entry is ever user-menu-only (not
// also protected-primary), union it into `items` here rather than
// duplicating this component's rendering logic.
export function MobileNavigation({ audience, email, isReviewer }: MobileNavigationProps) {
  const [open, setOpen] = useState(false);

  const items = getNavItemsByGroup(audience === "public" ? "public-primary" : "protected-primary");
  const allItems = audience === "protected" && isReviewer ? [...items, REVIEW_NAV_ITEM] : items;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger
        aria-label="Open menu"
        className="inline-flex items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus md:hidden"
      >
        <Menu aria-hidden="true" className="size-5" />
      </DrawerTrigger>

      <DrawerContent side="right">
        <DrawerTitle>Menu</DrawerTitle>

        <nav aria-label="Primary" className="mt-6 flex flex-col gap-1">
          {allItems.map((item) => (
            <NavLink
              key={item.id}
              item={item}
              onNavigate={() => setOpen(false)}
              className="rounded-md px-2 py-2 text-sm text-foreground hover:bg-surface"
              activeClassName="bg-surface font-medium"
            />
          ))}
        </nav>

        {audience === "protected" ? (
          <div className="mt-6 border-t border-border-default pt-4">
            {email ? <p className="px-2 pb-2 text-xs text-muted-foreground">{email}</p> : null}
            <LogoutButton
              onClick={() => setOpen(false)}
              className="block w-full rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-surface"
            />
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
