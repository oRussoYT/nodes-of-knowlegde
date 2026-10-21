# M5 — Application UI / Design System

## Status

This is the implementation specification for **M5**, the fifth build
milestone, following M1 (Foundation), M2 (Architecture), M3 (Supabase and
Database), and M4 (Authentication — commit `4d97f23`, all validation
passing: 21/21 Playwright, 50/50 Vitest, 33/33 pgTAP, build/lint/typecheck/
`npm audit` clean). This document itself is **preparation only** — no code
in this milestone has been written yet. It defines exact scope and
acceptance criteria so that when M5 implementation begins, it has the same
kind of precise boundary M4 had.

Read alongside: `docs/ui-vision.md` (why), `docs/application-information-architecture.md`
(structure), `docs/design-system-architecture.md` (tokens and components),
and the ADRs in `docs/decisions/0002`–`0007` (the specific technical
choices this scope assumes).

`docs/decisions/0007-netpdbff-first-vertical-general-research-infrastructure.md`
adds a naming/layering discipline (generic components stay domain-neutral;
NetPDBFF branding is a skin, not an architectural assumption) — it does
not add scope to this milestone. Every guardrail in that ADR applies here:
nothing in this document's scope, or in "What M5 must not implement"
below, is broadened by it.

## Relationship to M1–M4

M5 touches only presentation. It must not modify:

- The database schema, migrations, or RLS policies (M3).
- Authentication logic, Server Actions, Supabase clients, or route
  protection (M4) — M5 **redesigns the visual presentation** of existing
  auth pages, using the new component library, but the underlying actions,
  validation, and security properties documented in
  `docs/authentication-implementation.md` do not change. Every existing
  test in `tests/unit/` and `tests/e2e/` must keep passing unmodified in
  behavior (test files may need selector updates if markup structure
  changes — see "Testing and validation" below).
- Any dependency related to Supabase, auth, or the database.

## Scope

### 1. Design tokens and themes

Implement the token system defined in `docs/design-system-architecture.md`
as CSS custom properties via Tailwind v4's `@theme` layer in
`globals.css`: color primitives, semantic color roles (including the
`status-*` roles, defined but unused by any M5 page), typography scale,
spacing-scale confirmation (Tailwind defaults, no new scale), radii,
border tokens, shadow/elevation tokens, breakpoints, motion tokens.

**Acceptance criteria:** every token has both a light and dark value,
independently checked for WCAG AA contrast; no component introduced in
this milestone references a raw Tailwind color utility (e.g. `neutral-900`)
directly — only semantic tokens; the existing two-variable `globals.css`
is superseded by the full token set without changing the *currently
rendered* light-mode appearance of any existing page in a way that isn't
an intentional part of items 6–8 below.

### 2. Reusable core UI components

Implement the components classified **required in M5** in
`docs/design-system-architecture.md`'s component table:
`Button`, `Link`, `Input`, `Textarea`, `Select`, `Checkbox`, `FormField`,
`FormMessage`, `Card`, `Badge`, `Alert`, `Dialog`, `Drawer`, `Tabs`,
`Tooltip`, `Dropdown`, `Avatar`, `EmptyState`, `Skeleton`, `Spinner`,
`PageHeader`, `AppShell`, `PublicHeader`, `ProtectedHeader`,
`MobileNavigation`. `Radio` and `Switch` move from "useful later" to
required only if the dark-mode toggle (item 11) is implemented as a
`Switch` — decide during implementation, not before.

**Acceptance criteria:** every component lives in `src/components/ui`
(generic primitives) or `src/components/layout` (structural), per
`CLAUDE.md`; every component is a Server Component unless it genuinely
needs client interactivity, per "Component-composition principles"; every
component meets the accessibility requirements in
`docs/design-system-architecture.md`; existing `FormField`, `FormMessage`,
and `SubmitButton`/`Button` are extended in place (same import paths where
reasonable) rather than duplicated alongside new versions.

### 3. Public application shell

Implement `AppShell` + `PublicHeader` (formalizing the existing static,
no-session-check header) for every public route. Must remain statically
renderable — no `cookies()`/session check anywhere in this shell, per
`docs/decisions/0006-public-static-shell-vs-authenticated-dynamic-shell.md`.

**Acceptance criteria:** `next build`'s output shows `/`, `/login`,
`/register`, `/forgot-password`, `/auth/error` as static
(○ Static/Prerendered), matching the check
`docs/authentication-implementation.md` already documents for the current
build.

### 4. Authenticated application shell

