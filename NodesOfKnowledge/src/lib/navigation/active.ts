// Pure active-state matching, deliberately independent of any Next.js
// hook so it's directly unit-testable (see tests/unit/navigation-active.test.ts)
// and reusable from a client component via `usePathname()` without coupling
// the logic itself to that hook — the same "pure decision, thin adapter"
// split used by src/lib/auth/route-protection.ts.

import type { NavItem } from "./types";

/**
 * Whether `item` should be shown as active for the given `pathname`.
 * `planned` items are never active (they have no real destination to match
 * against). Matching checks `href` and every entry in `matchPaths`; each
 * candidate matches either exactly, or — unless `exactMatch` is set — as a
 * path-segment prefix (`/account` also matches `/account/security`, but not
 * `/accounting`).
 */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.availability.status !== "available" || !item.href) {
    return false;
  }

  const candidates = [item.href, ...(item.matchPaths ?? [])];

  return candidates.some((path) => {
    if (pathname === path) return true;
    if (item.exactMatch) return false;
    return pathname.startsWith(path.endsWith("/") ? path : `${path}/`);
  });
}
