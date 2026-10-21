# 0003. Component-library strategy: headless primitives for complex interactions only

Date: 2026-08-01
Status: Proposed

## Context

M5 needs roughly three dozen components (`docs/design-system-architecture.md`).
Most are simple, presentational, and already have a working M4 precedent
(`FormField`, `FormMessage`, `SubmitButton` — plain Tailwind, no
dependency). A smaller subset — `Dialog`, `Drawer`, `Tabs`, `Accordion`,
`Tooltip`, `Dropdown` — are genuinely hard to build correctly from
scratch: focus trapping, focus return, portal rendering, `Escape`
handling, roving `tabindex`, correct ARIA roles/states, and
screen-reader-announced open/close behavior are all easy to get subtly
wrong, and subtly wrong accessibility behavior is worse than no component
at all for a platform whose own accessibility principles
(`docs/ui-vision.md`, `docs/design-system-architecture.md`) are explicit,
not aspirational.

The repository currently has zero UI dependencies. `CLAUDE.md` requires
explaining any new dependency's purpose, and the milestone brief
explicitly warns against adopting "a large third-party component framework
without a documented tradeoff analysis." This ADR is that analysis.

## Decision

**Hand-build every simple, presentational component** (`Button`, `Link`,
`Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`, `Card`,
`Badge`, `Alert`, `Avatar`, `Table`, `Pagination`, `SearchInput`,
`EmptyState`, `Skeleton`, `Spinner`, `PageHeader`, `SectionHeader`,
`Breadcrumbs`) with plain Tailwind, exactly as M4's existing components
already do. No dependency for these.

**Use Radix UI primitives (`@radix-ui/react-*`) as the unstyled behavior
layer for the small set of genuinely complex interactive components**:
`Dialog`, `Drawer` (built on Radix's `Dialog` primitive, presented as a
side-anchored variant), `Tabs`, `Accordion`, `Tooltip`, and `Dropdown`
(built on Radix's `DropdownMenu` primitive). Each is installed as its own
small, individual package (e.g. `@radix-ui/react-dialog`,
`@radix-ui/react-tabs`) — not a single bundled framework dependency — and
every pixel of visual styling is this project's own Tailwind classes on
top of Radix's unstyled behavior. Radix ships no CSS and no visual
opinions; adopting it changes nothing about `docs/ui-vision.md`'s visual
language.

## Alternatives considered

**Hand-build everything, including the complex primitives.** The
zero-dependency-purist option, and the one most consistent with this
repository's history so far. Rejected because the accessibility bar this
project holds itself to is real, not decorative — a hand-rolled dialog
that traps focus incorrectly or a dropdown menu missing correct ARIA
states would be a genuine regression against `docs/design-system-architecture.md`'s
accessibility requirements, and getting these six components right from
scratch is a substantial, easy-to-underestimate engineering investment for
something the ecosystem has already solved correctly and left unstyled.
This is judged the one category of UI problem where "write it ourselves"
costs more in risk than it saves in dependency count.

**Adopt a full styled component library or design-system framework**
(shadcn/ui as a wholesale starting point, Chakra UI, Mantine, MUI, Ant
Design, etc.). Rejected outright, and this is the choice the milestone
brief specifically warned against. These bring their own visual opinions
(spacing, typography, elevation, motion) that would have to be fought or
overridden to match `docs/ui-vision.md`'s restrained, non-generic
aesthetic; most are large dependencies covering far more surface area
than this project needs (form frameworks, theming engines, icon sets of
their own); and several (Chakra, MUI, Ant) ship substantial runtime CSS-
in-JS or global style injection that conflicts with this project's
Tailwind-only, mostly-Server-Component approach. shadcn/ui specifically is
closer in spirit (it's Radix + Tailwind, copy-pasted into the consuming
repo rather than installed as a package) — but its generated component
shapes and default styling still encode opinions this project would
immediately override, and copy-pasting generator output makes the
`Radix`-adoption decision implicitly rather than explicitly. This ADR
reaches a similar technical destination (Radix underneath, Tailwind on
top) by choosing that combination directly and deliberately, rather than
inheriting it from a generator.

**A different headless library** (Headless UI, Ariakit, React Aria).
Reasonable alternatives with similar goals. Radix is chosen for: coverage
of exactly the six components needed here without extra surface area,
maturity and wide adoption (lower long-term maintenance risk), and
per-primitive package granularity (installing only what's used, not an
umbrella package) — but this is a closer call than the two rejections
above, and revisiting it in favor of React Aria (Adobe's primitive set,
notably strong accessibility engineering) is reasonable if implementation
reveals a specific Radix limitation.

## Consequences

**Makes easier:** correct accessibility behavior for the hardest
components, "for free," reviewed and maintained by a team whose sole focus
is exactly this problem; faster implementation of `Dialog`/`Tabs`/
`Dropdown`/`Tooltip`/`Accordion`/`Drawer` than building and testing focus-
trap and ARIA logic from scratch; a clear, principled line for future
contributors deciding "do I hand-build this or reach for a primitive" —
simple and presentational vs. complex and interactive.

**Makes harder:** introduces this project's first non-Supabase runtime
dependencies, each needing the same "explain its purpose" discipline
`CLAUDE.md` requires; six small packages to keep updated instead of zero;
a learning curve for contributors unfamiliar with Radix's composition
pattern (though it matches the compound-component approach
`docs/design-system-architecture.md` already specifies independently of
this choice).

## Risks

Scope discipline is the main risk: this decision is easy to
over-generalize into "just use Radix for everything," which would
reintroduce the "large third-party framework" problem this ADR was
written to avoid. The six-component list above is the actual scope — any
future addition to it should be a deliberate, similarly-justified decision,
not an assumption.
