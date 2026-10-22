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
import { SITE_NAME } from "@/config/site";
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
    // Ink sidebar on md+ (fixed, full height); a slim ink bar on phones,
    // where MobileNavigation's drawer carries the links. data-theme="dark"
    // scopes the dark tokens to this chrome in either theme.
    <header
      data-theme="dark"
      className="z-40 bg-nk-ink text-nk-bone md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-r md:border-nk-ink-3"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 md:py-6">
        <Link href="/member" className="font-display text-xl font-extrabold tracking-tight [font-stretch:118%]">
          {SITE_NAME}
        </Link>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <MobileNavigation audience="protected" email={email} isReviewer={isReviewer} />
        </div>
      </div>

      <nav aria-label="Primary" className="hidden flex-col gap-1 px-3 text-[15px] md:flex">
        {primaryItems.map((item) => (
          <NavLink key={item.id} item={item} className="nk-side-link" />
        ))}
        {isReviewer ? <NavLink item={REVIEW_NAV_ITEM} className="nk-side-link" /> : null}
      </nav>

      <div className="mt-auto hidden items-center justify-between gap-3 border-t border-nk-ink-3 px-5 py-4 md:flex">
        <Dropdown>
          <DropdownTrigger
            aria-label={`Account menu for ${email}`}
            className="flex min-w-0 items-center gap-2.5 rounded-full text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nk-lime"
          >
            <Avatar name={email} size="sm" />
            <span className="truncate text-[#c3c8b6]">{email}</span>
          </DropdownTrigger>

          <DropdownContent align="start">
            <DropdownLabel>{email}</DropdownLabel>
            <DropdownSeparator />
            {menuLinkItems.map((item) => (
              <DropdownItem key={item.id} asChild>
                <Link href={item.href!}>{item.label}</Link>
              </DropdownItem>
            ))}
            <DropdownSeparator />
            {/* LogoutButton is a Server Component (a Server Action form), so it
                sits beside the Radix items rather than inside one. */}
            <div className="px-1 py-0.5">
              <LogoutButton className="block w-full rounded-sm px-2 py-1.5 text-left text-foreground transition-colors hover:bg-surface" />
            </div>
          </DropdownContent>
        </Dropdown>
        <ThemeToggle />
      </div>
    </header>
  );
}
