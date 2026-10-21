import type { NavItem } from "@/lib/navigation/types";

// The one place the "Claim review" nav entry is defined, reused by both
// ProtectedHeader and MobileNavigation so the label/href/match rule can't
// drift between desktop and mobile. Deliberately not added to
// navigationConfig (src/lib/navigation/config.ts): that config is a
// static, request-independent list, but whether this entry should render
// at all depends on a per-request, server-verified reviewer check
// (src/features/review/authorization.ts) -- the same category of
// "account-specific, not a fixed destination" reasoning navigationConfig
// already documents for why signed-in email/Log out don't live there
// either. ProtectedHeader/MobileNavigation render this NavItem
// conditionally, via NavLink (the same rendering rule every other nav
// entry uses), only when the `isReviewer` prop they're passed is true --
// that prop itself is not the authorization boundary (see its own doc
// comment on MobileNavigationProps), only a UI-visibility signal.
export const REVIEW_NAV_ITEM: NavItem = {
  id: "review-claims",
  label: "Claim review",
  href: "/review/claims",
  matchPaths: ["/review"],
  groups: ["protected-primary"],
  availability: { status: "available" },
};
