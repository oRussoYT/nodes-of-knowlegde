// The single source of navigation entries — see types.ts for the shape and
// full reasoning. PublicHeader, ProtectedHeader, the user menu, and
// MobileNavigation all read from `navigationConfig` (via the selectors in
// select.ts); none of them declares a competing list of links.
//
// Only entries that are true today are marked `available`. `planned`
// entries are reserved slots for routes named as future work in
// docs/application-information-architecture.md — adding them here does not
// implement those routes (no page exists at their would-be href), it only
// lets the nav communicate "this exists in the product's structure" without
// ever rendering a functional link to a page that 404s. See NavLink for how
// `planned` renders.
//
// M7 refinement (ADR-0017): the Knowledge Network is internal historical
// INFRASTRUCTURE, not a destination. It deliberately has NO primary-navigation
// entry — a reader never "enters the Network". Documented connections are read
// inline on the canonical People / Institutions / Contributions pages
// (institutional lineage now reads on the Institution page); the network read
// models simply enrich that reading.

import type { NavItem } from "./types";

export const navigationConfig: NavItem[] = [
  {
    id: "login",
    label: "Log in",
    href: "/login",
    groups: ["public-primary"],
    availability: { status: "available" },
  },
  {
    id: "register",
    label: "Register",
    href: "/register",
    groups: ["public-primary"],
    availability: { status: "available" },
  },
  {
    id: "about",
    label: "About",
    groups: ["public-primary"],
    availability: {
      status: "planned",
      reason:
        "Route not yet built — reserved per docs/application-information-architecture.md's public application structure table.",
    },
  },
  {
    id: "explore",
    label: "Explore",
    href: "/explore",
    groups: ["protected-primary"],
    availability: { status: "available" },
  },
  {
    id: "people",
    label: "People",
    href: "/people",
    groups: ["protected-primary"],
    availability: { status: "available" },
  },
  {
    id: "institutions",
    label: "Institutions",
    href: "/institutions",
    groups: ["protected-primary"],
    availability: { status: "available" },
  },
  {
    id: "contributions",
    label: "Contributions",
    href: "/contributions",
    groups: ["protected-primary"],
    availability: { status: "available" },
  },
  {
    id: "member",
    label: "Member",
    href: "/member",
    groups: ["protected-primary", "user-menu"],
    availability: { status: "available" },
  },
  {
    id: "account",
    label: "Account",
    href: "/account",
    groups: ["protected-primary", "user-menu"],
    availability: { status: "available" },
  },
  {
    id: "profile",
    label: "Profile",
    groups: ["protected-primary"],
    availability: {
      status: "planned",
      reason:
        "Person-record view not yet built — reserved per docs/application-information-architecture.md's 'Future member structure' and the IA doc's primary-navigation section, which names this exact future entry point.",
    },
  },
];
