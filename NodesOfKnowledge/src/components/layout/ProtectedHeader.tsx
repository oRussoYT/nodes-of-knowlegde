import Link from "next/link";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { NavLink } from "@/components/layout/NavLink";
import { REVIEW_NAV_ITEM } from "@/components/layout/reviewNavItem";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/Dropdown";
import { getNavItemsByGroup } from "@/lib/navigation/select";

interface ProtectedHeaderProps {
  email: string;
  /**
   * Whether the signed-in account is an authorized reviewer -- see
   * MobileNavigationProps' matching field for the full reasoning. Purely
   * a rendering signal; /review's own layout and every review database
   * function independently re-verify authorization regardless of this
   * prop's value.
   */
  isReviewer?: boolean;
}

// Generalizes ProtectedNav (M4) per docs/design-system-architecture.md's
// component table. Rendered only from src/app/(protected)/layout.tsx,
// which has already verified the session and fetched the claims this
// component displays — no extra Supabase call happens here, same
// contract ProtectedNav had. Primary links are read from navigationConfig
// via NavLink (see PublicHeader for the identical pattern); the previous
// inline "email · Log out" text is now a real Dropdown user menu, per
// docs/application-information-architecture.md's "User menu" section
// (signed-in email, links to Member and Account, Log out — fully
// keyboard-operable, Escape closes, focus returns to the trigger, all
// supplied by Radix per ADR-0003).
export function ProtectedHeader({ email, isReviewer }: ProtectedHeaderProps) {
  const primaryItems = getNavItemsByGroup("protected-primary");
  const menuLinkItems = getNavItemsByGroup("user-menu").filter(
    (item) => item.availability.status === "available" && item.href,
  );

  return (
    <header className="border-b border-border-default bg-surface">
      <div className="mx-auto flex max-w-(--container-shell) flex-wrap items-center justify-between gap-3 px-6 py-2 text-sm">
        <nav aria-label="Primary" className="hidden flex-wrap items-center gap-4 md:flex">
          {primaryItems.map((item) => (
            <NavLink
              key={item.id}
              item={item}
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeClassName="text-foreground font-medium"
            />
          ))}
          {isReviewer ? (
            <NavLink
              item={REVIEW_NAV_ITEM}
              className="text-muted-foreground transition-colors hover:text-foreground"
              activeClassName="text-foreground font-medium"
            />
          ) : null}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {/* md-and-up only: below `md`, MobileNavigation's single
              disclosure trigger is the sole way to reach Member/Account/
              email/Log out, per docs/application-information-architecture.md's
              "Mobile navigation" ("collapse... into a single disclosure
              trigger"). Without this, the avatar trigger and the hamburger
              trigger would both be live on the same narrow viewport —
              two entry points to the same actions. */}
          <Dropdown>
            <DropdownTrigger
              aria-label={`Account menu for ${email}`}
              className="hidden items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-border-focus md:flex"
            >
              <Avatar name={email} size="sm" />
            </DropdownTrigger>

            <DropdownContent align="end">
              <DropdownLabel>{email}</DropdownLabel>
              <DropdownSeparator />

              {menuLinkItems.map((item) => (
                // Plain Link, not NavLink, inside a Radix DropdownItem: the
                // item's `href`/`label` still come from the same single
                // navigationConfig entry (no duplicated data), but the menu
                // is a momentary, Radix-managed surface that already
                // supplies its own selection/keyboard handling — NavLink's
                // own active-state machinery isn't needed here the way it
                // is in persistent header chrome.
                <DropdownItem key={item.id} asChild>
                  <Link href={item.href!}>{item.label}</Link>
                </DropdownItem>
              ))}

              <DropdownSeparator />

              {/* Intentionally not a DropdownItem: LogoutButton is a Server
                  Component (unchanged Server Action-backed <form>, per the
                  M5 spec's "reused, not rebuilt" requirement). Radix's
                  `asChild` prop-merging clones a live client element — by
                  the time a Server Component's output crosses into this
                  Client Component tree, it's already resolved, opaque
                  markup, not something `cloneElement` can attach
                  role/keyboard props to. It remains a real, Tab-reachable,
                  Enter/Space-activatable <button> with a real accessible
                  name; the one thing it doesn't get is inclusion in Radix's
                  arrow-key roving-tabindex loop alongside the links above. */}
              <div className="px-1 py-0.5">
                <LogoutButton className="block w-full rounded-sm px-2 py-1.5 text-left text-foreground transition-colors hover:bg-surface" />
              </div>
            </DropdownContent>
          </Dropdown>

          <MobileNavigation audience="protected" email={email} isReviewer={isReviewer} />
        </div>
      </div>
    </header>
  );
}