Implement `AppShell` + `ProtectedHeader` (formalizing and extending
`ProtectedNav` with the user menu) for `/member`, `/account`,
`/update-password`. Remains `force-dynamic` per existing, correct
behavior — this milestone does not attempt to make authenticated pages
static.

**Acceptance criteria:** `(protected)/layout.tsx`'s existing independent
session re-verification is unchanged; the user menu (`Dropdown` + `Avatar`)
replaces the current inline email/logout text without changing what
information is shown or how logout works (`LogoutButton`'s Server
Action-backed form is reused, not rebuilt).

### 5. Responsive navigation

Implement `MobileNavigation` and the `md`-breakpoint collapse behavior for
both shells, per `docs/application-information-architecture.md`.

**Acceptance criteria:** every link reachable in desktop primary
navigation and the user menu is also reachable via `MobileNavigation`;
the trigger has a real accessible name; keyboard-only navigation can open,
navigate, and close it.

### 6. Landing page redesign

Rebuild `/` using `AppShell`, `PageHeader`-family components, and the new
token system. Content stays true to
`docs/product-specification.md`'s "under development" honesty — this is a
visual redesign, not a scope expansion. No dashboard, statistics, member
directory, or decorative feature content is added, per that document's
explicit current-phase boundary.

**Acceptance criteria:** page remains statically rendered; passes the
same or better Lighthouse/axe accessibility spot-check as the current
page; visually distinct from the current bare version but recognizably
the same product (no wholesale copy rewrite beyond what the new component
set requires).

### 7. Authentication-page redesign

Rebuild `/login`, `/register`, `/forgot-password`, `/auth/error`,
`/update-password` using the new `Input`/`FormField`/`FormMessage`/
`Button`/`Card`/`Alert` components, replacing today's hand-styled
Tailwind classes.

**Acceptance criteria:** every existing Playwright test in
`tests/e2e/{register,login,password-reset,update-password,
protected-routes}.spec.ts` passes against the redesigned markup (selector
updates are acceptable and expected; behavioral changes are not); every
security/enumeration property documented in
`docs/authentication-implementation.md` is unchanged; the six user-facing
states in that document's "User-facing states" table are all still
present and use the new `Alert`/`FormMessage` components.

### 8. Member and account page visual redesign

Rebuild `/member` and `/account` using the new component set and the
dashboard-shell pattern from item 9.

**Acceptance criteria:** `/member` and `/account` still explicitly state
that the account is not yet connected to a person record, per
`docs/decisions/0001-separate-people-from-user-accounts.md` — this
copy/framing is a load-bearing part of the product, not incidental text
that a redesign might drop.

### 9. Dashboard shell that does not fabricate unavailable data

Implement the `/member` dashboard structure defined in
`docs/application-information-architecture.md`'s "Dashboard hierarchy":
welcome/status header, real account-summary card, `EmptyState` for
not-yet-available sections, quick links.

**Acceptance criteria — the hardest constraint in this milestone:** no
element on `/member` displays a zero, a count, a preview, or a skeleton
that implies real participation, network, or publication data exists or
is loading. Every such section is either omitted entirely or shown as an
explicit, honestly-labeled `EmptyState`. This is verified by code review
against `docs/database-schema.md` — no query against `pdbff_participations`,
`person_relationships`, `person_publications`, or any other
not-yet-implemented table is introduced anywhere in this milestone.

### 10. Accessibility baseline

Apply the accessibility requirements in
`docs/design-system-architecture.md` across every page and component this
milestone touches.

