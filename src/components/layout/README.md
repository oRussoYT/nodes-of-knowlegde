# src/components/layout

Structural, page-shell components shared across routes. Presentational
only — no data-fetching or business logic beyond what a Server Component
layout hands down as props (see `CLAUDE.md`).

## Navigation data

Every navigable entry (label, href, icon, group, availability, active-state
matching, and forward-compatible search/permission metadata) is defined
exactly once, in `src/lib/navigation/config.ts` — see that file and
`src/lib/navigation/types.ts` for the full shape and reasoning. No component
below hand-writes a competing link list; they all read `navigationConfig`
through `src/lib/navigation/select.ts`'s `getNavItemsByGroup()` and render
each entry through `NavLink.tsx`. This is what lets `PublicHeader`,
`ProtectedHeader`, and `MobileNavigation` all stay in sync from a single
source, and lets a future module be added or hidden by editing one config
entry rather than several components.

## Components (M5.2)

| Component | Notes |
|---|---|
| `AppShell` | The outer frame: header slot + content. Does not render `<main>` — every page already owns its own `<main>`; see the file comment for why. Takes its header as a prop rather than deciding the variant itself — per ADR-0006, that choice belongs to the routing layer (`src/app/(public)/layout.tsx` vs `src/app/(protected)/layout.tsx`), not a session check inside a shared component. |
| `PublicHeader` | Fully static (no `cookies()`/Supabase call), rendered by `src/app/(public)/layout.tsx` for `/`, `/login`, `/register`, `/forgot-password`, `/auth/error`, `/auth/confirm`. Renders the `public-primary` nav group plus the real `ThemeToggle` and a `MobileNavigation` trigger. |
| `ProtectedHeader` | Generalizes the old `ProtectedNav` (removed in M5.2). Rendered by `src/app/(protected)/layout.tsx`, which independently re-verifies the session and passes down `email` — no extra Supabase call here. Renders the `protected-primary` nav group plus a `Dropdown`+`Avatar` user menu (email, Member, Account, Log out) per `docs/application-information-architecture.md`'s "User menu". |
| `NavLink` | The one place a single `NavItem` gets rendered: a real link when `available`, a shared `FutureAction` (see `src/components/ui/README.md`) when `planned` (never a dead link). Client Component — active-state highlighting needs `usePathname()`, kept in this small leaf so `PublicHeader`/`AppShell` can stay Server Components and public routes stay statically renderable. |
| `MobileNavigation` | Below the `md` breakpoint, both shells collapse into this `Drawer`-backed panel — same `navigationConfig` selector and `NavLink` rendering as the desktop nav, just a different container. Trigger has a real accessible name (`aria-label="Open menu"`) plus Radix's own `aria-expanded`/`aria-controls`. |

`LogoutButton` (`src/components/auth/LogoutButton.tsx`) is reused unchanged
in mechanism (still a Server Action-backed `<form>`) — extended additively
to forward standard button attributes so `ProtectedHeader` and
`MobileNavigation` can style/close-on-click it. It's rendered directly, not
through `navigationConfig`/`NavLink`: it's an action, not a destination.

## Terminology note: no Sidebar

M5.2's responsive navigation is a **header** pattern, not a sidebar: desktop
primary nav renders inline in `PublicHeader`/`ProtectedHeader`, and below
the `md` breakpoint the same `navigationConfig` entries render inside
`MobileNavigation`'s Drawer instead. There is no persistent Sidebar
component, no sidebar collapse state, and no sidebar-specific layout — per
`docs/design-system-architecture.md`, `Sidebar` remains classified "useful
later," and no current page has secondary/persistent navigation dense
enough to need one. `AppShell` stays structurally capable of composing a
Sidebar into its content region in a future milestone without a redesign,
but nothing sidebar-shaped is implemented now.

## M5.2 status: page redesigns complete

Per `docs/m5-application-ui-design-system.md` items 6–9: `/` (landing),
`/login`, `/register`, `/forgot-password`, `/auth/error`, `/update-password`,
`/member`, and `/account` are all redesigned onto the shared shell and
M5.1 primitive system. None hand-roll their own layout/typography anymore.

`/` doesn't use `PageHeader`; see that component's file comment for why its
left-aligned, action-slot shape doesn't fit a centered hero.

## Workspace pages and empty-state architecture (M5.2, item 8–9)

`/member` and `/account` were the only two authenticated-workspace pages in
M5.2; M5.3 added a third, `/member/claim` (see "Identity claiming (M5.3)"
below). All three share one generic pattern rather than each inventing its
own:
`PageHeader` (status/identity) → a `Card` of real, currently-true facts
(never fabricated) → an `EmptyState` for whatever isn't built yet, with a
`FutureAction` in its `action` slot when there's a named next step → plain
`Link`s for anything that's a real, already-built destination. `Section` and
`Container width="content"` keep both single-column today while staying
structurally ready for a future two-column workspace layout — composing
that later is a page-level change, not a new primitive.

- **`/member`** is the authenticated landing/workspace page. It reports
  authentication status and account identity, and — as of M5.3 — the
  account's real identity-claim status (see below), sourced from
  `src/features/identity/status.ts`. It never queries or implies
  `people`/participation/publication/network data beyond that one status;
  every other future section is one honest `EmptyState`, never a zero,
  skeleton, or fabricated example.
- **`/account`** shows only the minimal Auth-account facts it always has
  (email, confirmation status, created-at), plus (M5.3) a read-only
  identity-link status section — no profile editing, claim controls,
  account deletion, email changes, notification preferences, or new
  Server Action beyond `withdraw_profile_claim`'s existing RPC, which is
  only ever called from `/member`, never from this page. `EmptyState` +
  `FutureAction` mark "Account → Security" as a real future destination
  that doesn't exist yet, distinct from the still-real, still-functional
  `/forgot-password` link kept alongside it.

Nothing past these three pages (dashboard widgets, sidebar, general search,
command palette, data visualizations) is in scope; that's M5.4+.

## Identity claiming (M5.3)

`/member/claim` is the real claim-discovery/submission workflow that
`/member`'s "Claim a person record" link now points to (previously an
inert `FutureAction`). It follows the same primitive-composition pattern
as `/member`/`/account` — `PageHeader`, `FormField`/`Textarea` for the
search and evidence inputs, `EmptyState` for the honest no-matches state,
`SubmitButton` for both the search and claim-submission forms — rather
than a bespoke search UI. See `src/features/identity/` for the
Server Actions and pure status-derivation logic behind all three pages,
and `docs/decisions/0008-claim-discovery-security-definer-function.md` for
why `people` search required a new, narrow database access path rather
than a page-level change alone.
