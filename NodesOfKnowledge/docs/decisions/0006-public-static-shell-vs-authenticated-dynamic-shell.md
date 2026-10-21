# 0006. Public static shell vs. authenticated dynamic shell

Date: 2026-08-01
Status: Proposed

## Context

M4 already made and documented this decision once, narrowly, for the
header (`docs/authentication-implementation.md`, "Cache behavior for
authenticated pages"): the original build had a single session-aware
`SiteHeader` in the root layout, which forced every public route
(including the landing page) into dynamic rendering just to decide
whether to show "Log in" or an authenticated nav — an unnecessary cost,
since the landing page and other public routes have nothing session-
dependent to render. The fix was splitting it into `PublicHeader` (fully
static) and `ProtectedNav` (dynamic, rendered only inside the already-
dynamic `(protected)` layout).

M5 formalizes this split into a full `AppShell` system
(`PublicHeader`/`ProtectedHeader`, plus `MobileNavigation`, plus the
token/theme system in `docs/decisions/0002-...md`) and needs to decide
whether that same principle extends to the *whole* shell, not just the
header — because it would be easy to accidentally reintroduce the
original problem while building out the rest of the shell (e.g. a shared
`AppShell` component that reads cookies "just in case," or a footer that
checks auth state for no real reason).

## Decision

**The split M4 made for the header is the general rule for the entire
application shell, not a one-off fix scoped to that component.**

- Every component used by a public route's shell (`PublicHeader`, and any
  future shared footer or landing-page chrome) must remain fully static:
  no `cookies()`, no Supabase client call, no session-dependent
  conditional rendering, directly or transitively. If a public-route
  component needs the theme (`docs/decisions/0002-...md`), it gets it
  entirely client-side (the `data-theme` attribute and CSS), never via a
  server-side cookie read that would force the route dynamic.
- Every component used by an authenticated route's shell
  (`ProtectedHeader`, the user menu, `MobileNavigation` when rendered in
  an authenticated context) may freely depend on session state, because
  every route using it is already `force-dynamic`
  (`(protected)/layout.tsx`) for reasons unrelated to the shell itself —
  adding shell-level session awareness there costs nothing additional.
- `AppShell` itself (the outer composing component) takes the header/nav
  as children or props rather than deciding internally which variant to
  render based on session state — the *routing layer* (root layout vs.
  `(protected)/layout.tsx`) decides which shell variant is used, exactly
  as it does today, not a runtime check inside a single shared component.
- If and when a third shell variant is needed (an administrator shell,
  per `docs/application-information-architecture.md`'s future
  administration structure), it follows the same rule: its own route
  group, its own layout, its own explicit choice to be dynamic — never a
  single `AppShell` silently branching three ways based on client- or
  server-detected role.

## Alternatives considered

**A single, unified `AppShell` that internally checks session state and
renders the right header.** This is the shape M4's *original* build had
(before the documented fix) and is explicitly rejected again here, for
the same reason: it would force static routes dynamic for no benefit,
undoing the cost M4 already paid down.

**Making every route dynamic as a simplification, accepting the
performance cost.** Rejected: `docs/product-specification.md` and
`docs/architecture.md` both treat the public landing page (and, by
extension, the other public routes) as intentionally lightweight; no
product requirement justifies giving that up for shell-code convenience.

## Consequences

**Makes easier:** public routes stay cheap to serve and cacheable
indefinitely (no per-request session check); the rule is simple enough to
state as a one-line review checklist ("does this component read cookies
or call Supabase? then it belongs in the authenticated shell, never the
public one") for every future shell-related change, not just this
milestone's.

**Makes harder:** slightly more indirection than a single shared
component would have (two header components, composed by the routing
layer rather than one smart component) — judged worth it, since this is
exactly the tradeoff M4 already made once and documented as correct.

## Risks

The main risk is regression by convenience — a future contributor adding
"just one small session check" to a component used by both shells,
reintroducing the original problem incrementally. Code review for any
change touching `PublicHeader`, `AppShell`, or shared layout components
should explicitly check for this.
