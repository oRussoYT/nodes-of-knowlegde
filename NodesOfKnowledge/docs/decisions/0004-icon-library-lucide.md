# 0004. Icon library choice: Lucide

Date: 2026-08-01
Status: Proposed

## Context

`docs/ui-vision.md` requires functional, single-weight, non-decorative
iconography — wayfinding and status only, never filler. M5 needs icons for
at least: the mobile-navigation trigger, the user-menu trigger/chevrons,
dialog/drawer close controls, form-field status indicators, and (per
`docs/design-system-architecture.md`'s Signature NetPDBFF interaction
principles) eventual disclosure/provenance affordances. No icon exists
anywhere in the codebase today — every current visual affordance is text
or a simple shape (`·` separator, `>` implied by link underline).

## Decision

Adopt **Lucide** (`lucide-react`) as the single icon library, imported
per-icon (`import { ChevronDown } from "lucide-react"`), never a bulk
import.

## Alternatives considered

**Heroicons** (Tailwind Labs' own icon set). A very close alternative —
also single-weight-friendly (outline variant), MIT-licensed, and a natural
pairing with Tailwind. Not chosen primarily because of coverage: Heroicons
is a deliberately smaller, more curated set, while Lucide's larger library
(1000+ icons, actively community-maintained as a fork of Feather Icons)
is more likely to already have the specific icons future domain features
will need (map pins, network/graph glyphs, document/archive icons for
`media_assets`, timeline glyphs) without this project needing to source
one-off SVGs later. If a future contributor prefers Heroicons' slightly
more geometric style, revisiting this decision is a contained,
low-consequence swap — nothing in the design-token or component
architecture depends on which icon set is chosen, only that exactly one
is.

**Hand-drawn/inline SVG only, no library.** Rejected: while consistent
with the zero-dependency posture elsewhere in this project, hand-sourcing
and maintaining even a small icon set (correct viewBox, consistent stroke
width, accessible `<title>`/`aria-hidden` handling per icon) is real,
ongoing work that a well-maintained library already does correctly and
consistently. Icons are a case, like the Radix decision
(`docs/decisions/0003-...md`), where the ecosystem solving a narrow
problem well outweighs the cost of one small dependency.

**Font Awesome or a similarly broad, multi-style icon set** (solid,
regular, light, duotone, brand icons). Rejected: multiple visual weights
invite exactly the "mixed icon styles" `docs/ui-vision.md` warns against,
much of the set (brand logos, decorative glyphs) is irrelevant to this
project, and its free tier has historically been more restrictive about
tree-shaking/self-hosting than Lucide or Heroicons.

## Consequences

**Makes easier:** consistent, single-weight iconography across every
future feature without needing to source new icons piecemeal;
tree-shaking means bundle cost scales with icons actually used, not the
library's full size; wide existing familiarity lowers the learning curve
for future contributors.

**Makes harder:** one more dependency to keep updated; a large icon set
is a mild temptation toward over-using icons where text would serve
`docs/ui-vision.md`'s restraint principle better — this is a discipline
question for implementation and review, not something the library choice
itself solves.

## Risks

None specific to this choice beyond ordinary dependency maintenance;
low-risk, easily reversible if a future need (e.g. a domain-specific icon
Lucide doesn't have) requires supplementing it with a hand-drawn SVG for
that one case — which is expected and fine, not a reason to avoid a
library for the other 99% of needs.