**Acceptance criteria:** automated `axe-core`-based checks (via
`@axe-core/playwright`, run inside the existing Playwright suite — a
proposed new devDependency, justified as directly implementing this
milestone's own required baseline) report no critical/serious violations
on every redesigned page, in both themes; full keyboard-only walkthrough
of every page and component is possible without a mouse; `prefers-reduced-
motion: reduce` verified to suppress/simplify all introduced transitions.

### 11. Dark mode

Implement the theming mechanism in
`docs/decisions/0002-theming-and-server-client-theme-handling.md`: token-
driven light/dark values, explicit user override (not just
`prefers-color-scheme`), no flash of incorrectly-themed content on initial
load, preference persisted client-side only.

**Acceptance criteria:** toggling the theme updates every visible
component consistently; a hard page reload preserves the user's explicit
choice; a visitor with no stored preference gets their OS-level
`prefers-color-scheme` as the default, matching today's behavior; no new
database column, table, or Supabase call is introduced to store the
preference.

### 12. Loading, empty, error, and success states

Implement the four state patterns from
`docs/application-information-architecture.md` consistently across every
page in scope.

**Acceptance criteria:** every existing explicit user-facing state
documented in `docs/authentication-implementation.md`'s "User-facing
states" table is preserved and re-rendered through the new components;
`/member`'s empty state (item 9) and any new loading states use
`EmptyState`/`Skeleton`/`Spinner` rather than ad hoc markup.

### 13. Component and design-system documentation

Produce in-repo documentation of the implemented component set — at
minimum, updated `src/components/ui/README.md` and
`src/components/layout/README.md` (both currently stubs stating "no
components exist here yet") listing each built component, its props, and
a usage example. A living style-guide route (e.g. a
`/dev/design-system`-style internal page) is optional and, if built, must
be excluded from production routing/navigation (not linked from any real
page) or gated behind a build-time flag — it is a development aid, not a
product feature, and must not become a public route.

**Acceptance criteria:** every component in the "required in M5" list has
a documented prop interface and at least one usage example, in-repo.

### 14. Unit and E2E regression coverage

Extend, not replace, the existing suites.

**Acceptance criteria:** all 50 existing Vitest cases and all 21 existing
Playwright cases still pass (accounting for the selector-only updates
noted in item 7); new unit tests cover any new pure logic this milestone
introduces (e.g. theme-preference read/write helpers, if implemented as
testable pure functions per the existing `src/lib` pattern); new
Playwright coverage exercises the dark-mode toggle, mobile navigation
open/close, and the user menu, at minimum.

### 15. Visual-regression strategy, if appropriate

Recommended, not mandated: Playwright's built-in `toHaveScreenshot()`
against the redesigned pages (both themes, at least one mobile and one
desktop viewport), rather than adopting a hosted visual-diffing service —
consistent with this repository's zero-new-infrastructure-dependency
posture. See `docs/decisions/` — this specific choice is judged too small
and low-risk to warrant its own ADR (it uses tooling already present via
`@playwright/test`, adds no new dependency, and is easily reversed), but
is recorded here as the recommended approach for whoever implements M5 to
either adopt or explicitly decline with reasoning.

**Acceptance criteria, if adopted:** baseline screenshots committed for
every redesigned page in both themes; CI (once CI exists — none is
documented as configured yet) or local `npm run test:e2e` catches
unintended visual regressions on subsequent changes.

**Decision (M5.5): explicitly deferred, not adopted.** Per this item's own
instruction to either adopt or explicitly decline with reasoning before M5
closes — resolved now, in M5.5, rather than left open.

Not adopted because, inspected as of M5.5's baseline (`8e40e43`):

- **No CI exists.** Repo-wide search confirms zero CI configuration (no
  `.github/workflows`, no other CI YAML) — exactly the "once CI exists"
  condition this item's own acceptance criteria already flagged as
  unresolved. Without CI, `toHaveScreenshot()` baselines could only ever be
  compared locally, on whichever contributor's machine happens to run
  `npm run test:e2e` next.
- **Screenshot baselines are not portable across machines/operating
  systems.** Playwright's own documented guidance is that pixel-level
  screenshot comparison is sensitive to OS-level font rendering, subpixel
  antialiasing, and GPU/software rendering differences — stable use
  normally requires a single pinned environment (typically a Docker image)
  generating and comparing every baseline. This repository has no such
  pinned environment for the *browser* side of Playwright today (unlike
  Supabase, which does run in Docker locally) — `playwright.config.ts`
  runs Chromium directly on the host, and contributors are on different
  host operating systems.
- **Every candidate page has genuinely dynamic, per-run content.** `/member`,
  `/account`, `/review/claims`, and `/review/claims/[claimId]` all render
  live data that changes on every test run by construction: a freshly
  generated email address (`registerAndConfirm`'s `Date.now()`-suffixed
  address), real submission/decision timestamps, and (on the reviewer
  queue) a variable number of rows depending on what earlier tests left
  behind. Stable screenshots would require a new content-masking/mocking
  layer this milestone would have to design and maintain — real, ongoing
  work, not a one-time setup cost — for pages that are exactly the ones
  most worth screenshotting.
- **Doubling every baseline for two themes and two viewports, on top of
  the above, multiplies an already-unstable foundation** rather than
  giving proportionate value — the repository's own "zero new
  infrastructure dependency" posture (recorded when this item was
  originally written) argues against taking on that maintenance burden
  before the portability and dynamic-content problems above are actually
  solved.

**What currently protects visual quality instead**, and continues to:
`auth-pages-quality.spec.ts` and `workspace-pages-quality.spec.ts`
(console/hydration errors, duplicate ids, horizontal overflow at 375px,
keyboard focus visibility, per-theme structural assertions) plus, as of
M5.5, `accessibility.spec.ts`'s automated axe-core scan (item 10, above),
which catches the color-contrast and semantic-structure regressions a
screenshot diff would otherwise be the tool reached for. Between the two,
the highest-value share of what visual regression testing would catch —
broken layout, inaccessible contrast, structural drift — is already
covered by tests that don't have the portability problem.

**Conditions that should trigger revisiting this decision:** CI is
introduced (a pinned, reproducible environment removes the portability
objection); a future milestone adds a page with materially more complex
visual layout than this project's current restrained, mostly-text
component set (e.g. a network graph, a timeline, a map — see
`docs/design-system-architecture.md`'s "Signature NetPDBFF interaction
principles"), where a screenshot diff would catch classes of regression
axe/structural tests structurally cannot; or maintenance data shows a real
visual regression reached production that the current test suite missed
and a screenshot diff would have caught.

This is a deliberate decision, not an overlooked requirement — no new ADR
is written for it, matching this item's own original judgment that the
choice is "too small and low-risk to warrant its own ADR."

## What M5 must not implement

Restated explicitly, matching the milestone brief:

- Member profiles, identity claims, or any part of the profile-claiming
  workflow (`profile_claims`, `user_person_links` writes).
- Institutions, PDBFF participation records, or any query against
  `institutions`, `pdbff_participations`, `participation_roles`, or
  related tables.
- Publications (`publications`, `person_publications`).
- Search of any kind.
- Moderation or administrative tooling of any kind (no admin role exists).
- Analytics.
- Graph/network visualization.
- Any new database table, column, migration, or RLS policy.
- Any change to Supabase configuration, environment variables, or the
  authentication Server Actions' logic.
- Real content for `/about`, `/terms`, or `/privacy` (navigation may
  reserve the `/about` slot per the IA doc; content is out of scope).
- A server-persisted (database-backed) user preference of any kind,
  including theme preference — client-side persistence only.
- A public style-guide/component-showcase route.

## Proposed new dependencies

Each requires the tradeoff analysis already recorded in its ADR before
adoption is final:

- Headless accessible primitives for `Dialog`/`Drawer`/`Tabs`/`Tooltip`/
  `Dropdown` (Radix UI primitive packages, installed individually per
  component, not a bundled framework) — `docs/decisions/0003-...md`.
- An icon library (Lucide) — `docs/decisions/0004-...md`.
- `@axe-core/playwright` (dev-only) — for item 10's automated accessibility
  checks; not listed in a dedicated ADR since it's a test-tooling addition
  directly implementing an already-decided requirement, not a design
  choice with real alternatives worth weighing.
- Explicitly **not** proposed: an animation library
  (`docs/decisions/0005-...md`), a component framework/design-system
  package (`docs/decisions/0003-...md`), a theming library
  (`docs/decisions/0002-...md`), a form/schema-validation library (no
  change from M4's existing position).

## Testing and validation plan

Mirrors M4's own validation rigor:

1. `npm run build`, `npm run lint`, `npm run typecheck`, `npm audit` — all
   clean, as with M4.
2. `npm run test` (Vitest) — 50/50 existing cases passing, plus new cases
   for any new pure logic.
3. `npm run test:e2e` (Playwright) — 21/21 existing cases passing (with
   selector updates only where markup changed), plus new cases for
   dark-mode toggle, mobile navigation, and the user menu.
4. New: automated accessibility checks (item 10) integrated into the
   Playwright run.
5. New, if adopted: visual-regression screenshots (item 15).
6. Manual verification: full keyboard-only pass and a screen-reader spot
   check (VoiceOver or NVDA) on the redesigned auth flow and dashboard, at
   minimum — mirroring the manual Mailpit walkthrough
   `docs/authentication-implementation.md` documents for M4.

## Suggested implementation order

1. Design tokens and both themes (item 1) — everything else depends on
   this.
2. Core presentational primitives with no complex interaction (`Button`,
   `Input`, `Textarea`, `Select`, `Checkbox`, `FormField`, `FormMessage`,
   `Card`, `Badge`, `Alert`, `Avatar`, `Skeleton`, `Spinner`, `EmptyState`,
   `PageHeader`) (item 2, partial).
3. Headless-backed interactive primitives (`Dialog`, `Drawer`, `Tabs`,
   `Tooltip`, `Dropdown`) (item 2, remainder) — per ADR 0003.
4. Shells and navigation (`AppShell`, `PublicHeader`, `ProtectedHeader`,
   `MobileNavigation`) (items 3–5).
5. Dark-mode mechanism (item 11) — needed before visual page-by-page
   redesign so every rebuilt page is dark-mode-correct from the start,
   not retrofitted.
6. Page-by-page redesign: landing (6), auth pages (7), member/account (8),
   dashboard shell (9) — in that order, cheapest/lowest-risk first.
7. State-pattern consistency pass (12) across everything just built.
8. Accessibility verification pass (10) and any fixes it surfaces.
9. Documentation (13).
10. Full regression + new coverage (14) and, if adopted, visual-regression
    baselines (15) — last, once markup is stable.

## Risks

- **Scope creep toward domain features.** The dashboard shell (item 9) is
  the highest-risk item for accidentally implying unbuilt functionality —
  see its acceptance criteria and the explicit "must not implement" list.
- **Selector churn breaking existing E2E tests.** Redesigning auth-page
  markup is expected to require Playwright selector updates; the risk is
  a behavioral regression hiding behind a selector fix that makes a test
  pass without actually testing the same thing. Mitigation: review diffs
  to existing spec files as carefully as new component code.
- **Dependency creep.** Every proposed dependency has a written tradeoff
  analysis (ADRs 0002–0005) specifically to guard against ad hoc additions
  during implementation; any dependency not already named in this document
  or its ADRs needs the same documented justification `CLAUDE.md` already
  requires, before it's added.
- **Dark mode surfacing latent contrast issues.** Formalizing tokens for
  both themes may reveal that some current dark-mode Tailwind classes
  don't actually meet AA — treat this as an expected finding to fix, not
  a sign the approach is wrong.

## Definition of done

All 15 scope items' acceptance criteria met; all existing and new
automated tests passing; build/lint/typecheck/`npm audit` clean; manual
keyboard and screen-reader spot checks completed; no item from "What M5
must not implement" present anywhere in the diff; every new dependency
traceable to a written ADR or this document's own justification; working
tree otherwise clean, nothing committed until reviewed and approved.

## M5.5 closeout

M5 was implemented across four sub-milestones (M5.1 design foundations,
M5.2 shells/navigation/page redesigns, M5.3 identity claiming, M5.4 claim
review governance) plus this one, M5.5, a verification-and-closeout pass
with no new product scope. As of M5.5, all 15 scope items above are
closed:

- **Item 10 (Accessibility baseline).** Completed in M5.5:
  `@axe-core/playwright` (proposed above, in "Proposed new dependencies")
  is installed, `tests/e2e/helpers/accessibility.ts` provides the reusable
  scan/assertion helpers, and `tests/e2e/accessibility.spec.ts` (23 cases)
  scans every public, authenticated, and reviewer route named in the M5.5
  brief, in both themes, against WCAG 2.1 A/AA, failing on critical/serious
  violations. One real, confirmed defect was found by direct contrast-
  ratio calculation during this pass (`--color-subtle-foreground`, used
  for form-field placeholder text, measured 4.33:1 light / 4.49:1 dark
  against the 4.5:1 AA floor) and fixed in `src/app/globals.css` across
  all three theme-value locations (`:root`, `[data-theme="dark"]`, and the
  `prefers-color-scheme` fallback) without touching the shared
  `--neutral-500` primitive any other token still depends on. See the
  M5.5 completion report for the full violation-scan results, since axe
  itself could not be executed inside the sandbox this pass was authored
  in (no Docker, no npm-registry access — the same category of limitation
  `docs/authentication-implementation.md` has documented since M4) and
  needs one local `npm run test:e2e` run to fully confirm.
- **Item 15 (Visual-regression strategy).** Resolved in M5.5: explicitly
  **deferred**, not adopted — see the full reasoning recorded in place,
  above, under item 15's own "Decision (M5.5)."
- **Items 1–9, 11–14.** Unchanged from their M5.1–M5.4 completion; nothing
  in M5.5 modified any already-completed page, shell, component, token,
  or Server Action. `docs/authentication-implementation.md`'s "Automated
  tests" section was also rewritten in M5.5 to replace stale M4-era
  "never executed" language with the real, current suite composition and
  counts — a documentation-only change, not a functional one.

**M5 is complete as of M5.5**, pending the local execution of
`accessibility.spec.ts` (the one piece of this closeout that could not run
inside the authoring sandbox) and the rest of the standard validation
suite. See the M5.5 completion report for the full accounting.
