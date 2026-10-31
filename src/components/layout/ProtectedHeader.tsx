import Link from "next/link";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { NavLink } from "@/components/layout/NavLink";
import { REVIEW_NAV_ITEM } from "@/components/layout/reviewNavItem";
import { NAV_SECTIONS } from "@/lib/navigation/types";
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
  /** The member's chosen name (their profile), shown instead of the email. */
  displayName?: string | null;
  /** Short-lived link to the member's profile photo, if they added one. */
  photoUrl?: string | null;
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
export function ProtectedHeader({ email, displayName, photoUrl, isReviewer }: ProtectedHeaderProps) {
  const name = displayName ?? email;
  const primaryItems = getNavItemsByGroup("protected-primary");
  const menuLinkItems = getNavItemsByGroup("user-menu").filter(
    (item) => item.availability.status === "available" && item.href,
  );

  return (
    // Sidebar on md+ (fixed, full height); a slim bar on phones, where
    // MobileNavigation's drawer carries the links. It follows the theme:
    // near-white in light mode, ink in dark mode, lime for the current page.
    <header className="nk-app-chrome z-40 border-b border-border-default text-foreground md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col md:border-r md:border-b-0">
      <div className="flex items-center justify-between gap-3 px-5 py-4 md:py-6">
        <Link href="/member" className="font-display text-xl font-extrabold tracking-tight [font-stretch:118%]">
          {SITE_NAME}
        </Link>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <MobileNavigation audience="protected" email={email} isReviewer={isReviewer} />
        </div>
      </div>

      <nav aria-label="Primary" className="hidden flex-col gap-1 overflow-y-auto px-3 pb-4 text-[15px] md:flex">
        {NAV_SECTIONS.map((section) => {
          const items = [...primaryItems, ...(isReviewer ? [REVIEW_NAV_ITEM] : [])].filter((item) => (item.section ?? "You") === section);
          if (items.length === 0) return null;
          return (
            <div key={section} className="flex flex-col gap-1 pt-3 first:pt-0">
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{section}</p>
              {items.map((item) => (
                <NavLink key={item.id} item={item} className="nk-side-link" />
              ))}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto hidden items-center justify-between gap-3 border-t border-border-default px-5 py-4 md:flex">
        <Dropdown>
          <DropdownTrigger
            aria-label={`Account menu for ${email}`}
            className="flex min-w-0 items-center gap-2.5 rounded-full text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link to a private photo
              <img src={photoUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
            ) : (
              <Avatar name={name} size="md" />
            )}
            <span className="min-w-0">
              <span className="block truncate font-medium text-foreground">{displayName ?? "Your account"}</span>
              {displayName ? <span className="block truncate text-xs text-muted-foreground">Your account</span> : null}
            </span>
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
