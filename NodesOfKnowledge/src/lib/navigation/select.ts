// Selectors over navigationConfig. Kept here rather than inline in
// components so PublicHeader/ProtectedHeader/MobileNavigation each do
// `getNavItemsByGroup("...")` instead of writing their own `.filter(...)` —
// one definition of "what belongs to this group" per CLAUDE.md's "no
// business logic in src/components" rule.

import { navigationConfig } from "./config";
import type { NavGroup, NavItem } from "./types";

/**
 * Every top-level entry tagged with `group`, in config order. Does not
 * recurse into `children` — a child's placement is scoped by its parent,
 * not by an independent group membership, so children are returned intact
 * on any matching parent rather than filtered separately.
 */
export function getNavItemsByGroup(
  group: NavGroup,
  items: readonly NavItem[] = navigationConfig,
): NavItem[] {
  return items.filter((item) => item.groups.includes(group));
}
