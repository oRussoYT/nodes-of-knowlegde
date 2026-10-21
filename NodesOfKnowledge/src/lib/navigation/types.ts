// Single typed source for every navigation entry rendered anywhere in the
// application chrome (PublicHeader, ProtectedHeader, the user menu,
// MobileNavigation). Per docs/application-information-architecture.md and
// the M5.2 navigation-architecture requirement: hierarchical, extensible to
// "dozens of future modules" without redesign, permission-ready (but not
// permission-*enforcing* — no authorization system exists yet, see
// docs/application-information-architecture.md's "Future administration
// structure"), search-ready, and rendered identically on desktop and mobile
// from this one definition. Headers/menus/drawers read this data; they
// never hand-write a competing `<Link>` for a navigable destination.
//
// What deliberately does NOT live here: actions without a destination (e.g.
// `LogoutButton`'s Server-Action-backed form submit) and identity display
// (e.g. the signed-in email shown in the user menu). Those aren't
// navigation — forcing them into this shape would add unrelated optional
// fields (an `action` vs `href` branch) to a config whose whole value is
// staying narrowly about "things with a destination."

import type { ComponentType, SVGProps } from "react";

/**
 * Where in the application chrome an entry can render. An entry may belong
 * to more than one group at once — e.g. "Member" appears in both the
 * always-visible protected primary nav and the user menu — which is how one
 * typed definition serves multiple surfaces instead of being duplicated per
 * surface. Extending this union (e.g. adding `"admin-primary"` once an
 * admin shell exists — see ADR-0006's "third shell variant" note) is the
 * mechanism for supporting new chrome surfaces without reshaping NavItem.
 */
export type NavGroup = "public-primary" | "protected-primary" | "user-menu";

/**
 * Whether an entry is something a visitor can actually navigate to today.
 * `"planned"` entries render — communicating that the destination exists in
 * the product's structure, per the IA doc's "reserve the nav slot" language
 * for `/about` and the future `Profile` entry — but are never rendered as a
 * functional link (see NavLink). This is the whole mechanism for "dozens of
 * future modules without redesign": declare the entry now with `"planned"`,
 * flip it to `"available"` once the route is real. Nothing about the config
 * shape or the components that read it needs to change either time.
 */
export type NavAvailability =
  | { status: "available" }
  | { status: "planned"; reason?: string };

/**
 * Placeholder shape for future authorization gating. Nothing in M5.2 reads
 * or enforces this field — no role/permission system exists yet. It exists
 * so a later milestone can filter navigationConfig by permission with a new
 * selector, without changing NavItem's shape or touching every entry that
 * already exists by then. Do not implement enforcement against this field
 * as part of M5.2.
 */
export interface NavPermission {
  /** Opaque requirement identifiers — meaningless until a real authorization model exists. */
  requires?: string[];
}

export interface NavItem {
  /**
   * Stable, unique key. Used for React list keys, active-state tracking,
   * and test selectors — never derived from `label`, since labels may
   * change independently of identity.
   */
  id: string;
  label: string;
  /** Absent for placeholder entries with nothing to link to yet (see `availability`). */
  href?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  groups: NavGroup[];
  availability: NavAvailability;
  /** See `NavPermission` — unused until a real authorization system exists. */
  permission?: NavPermission;
  /** Extra path prefixes that should also mark this item active, beyond `href` itself. */
  matchPaths?: string[];
  /** Require exact pathname equality rather than the default prefix match. */
  exactMatch?: boolean;
  /**
   * Terms a future search/command-palette feature could match against,
   * beyond `label`. Unused by any renderer in M5.2 — present so that
   * feature doesn't require touching every existing entry when it's built.
   */
  keywords?: string[];
  /** Short description — unused visually in M5.2, present for the same forward-compatibility reason as `keywords`. */
  description?: string;
  /**
   * Hierarchical nesting — supports grouping dozens of future modules under
   * a parent without flattening the config or redesigning consumers. No
   * M5.2 entry uses this yet, but every renderer must handle it existing.
   */
  children?: NavItem[];
}
