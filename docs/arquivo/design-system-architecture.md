# Design-System Architecture

## Status

Product-design and architectural preparation for **M5 — Application UI /
Design System**. This document defines the intended token system,
component family, and interaction patterns; it does not implement any of
them. No component below exists yet except where explicitly marked
"Existing (M4)." See `docs/m5-application-ui-design-system.md` for what M5
actually builds and its acceptance criteria, and
`docs/decisions/` for the architectural decisions (theming, component
strategy, icon library, animation, shell rendering) this document assumes.

Per `docs/decisions/0007-netpdbff-first-vertical-general-research-infrastructure.md`,
every token and component defined below must be named and scoped as
domain-neutral platform infrastructure, not after PDBFF-specific concepts
— NetPDBFF's own identity is applied through tokens, content, and copy, not
hard-coded into component logic.

## Relationship to existing code

M5 formalizes and extends what M4 already established; it does not
discard it. Today's real conventions, to be generalized rather than
replaced:

- `src/app/globals.css` defines exactly two CSS custom properties
  (`--color-background`, `--color-foreground`), switched via
  `prefers-color-scheme`, plus Tailwind v4's `@theme inline` mechanism to
  expose them as utilities. This is the seed of the token system below,
  not a competing approach.
- `src/components/ui/{FormField,FormMessage,SubmitButton}.tsx` are the
  first three components of the family defined below (`Input`+`FormField`,
  `FormMessage`/`Alert`, `Button`/`SubmitButton`). Their existing API
  shapes (label/error/hint props, `tone` prop, `pendingLabel` prop) are the
  starting point for the generalized versions, not a clean-slate redesign.
- `src/components/layout/{PublicHeader,ProtectedNav}.tsx` are the seed of
  `PublicHeader`/`ProtectedHeader` below, including the already-made,
  correct decision to keep the public shell statically renderable — see
  `docs/decisions/0006-public-static-shell-vs-authenticated-dynamic-shell.md`.
- The neutral-gray Tailwind scale (`neutral-50`…`neutral-900`), `rounded-md`
  radii, `shadow-sm` elevation, and `focus-visible:ring-2` focus treatment
  are already consistent across every M4 page. These become named tokens,
  not new visual choices.
- Zero UI dependencies exist today beyond Tailwind itself. Any dependency
  M5 proposes is a deliberate, documented addition — see
  `docs/decisions/`.

## Design tokens

