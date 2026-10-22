# 0005. No animation library for M5

Date: 2026-08-01
Status: Proposed

## Context

`docs/ui-vision.md`'s motion principles call for quiet, purposeful,
easily-reduced-motion transitions — state changes, not entertainment. M5's
actual motion needs are narrow: dialog/drawer enter-exit, dropdown/tooltip
open-close, mobile-navigation panel transitions, and simple hover/focus
micro-interactions. None of this requires orchestrated multi-step
animation, physics-based motion, gesture-driven interaction, or scroll-
linked effects.

## Decision

**Do not add an animation library for M5.** Use native CSS transitions
and Tailwind's built-in `transition`/`duration`/`ease` utilities, driven
by the motion tokens defined in `docs/design-system-architecture.md`, plus
CSS's `@media (prefers-reduced-motion: reduce)` to collapse or disable
them. The Radix primitives adopted per
`docs/decisions/0003-component-primitives-headless-for-complex-interactions.md`
already expose data attributes (`data-state="open"/"closed"`, etc.) that
CSS transitions can key off directly, so no JavaScript animation
orchestration is needed even for their enter/exit states.

## Alternatives considered

**Framer Motion (or Motion One).** The default reach for React animation,
and genuinely useful for the kind of complex, orchestrated motion a future
network-graph or timeline visualization
(`docs/design-system-architecture.md`'s Signature NetPDBFF interaction
principles) might eventually need. Rejected **for M5 specifically**
because nothing in this milestone's actual scope requires it — every
transition M5 needs is expressible as a CSS `transition` on a data-state
attribute. Adding a general-purpose animation runtime now, for
micro-interactions CSS already handles, would be exactly the kind of
unjustified dependency `CLAUDE.md` asks to avoid. This is not a permanent
rejection: if a future milestone (network visualization, timeline)
introduces motion genuinely too complex for CSS transitions, that
milestone should make its own documented case for a library at that point,
scoped to its actual need.

**CSS `View Transitions API`.** Considered as a possible future
enhancement for full-page or major-region transitions, but not adopted as
a requirement for M5 — browser support and interaction with Next.js's App
Router navigation model are still maturing, and none of M5's scope
depends on it. Nothing in this decision precludes adopting it later; it's
simply not needed now.

## Consequences

**Makes easier:** zero new dependency for motion; `prefers-reduced-motion`
handling is centralized in CSS rather than needing per-animation JS
logic; every transition is inspectable and overridable via ordinary
DevTools CSS panel, with no library-specific animation state to reason
about.

**Makes harder:** if a future milestone's needs turn out to be more
complex than expected earlier than anticipated, this decision will need
revisiting — but that's a cheap, contained addition at that point, not a
rearchitecture, since CSS-transition-based motion and a future animation
library can coexist (the library would be scoped to the specific new
feature that needs it).

## Risks

Low. The main risk is scope drift — a future contributor reaching for
"just add Framer Motion" for a micro-interaction CSS could handle, which
this ADR exists to push back on by requiring the same documented
justification any new dependency needs.
