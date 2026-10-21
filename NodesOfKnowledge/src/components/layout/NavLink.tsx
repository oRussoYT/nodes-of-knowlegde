"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { FutureAction } from "@/components/ui/FutureAction";
import { isNavItemActive } from "@/lib/navigation/active";
import type { NavItem } from "@/lib/navigation/types";
import { cn } from "@/lib/ui/cn";

// The single place that renders one NavItem, consistently, everywhere a
// NavItem is rendered — PublicHeader's primary nav, ProtectedHeader's
// primary nav and user menu, and MobileNavigation. Per the M5.2 navigation
// requirement ("do not duplicate navigation definitions across headers,
// sidebars, or mobile menus"), the thing that must not be duplicated is
// both the *data* (navigationConfig, read once) and the *rendering rule*
// for what an entry looks like in each of its two states — this component
// is that rule.
//
// Client Component: active-state highlighting needs the current pathname
// (`usePathname()`), which is not available to a Server Component without
// forcing the route dynamic — unacceptable for PublicHeader, which must
// stay statically renderable per ADR-0006. Keeping that requirement
// entirely inside this small leaf, rather than in PublicHeader/AppShell
// themselves, is what lets the header components stay Server Components.
//
// Planned (not-yet-built) entries never render as a functional link — see
// docs/application-information-architecture.md's "no dead links" rule and
// NavItem's `availability` field. Rendered via the shared `FutureAction`
// primitive (src/components/ui/FutureAction.tsx) — also used on
// `/member`/`/account` — so nav and page content share one "coming later"
// visual vocabulary instead of two.
export interface NavLinkProps {
  item: NavItem;
  className?: string;
  /** Applied in addition to `className` when this item matches the current pathname. */
  activeClassName?: string;
  /** Called after a successful navigation click — e.g. MobileNavigation closing its drawer. */
  onNavigate?: () => void;
}

export function NavLink({ item, className, activeClassName, onNavigate }: NavLinkProps) {
  const pathname = usePathname();

  if (item.availability.status === "planned") {
    return <FutureAction label={item.label} reason={item.availability.reason} className={className} />;
  }

  const active = isNavItemActive(pathname, item);

  return (
    <Link
      href={item.href ?? "#"}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(className, active && activeClassName)}
    >
      {item.label}
    </Link>
  );
}