All tokens are proposed as CSS custom properties defined through Tailwind
v4's `@theme` layer in `globals.css` (the same mechanism already in use),
not a `tailwind.config.js` (this project has none, correctly — Tailwind
v4's CSS-first configuration is already the established pattern).

### Color

Two layers: a small set of **primitive** scales (raw color values) and a
larger set of **semantic** roles that reference them (see "Semantic color
roles" below). Only semantic tokens are used in component code; primitives
are never referenced directly outside token definitions, so a future
palette adjustment changes one place, not every component.

Primitive scales proposed: `neutral` (extending the existing scale —
warm-neutral, not cold gray), one `accent` scale (the single interactive
color, per `docs/ui-vision.md`), and small scales for each semantic status
color (`success`, `warning`, `danger`, `info`) plus the
verification-specific scales described under "Semantic color roles."
Exact hex values are a token-authoring task for M5 itself, not decided
here — this document fixes the *structure*, not the palette.

### Typography scale

| Token | Suggested use |
|---|---|
| `text-xs` | Metadata, timestamps, field hints (matches M4's existing hint-text usage) |
| `text-sm` | Body copy in dense contexts, form labels, table cells (matches M4's dominant current size) |
| `text-base` | Default reading body copy |
| `text-lg` | Section headers, emphasized body copy |
| `text-xl`–`text-2xl` | Page headers (matches M4's existing `text-2xl` page-title convention) |
| `text-3xl`–`text-4xl` | Landing/marketing-scale headers only (matches M4's existing landing-page convention) |

Two font-family tokens: `--font-ui` (interface chrome, forms, tables —
system-font stack by default, per `docs/ui-vision.md`) and `--font-reading`
(optional, for long-form narrative content; may equal `--font-ui` until a
reading typeface is deliberately chosen). Line-height is paired per size
step (tighter for headers, ~1.5–1.6 for body/reading copy), not a single
global value.

### Spacing scale

Tailwind's default spacing scale (4px base unit) is reused as-is — no
custom spacing scale is introduced. This matches the "don't add complexity
without a reason" discipline already established (`CLAUDE.md`) and every
M4 page already composes spacing from the default scale (`px-6`, `py-16`,
`gap-1.5`, etc.).

### Radii

| Token | Value | Use |
|---|---|---|
| `radius-sm` | Tailwind `rounded` | Small inline elements (badges, chips) |
| `radius-md` | Tailwind `rounded-md` | Default — inputs, buttons, cards, banners (M4's existing universal default) |
| `radius-lg` | Tailwind `rounded-lg` | Larger surfaces (dialogs, drawers) |
| `radius-full` | Tailwind `rounded-full` | Avatars, pills, switches |

### Borders

A single hairline border-width default (`1px`), with semantic border-color
tokens (`border-default`, `border-muted`, `border-strong`,
`border-focus`) layered over the neutral primitive scale — matching M4's
existing `border-neutral-200`/`border-neutral-800` (light/dark) pattern,
now named rather than repeated inline everywhere.

### Shadows / elevation

Deliberately minimal, matching the restrained visual language — three
levels, not a large elevation system:

| Token | Use |
|---|---|
| `shadow-none` | Default resting state for most surfaces (cards, page background) |
| `shadow-sm` | Slightly raised — buttons, inputs (M4's existing default) |
| `shadow-lg` | Floating surfaces — dialogs, drawers, dropdowns, tooltips |

### Breakpoints

Tailwind's default breakpoints are reused (`sm`/`md`/`lg`/`xl`/`2xl`). The
architecturally significant one is **`md`** — the navigation-collapse
point where `MobileNavigation` takes over from desktop primary navigation
(see `docs/application-information-architecture.md`).

### Motion tokens

| Token | Value (proposed) | Use |
|---|---|---|
| `duration-fast` | ~120ms | Micro-interactions — hover, focus |
| `duration-base` | ~200ms | Default transitions — disclosure, menu open/close |
| `duration-slow` | ~300ms | Larger surface transitions — drawer/dialog enter/exit |
| `ease-standard` | A single standard easing curve | All of the above |

Every transition is wrapped so `prefers-reduced-motion: reduce` collapses
it to near-zero duration rather than removing the state change itself —
see `docs/decisions/0005-no-animation-library-for-m5.md`.

## Semantic color roles

Beyond generic UI roles (`background`, `surface`, `foreground`, `muted`,
`border`, `accent`, `accent-foreground`), NetPDBFF needs status roles that
map **directly and only** onto the controlled vocabularies already defined
in `docs/database-schema.md` — a color must always mean the same specific
thing everywhere it's used, per `docs/ui-vision.md`'s color philosophy.

| Semantic token | Maps to | Notes |
|---|---|---|
| `status-unreviewed` | `verification_status = unreviewed` (people, relationships, media) | Neutral, not alarming — most historical data starts here |
| `status-under-review` | `verification_status = under_review` | Distinct from unreviewed — something is actively happening |
| `status-supported` / `status-provisional` | `verification_status = supported`, person `provisional` | Distinct from confirmed — evidence exists, not yet confirmed |
| `status-confirmed` / `status-verified` | `verification_status = confirmed`, person `verified_self`/`verified_admin` | The only state that should read as "settled" |
| `status-disputed` | `verification_status = disputed` | Must never look identical to an error/danger color — disputed is a legitimate, retained historical state, not a failure |
| `status-rejected` | `verification_status = rejected` | Muted, not alarming — retained for history, not a live problem |

These are **domain-specific and deferred** in terms of *use* (no page in
M5 renders a verification-status badge, since no verification data is
shown until later milestones) but the token names and color mappings are
defined now so the eventual `Badge`/status-pill components have a fixed,
reviewed vocabulary to render against instead of inventing colors ad hoc
per feature. Every status role pairs with a required text label — color
alone never carries the distinction (`docs/ui-vision.md`).

## Component variants

Defined generically, applied per-component in the table below:

- **Emphasis**: `primary` / `secondary` / `ghost` / `destructive` — for
  actionable components (`Button`, and by extension icon-only action
  triggers).
- **Size**: `sm` / `md` / `lg` — for `Button`, `Input`, `Badge`, `Avatar`.
- **Tone**: `neutral` / `success` / `warning` / `danger` / `info` — for
  `Alert`, `FormMessage`, `Badge`, `Toast` (extends M4's existing
  `FormMessage` `tone` prop, which already has `error`/`success`/`info`;
  M5 adds `warning`/`neutral`).

## Component-composition principles

- **Server Components by default**, per `CLAUDE.md`. Presentational
  primitives with no client-side state or event handlers (`Card`, `Badge`,
  `Alert`, `PageHeader`, `SectionHeader`, `Skeleton`, `Avatar`, `Table`)
  are plain Server Components. Only primitives that genuinely need
  interactivity (`Dialog`, `Drawer`, `Tabs`, `Accordion`, `Tooltip`,
  `Dropdown`, form controls with client-side state, `Toast`) are Client
  Components, and the `"use client"` boundary stays as low in the tree as
  possible — e.g. a `Dialog`'s trigger and content are client-rendered,
  but a page composing one around static content stays a Server Component.
- **Compound-component pattern** for multi-part primitives (`Tabs.Root/
  Tabs.List/Tabs.Trigger/Tabs.Content`, `Dialog.Root/Dialog.Trigger/
  Dialog.Content`, `Accordion.Root/Item/Trigger/Content`) — matches the
  shape of the headless primitives adopted per
  `docs/decisions/0003-component-primitives-headless-for-complex-interactions.md`,
  and keeps composition explicit rather than prop-drilling configuration
  into a single monolithic component.
- **Controlled and uncontrolled both supported** for anything with open/
  closed or selected state (`Dialog`, `Tabs`, `Accordion`, `Dropdown`) —
  uncontrolled by default (simplest call site), controlled available when
  a page needs to drive state itself.
- **No business logic in `src/components`** (`CLAUDE.md`) — every
  component here is presentational. Data fetching, Server Actions, and
  domain logic stay in `src/features`/`src/lib`, exactly as M4 already
  separates `src/features/auth/actions` from `src/components/ui`.
- **`forwardRef` / ref passthrough** on every primitive that wraps a
  native interactive element, so consuming code can manage focus
  (important for form-error scroll-to-field behavior and dialog focus
  return).

## Accessibility requirements

- **WCAG 2.1 AA contrast**, minimum, for every token pairing (text on
  background, including both themes) — verified as part of token
  authoring, not left to individual component implementation.
- **Full keyboard operability** for every interactive component,
  including composite ones: `Tabs` (arrow-key roving tabindex), `Dialog`/
  `Drawer` (focus trap, `Escape` to close, focus returned to trigger),
  `Dropdown` (arrow-key item navigation, type-ahead), `Accordion`
  (arrow-key navigation between headers). This is the primary reason
  these specific components are proposed as headless-primitive-backed
  rather than hand-built — see
  `docs/decisions/0003-component-primitives-headless-for-complex-interactions.md`.
- **Visible focus state on every interactive element** — extends M4's
  existing `focus-visible:ring-2 focus-visible:ring-offset-2` convention
  as the universal default, never `outline-none` without a replacement.
- **Every icon-only control has an accessible name** (`aria-label` or
  equivalent) — no icon-only button ships without one, including
  `MobileNavigation`'s trigger.
- **Status and error association**: extends `FormField`'s existing
  `aria-describedby` (hint + error) and `FormMessage`'s existing
  `role="alert"`/`role="status"` pattern to every new form/feedback
  component.
- **Motion respects `prefers-reduced-motion`** at the token level (see
  "Motion tokens"), not as a per-component opt-in developers might forget.
- **Text resize and zoom**: layouts must not break at 200% browser zoom or
  under user-forced larger base font sizes — no fixed-height text
  containers that clip content when text grows.

## Form conventions

Extends M4's established pattern rather than replacing it: label above
field, required fields marked (visually and via the native `required`
attribute, matching current forms), inline field-level errors directly
under the field (`FormField`'s existing pattern), an optional form-level
error banner above the fields for submission-wide failures (`FormMessage`
tone="error", existing pattern). `FormField` generalizes into the family
below (`Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch` all
compose with a shared `FormField`/`FormMessage` wrapper) rather than each
control reinventing label/error/hint layout.

## Validation conventions

Unchanged in principle from M4's existing approach
(`docs/authentication-implementation.md`, "Validation approach"):
client-side validation is a UX convenience; server-side validation (Server
Actions) is the sole enforcement point. M5 does not introduce a schema
validation library — the existing small, dependency-free, pure-function
approach in `src/lib/auth/validation.ts` is the pattern future forms
should follow, revisited only if a future milestone's forms are
substantially more complex than what exists today (per that document's own
stated caveat).

## Loading conventions

- **In-flight form submission**: `SubmitButton`'s existing
  `useFormStatus`-driven disabled/pending-label pattern is the standard —
  generalized so any future submit control gets this behavior for free.
- **Content not yet available on initial render**: `Skeleton` — a
  low-motion, shape-matching placeholder, never a generic centered
  spinner for page-level content.
- **Short, indeterminate in-page actions** (e.g. a button triggering a
  non-form async action): `Spinner`, always paired with visible or
  `aria-live` status text — never a spinner alone with no text
  equivalent.

## Responsive behavior

Mobile-first Tailwind utility usage (matching M4's existing
`sm:`/breakpoint-prefixed patterns). Container widths follow content
purpose, not a single global max-width — M4 already varies this
correctly (`max-w-md` for forms, `max-w-3xl` for the header, `max-w-xl`
for the landing page); M5 should name these as `container-form`/
`container-shell`/`container-content` tokens rather than leaving the
values ad hoc per page, but keep the existing per-purpose sizing logic.

## Light and dark themes

Both are first-class (see `docs/ui-vision.md`, "Dark-mode philosophy").
Every semantic token above resolves to a light value and a dark value;
neither is derived by mechanically inverting the other — each pairing is
independently checked for AA contrast. Theme selection: extends M4's
`prefers-color-scheme`-only approach with an explicit, user-controllable
override, persisted client-side (cookie or `localStorage`, not a database
column — no schema exists for a user preference yet and M5 must not add
one). See `docs/decisions/0002-theming-and-server-client-theme-handling.md`
for the full mechanism, including how the initial theme is determined
server-side to avoid a flash of incorrectly-themed content.

## Component family

Every component NetPDBFF's design system will eventually need, classified
as **required in M5**, **useful later** (defined now, not built until a
later milestone needs it, but its API shape is anticipated so it composes
cleanly with what M5 does build), or **domain-specific and deferred**
(depends on data/features M5 explicitly excludes — profiles, institutions,
publications, etc.). "Headless-backed" notes which primitives are proposed
to use an unstyled accessibility-focused library per
`docs/decisions/0003-component-primitives-headless-for-complex-interactions.md`;
everything else is fully hand-built Tailwind, no dependency.

| Component | Classification | Notes |
|---|---|---|
| `Button` | Required in M5 | Generalizes existing `SubmitButton`; hand-built |
| `Link` | Required in M5 | Styled wrapper over `next/link`; hand-built |
| `Input` | Required in M5 | Generalizes existing `FormField`'s input; hand-built |
| `Textarea` | Required in M5 | No current use in M4, but trivial and needed for near-future forms; hand-built |
| `Select` | Required in M5 | Native `<select>` styled, not a custom listbox — simplest accessible option; hand-built |
| `Checkbox` | Required in M5 | `/register`'s terms-acceptance control today is unstyled native; hand-built |
| `Radio` | Useful later | No current use; needed once a form has mutually exclusive options (e.g. future vocab/role pickers) |
| `Switch` | Useful later | No current use; likely first use is the dark-mode toggle itself — may move to "required" during M5 implementation once the theme toggle's UI is decided |
| `FormField` | Required in M5 | Exists (M4); generalized to wrap `Input`/`Textarea`/`Select`/`Checkbox`/`Radio` uniformly |
| `FormMessage` | Required in M5 | Exists (M4); generalized tone set (adds `warning`/`neutral`) |
| `Card` | Required in M5 | Formalizes the ad hoc bordered boxes already used on `/`, `/member`, `/account` |
| `Badge` | Required in M5 | Needed for the dashboard shell's "coming soon" labeling and generic small status labeling; verification-status use is deferred with the data it depends on |
| `Alert` | Required in M5 | Page-level variant of `FormMessage` for non-form banners |
| `Dialog` | Required in M5 | Headless-backed. No confirmed M5 use case yet, but logout-confirmation or destructive-action confirmation is a plausible near-term need; included so the pattern exists before it's urgently needed |
| `Drawer` | Required in M5 | Headless-backed. Powers `MobileNavigation` |
| `Tabs` | Required in M5 | Headless-backed. Defined for `/account`'s future second page; not used by any M5-built page today |
| `Accordion` | Useful later | Headless-backed. No M5 use case (the one `<details>` disclosure in `/login` is simple enough to stay native); revisit once FAQ-like or grouped-disclosure content exists |
| `Tooltip` | Required in M5 | Headless-backed. Needed for the uncertainty/approximate-date patterns in "Signature NetPDBFF interaction principles," and generally useful for truncated-name-with-full-text-on-hover (see `docs/ui-vision.md`, multilingual principles) |
| `Dropdown` | Required in M5 | Headless-backed. Powers the user menu |
| `Avatar` | Required in M5 | Text-initial placeholder pattern; powers the user menu trigger |
| `Table` | Useful later | No dense tabular data exists in M5's scope; defined now since participation/publication lists will need it soon |
| `Pagination` | Useful later | No paginated list exists in M5's scope |
| `SearchInput` | Domain-specific and deferred | Search itself is explicitly out of scope past M5 (`docs/architecture.md`'s Search module) |
| `EmptyState` | Required in M5 | Powers the dashboard's "not yet connected" state and `/member`'s existing explanatory copy |
| `Skeleton` | Required in M5 | Establishes the loading-content pattern even though M5's own pages are simple enough to rarely need it |
| `Spinner` | Required in M5 | Short in-flight-action pattern, distinct from `SubmitButton`'s built-in pending state |
| `Toast` | Useful later — **formally deferred past M5.1, decision recorded below** | No M5 flow currently needs a transient notification outside a form's own inline messaging; defined for future async actions (e.g. a future save-outside-a-form action) |
| `PageHeader` | Required in M5 | Formalizes the repeated `<h1>` + description pattern on every M4 page |
| `SectionHeader` | Useful later | No M5 page is deep enough to need a sub-page section header yet |
| `Breadcrumbs` | Useful later | Defined structurally in the IA doc; no M5 route is deep enough to need it |
| `AppShell` | Required in M5 | The outer frame composing header + content + (future) footer for both public and authenticated contexts |
| `PublicHeader` | Required in M5 | Exists (M4); formalized into the token/component system, behavior unchanged (static, no session check) |
| `ProtectedHeader` | Required in M5 | Generalizes existing `ProtectedNav`; adds the user menu |
| `Sidebar` | Useful later | No M5 page has secondary/persistent navigation dense enough to need a sidebar; anticipated for a future member-area or admin shell |
| `MobileNavigation` | Required in M5 | New; see `docs/application-information-architecture.md` |

## Toast: formal deferral (recorded during M5.1)

M5.1 built every other primitive in the table above, including all six
Radix-backed components named in `docs/decisions/0003-...md`. `Toast` was
deliberately not built. This is a decision, not an omission — recorded here
per this document's own status as the source of truth for the component
family.

**Exact reason.** `Toast` is the one "useful later" primitive in this table
whose API shape was never actually settled anywhere in this document or the
M5 spec — every other deferred component (`Radio`, `Switch`, `Table`,
`Pagination`, `SectionHeader`, `Breadcrumbs`, `Sidebar`) has an obvious,
conventional shape implied by its own name and the one line of context
given. `Toast` does not: unlike `Dialog`/`Drawer`/`Tabs`/`Tooltip`/`Dropdown`,
it is not Radix-backed (ADR-0003 names exactly six Radix-backed components,
and `Toast` is not one of them — building it on Radix without a documented
tradeoff analysis would itself violate that ADR's stated boundary: "any
future addition to it should be a deliberate, similarly-justified decision,
not an assumption"). A hand-built `Toast` is also a materially different
kind of primitive from everything else in this milestone: every other new
component is either stateless/presentational or, at most, manages its own
local open/closed state (`Switch`, or Radix's own state for
`Dialog`/`Dropdown`/etc.). `Toast` additionally needs an imperative queue
(toasts are triggered from arbitrary call sites, not declared inline where
they render), a singleton portal-rendered viewport, and auto-dismiss timing
— none of which has a settled design in this document.

**Unresolved API/accessibility decisions**, listed so whoever builds this
next doesn't have to rediscover them:

- **Trigger API.** An imperative `toast.success("...")`-style function
  needs a `Provider`/context or a module-level singleton — which, and where
  is it mounted? No shell exists yet to mount it in (the same reason
  `TooltipProvider` isn't wired in either — see `Tooltip.tsx`'s file
  comment), so this can't even be prototyped against a real layout yet.
- **Queueing.** One toast at a time, replacing the previous, or a stacked
  list? If stacked, a cap on simultaneous toasts?
- **Auto-dismiss timing and control.** Default duration; whether hover/focus
  pauses the timer (WCAG 2.2.1 "Timing Adjustable" strongly favors this —
  content that disappears on a fixed timer with no way to extend it is a
  real accessibility risk, not a nice-to-have); whether `prefers-reduced-motion`
  should also imply "don't auto-dismiss," which is a different question
  from "don't animate."
- **`aria-live` region strategy.** A single persistent `aria-live="polite"`
  (or `"assertive"` for error-tone toasts) region that toast content is
  injected into, vs. each toast being its own `role="status"`/`role="alert"`
  element — these have different, well-known screen-reader announcement
  behaviors and the wrong choice is a real regression, not a style
  preference.
- **Relationship to `Alert`/`FormMessage`.** `Toast` should very likely
  reuse the same `--color-tone-*` token vocabulary `Alert`/`FormMessage`/
  `Badge` already share (consistent with this document's existing
  discipline) — but its dismissal/timing behavior is different enough from
  a static banner that it isn't just "Alert, positioned differently."

**Target future phase.** M5.2, at the earliest — specifically, whenever the
first real async, outside-a-form action that needs a transient notification
actually ships (the M5 spec's own reasoning for "useful later": "no M5 flow
currently needs" one). Building it speculatively now, ahead of a real
call site to validate the API against, is exactly the premature-generality
risk `docs/decisions/0007-...md`'s guardrails warn about.

These are **patterns and placeholders**, not features. Nothing described
in this section is implemented in M5 — no map, timeline, network graph,
publication list, or archival-source viewer exists yet, and none of the
domain data (participation, relationships, publications) is queried by
anything M5 builds. This section exists so that when those milestones
arrive, they inherit a considered visual language instead of inventing one
under deadline pressure, and so M5's own components (`Badge`, `Tooltip`,
`EmptyState`) are shaped with these future needs already in mind.

- **Provenance.** Every fact that later carries provenance
  (`docs/database-schema.md`'s Provenance Model — who submitted it, when,
  self-reported vs. third-party vs. imported) should eventually be
  presentable as a small, consistent disclosure next to the fact itself —
  not buried in a separate "history" page. Pattern: a `Tooltip` or small
  inline disclosure trigger next to the fact, not a wall of metadata
  displayed by default.
- **Verification status.** Rendered via the `status-*` semantic tokens
  above, always paired with a text label, never color alone. A
  `verified`/`confirmed` state should look calm and settled, not
  celebratory (no checkmark-in-a-starburst treatment) — this is a record
  of fact, not an achievement.
- **Uncertainty.** Genuinely unknown information is shown as absent
  (an `EmptyState`-style "not recorded" treatment), never as a blank cell
  that could be mistaken for an oversight. Approximate or partially-known
  information (see "Approximate dates" below) uses visibly distinct
  typography (e.g. "c. 1987" rendered with a clearly different, muted
  treatment from a confirmed exact date) rather than presenting a guess
  with the same visual confidence as a fact.
- **Disputed facts.** Use the `status-disputed` token, which is
  deliberately distinct from both "error" (danger) and "confirmed"
  (success) — a dispute is a legitimate, retained historical state, not a
  system failure. Disputed content should remain fully visible and
  legible (per `docs/database-schema.md`'s Deletion and Retention
  section: disputed information is not hidden or deleted), with a clear,
  non-alarming label explaining that it's contested.
- **Approximate dates and date ranges.** A consistent typographic
  convention for imprecision (e.g. "c. 1987," "1985–1990," "1985–?") is
  needed before any date-bearing feature ships, so every future feature
  doesn't invent its own notation. This connects directly to
  `docs/database-schema.md`'s open question about a `date_precision`
  indicator — the visual pattern and the data model should be decided
  together when that milestone arrives.
- **Historical change over time.** Where a fact has changed (a
  correction, per the Provenance Model's "Corrections" section), the
  interface should be able to show a simple timeline of prior states, not
  just silently overwrite — likely a variant of the same disclosure
  pattern used for provenance.
- **Institutional affiliations.** Always shown with enough context
  (institution name, role, date range) to be meaningful on its own, per
  `docs/ui-vision.md`'s "equal dignity across roles" principle — no
  institution or role rendered smaller/lower-emphasis purely because of
  perceived prestige.
- **Collaborative relationships.** The `person_relationships`
  origin/verification-status split (`docs/database-schema.md`) implies a
  future network view needs to distinguish, visually, an inferred
  connection from a confirmed one — likely a line-style or opacity
  distinction in a future `network` component family, not built in M5.
- **Contributions by technicians, field assistants, mateiros, drivers,
  administrators, and local or Indigenous collaborators.** This is a
  direct extension of `docs/ui-vision.md`'s core value: nothing in the
  design system — not size, not color, not placement, not a "featured
  contributor" pattern — should imply that a PI's contribution matters
  more than a mateiro's or a driver's. Every `pdbff_roles` value gets
  identical visual treatment; sort order in a list should default to
  something neutral (e.g. chronological or alphabetical), never an
  implicit prestige ranking.
- **Maps.** No mapping library or approach is chosen in M5. When a map
  ships (tied to `study_sites`), it needs an accessible non-visual
  equivalent (a structured list/table of the same sites), decided
  alongside the map itself, not bolted on afterward — see accessibility
  requirements above.
- **Timelines.** Likely the single most-used visualization, given how
  central time depth is to this platform's subject matter
  (`docs/ui-vision.md`). No component is built in M5; the token and
  typography groundwork (approximate-date convention, above) is the
  direct prerequisite.
- **Networks.** The `person_relationships` graph is the most visually and
  technically demanding future feature (`docs/architecture.md`'s Network
  visualization module). M5 does nothing here beyond ensuring the
  origin/verification-status tokens it defines are reusable by whatever
  graph-rendering approach a future milestone chooses.
- **Publications.** A future `person_publications` list needs the same
  origin/confirmation distinction as relationships
  (`inferred`/`confirmed`/`disputed`/`rejected` authorship, per
  `docs/database-schema.md`) — reuse the status token pattern rather than
  inventing a separate one for publications specifically.
- **Archival sources.** Scanned documents, photos, and recordings
  (`media_assets`) will need a viewer pattern distinct from a generic
  image — treated as an evidentiary object with its own caption,
  approximate date, and provenance, consistent with how "Imagery and
  iconography principles" in `docs/ui-vision.md` insists real historical
  photography be treated as archival material, not decoration.

## Production Experience Phase I — two canonical presentational primitives

Two primitives were added to make the completed engines read as one product
(presentation only; no new dependency, no second design language):

**`ReadingSpine` (`src/components/ui/ReadingSpine.tsx`).** The canonical
reading-spine rhythm. Every canonical reading page — Person, Institution,
Contribution — lays its sections out through this one primitive, so the vertical
rhythm from the identity band down through the documented engines is identical on
all three and a reader moving between records feels one continuous historical
narrative rather than a stack of separate modules. It is pure vertical rhythm: it
imposes no heading, card, border, or style, and it never flattens the sections it
holds (each engine keeps its own `<section>`, quiet heading, semantics, and
provenance). Consolidating the rhythm here means it can never drift between the
three pages.

**`ProvenanceAffordance` (`src/features/shared/ProvenanceAffordance.tsx`).** The
canonical provenance affordance — the calm, keyboard-operable "Source"
disclosure. Every engine reads provenance through this one presentation, so "how
do we know this?" looks and behaves identically platform-wide and cannot drift.
Each engine's `*Provenance` component is now a thin adapter that supplies only its
subject phrase and delegates here. It owns all presentation and interaction; the
full provenance is carried by the trigger's server-rendered accessible name
(never hover-only), and it presents — but never derives, reshapes, or moves — the
shared `describeProvenance` vocabulary. The optional `projectedFrom` prop carries
the Knowledge Network "projected from a <record>" phrasing. Both primitives are
guarded by `tests/unit/provenance-presentation-consistency.test.ts`.
