# UI Vision

## Status

This document is product-design and architectural preparation for
**M5 — Application UI / Design System**. It defines intent — what
NetPDBFF should feel like and why — not implementation. No component, page,
or token in this document has been built. See `docs/m5-application-ui-design-system.md`
for the concrete, scoped milestone this vision feeds into, and
`docs/design-system-architecture.md` for the token/component system that
implements it.

NetPDBFF's identity below is deliberately specific and rooted in PDBFF —
that is not in tension with
`docs/decisions/0007-netpdbff-first-vertical-general-research-infrastructure.md`,
which treats this document's visual language as NetPDBFF's own product
skin, applied on top of domain-neutral architecture, not something the
reusable architecture itself depends on.

## What NetPDBFF should feel like

NetPDBFF is a record of a long-running scientific community, not a product
trying to acquire one. Most of the people it documents are not its users —
many are deceased, retired, or simply never online — and the platform
exists to keep their place in PDBFF's history legible to the people who
*are* here now. That single fact should shape every design decision more
than any visual trend: this is closer to a well-kept archive or a critical
edition of a long correspondence than it is to a social platform, a
directory, or a SaaS dashboard.

It should feel like opening a well-organized field station's records after
forty years of continuous work — not like landing on a startup's homepage.
Rigorous, legible, a little quiet. The interface's job is to get out of the
way of the people and the facts about them, and to be honest, visually,
about what is known, what is uncertain, and what is still missing.

## Relationship to Amazonian science, conservation history, and long-term field research

PDBFF is one of the longest-running ecological experiments in the world,
built on decades of physically demanding fieldwork in and around
fragmented forest reserves near Manaus — work that depended as much on
technicians, field assistants, drivers, and local guides (*mateiros*) as it
did on the researchers whose names ended up on papers. NetPDBFF's visual
language should carry the seriousness of that history without illustrating
it literally.

Concretely, this means:

- **No decorative rainforest imagery as branding.** No canopy photography
  as a hero background, no leaf motifs in the logo, no green gradients
  standing in for "environmental." If imagery of the forest or fieldwork
  ever appears, it should be documentary — real photographs from the
  project's actual history, credited and dated, treated as archival
  material, not as mood-setting decoration.
- **Time depth, made visible, not implied.** Four decades of participation
  is the platform's actual subject matter. The interface should be
  comfortable showing dates, ranges, gaps, and change over time as
  first-class content, not treat "when" as secondary metadata.
  `docs/database-schema.md`'s participation periods, `participation_roles`,
  and status models exist because this history is genuinely irregular —
  the UI should represent that irregularity honestly rather than smoothing
  it into a tidy, uniform grid.
- **Labor, not just authorship.** A field driver's contribution and a
  principal investigator's contribution should be presentable with equal
  visual dignity. Nothing in the interface should imply a role hierarchy
  that `pdbff_roles` itself doesn't have — see "Signature NetPDBFF
  interaction principles" in `docs/design-system-architecture.md`.
- **Rigor as an aesthetic, not just a policy.** Citations, provenance,
  verification status, and dates are core content, not fine print — closer
  to how a well-typeset critical edition or field notebook treats its own
  apparatus than how a marketing site treats a disclaimer.

## How NetPDBFF should differ from comparable products

| Product | What it optimizes for | Where NetPDBFF should differ |
|---|---|---|
| **ORCID** | A minimal, functional identifier registry | NetPDBFF is narrative and community-specific, not just a resolvable ID. It should read as a record *about* someone connected to a real, shared project — not a database row with a persistent identifier. |
| **ResearchGate** | Engagement, notifications, follower/metric-driven activity | NetPDBFF has no like counts, follower counts, "reads," recommendation feeds, or engagement nudges. Nothing in the design should create anxiety about visibility or activity. |
| **Wikidata** | Machine-legible facts at scale, structurally rigorous but visually utilitarian | NetPDBFF should keep Wikidata's honesty about provenance and uncertainty (see "Signature interaction principles") while being legible and warm to a non-technical visitor — a retired field assistant should be able to read their own entry comfortably. |
| **LinkedIn** | Personal branding, resume performance, professional growth signaling | NetPDBFF is not about self-promotion. No "profile strength" meters, no "who viewed you," no endorsement mechanics. It documents a shared collective history, not individual career marketing. |
| **Generic admin dashboards** | Data density, operational efficiency, enterprise-tool chrome | NetPDBFF must feel warmer and more editorial than a SaaS back office — dense where the content demands it, but never cold, never chrome-heavy for its own sake. |

## Design principles

1. **Legibility over decoration.** Every visual choice should make the
   underlying facts easier to read correctly, or it doesn't belong.
2. **Honesty about incompleteness.** Missing, approximate, disputed, or
   unverified information is common and expected in a historical record —
   the interface should represent that plainly, never paper over it with a
   confident-looking placeholder.
3. **Equal dignity across roles.** Visual weight follows content
   importance on a given page, never a person's institutional or academic
   status.
4. **Calm by default.** No urgency-manufacturing patterns (badges
   demanding attention, red dots, engagement loops). Verification-status
   color and iconography exist to inform, not to alarm.
5. **Consistent restraint.** A small, disciplined set of components and
   patterns, reused everywhere, rather than bespoke treatments per page —
   continuing the existing M4 convention of shared `FormField`/
   `FormMessage`/`SubmitButton` primitives rather than one-off styling.
6. **Progressive depth.** Simple at first glance, but able to hold real
   density — publication lists, participation histories, network
   connections — without the interface breaking down. See "Information
   density" below.
7. **Built to be translated.** English today, Portuguese by design
   (`docs/architecture.md`) — nothing in the visual system should assume
   English-length text or Latin-only names.

## Emotional tone

Scholarly, trustworthy, unhurried, and quietly warm. Not somber, not
corporate-cheerful, not celebratory. The closest reference points are a
well-run university archive's reading room, a respected scientific
journal's web presence, and a long-form investigative publication's
careful sourcing — rather than a research-tool startup or a
professional-networking product.

## Information density

NetPDBFF should default to **moderate-to-high density in content areas**
(participation histories, publication lists, network views) and **low
density in navigational and framing chrome** (headers, page titles,
primary navigation). This is the opposite of a typical marketing site
(sparse everywhere) and the opposite of a typical enterprise dashboard
(dense everywhere, including chrome). Concretely: generous whitespace
around section boundaries and headings, tight and information-rich inside
tables, lists, and record detail views. Progressive disclosure (expandable
sections, tabs, "show more") is preferred over either truncating
historical data or dumping all of it unstructured onto one screen.

## Typography philosophy

Two families, used with intent, not decoratively:

- A **clean, highly legible UI sans-serif** for interface chrome,
  navigation, labels, form fields, and data-dense tables — optimized for
  screen legibility at small sizes, wide language coverage (diacritics
  common in Portuguese and other names the platform will hold), and a
  restrained, non-trendy character.
- An optional **text serif for long-form reading content** (biographical
  narrative, oral-history transcripts, publication abstracts, if and when
  that content exists) — evoking the feel of a printed scholarly journal
  for the content that's genuinely meant to be *read*, not scanned.

M5 does not lock in specific typeface names as an architectural decision —
that is a concrete token choice made in `docs/design-system-architecture.md`
and implemented, not decided, in M5. The safe, zero-dependency default is
the system UI font stack (matching the current M4 pages, which load no
custom font at all); adding a licensed or hosted typeface is an available,
but not required, upgrade path. What *is* a principle here: whatever
typefaces are chosen must support full Latin Extended + Portuguese
diacritics, must remain legible at small sizes in dense tables, and must
never be swapped in a way that causes layout-shifting FOUT/FOIT on a
content-heavy page.

## Color philosophy

A restrained, mostly neutral palette — extending, not replacing, the
existing M4 neutral-gray-scale convention (`neutral-50`…`neutral-900`,
already used consistently across every current page and component) —
plus a small number of deliberately chosen accent and semantic colors,
never a "brand green" standing in for "environmental" or "conservation."

- **Base neutrals** carry almost all of the interface: backgrounds,
  borders, body text, secondary text. Warm-neutral rather than
  cold-clinical-gray, closer to paper and ink than to steel and glass.
- **One interactive accent color**, used consistently and sparingly for
  primary actions and links — not a "brand color" plastered everywhere,
  just a single reliable signal for "this is interactive."
- **Semantic status colors are meaning-first, not decoration-first** —
  mapped directly onto the controlled vocabularies already defined in
  `docs/database-schema.md` (person `verification_status`, relationship
  `verification_status`, publication/media review states), so a color
  always means the same specific thing everywhere it appears. See
  "Semantic color roles" in `docs/design-system-architecture.md`.
- **No color is the sole carrier of meaning.** Every status distinction
  also has a text label or shape/icon difference, for colorblind users and
  for print/grayscale contexts.

## Imagery and iconography principles

- No stock photography, no decorative illustration, no "hero" imagery on
  functional pages. If a landing page ever uses an image, it should be a
  real, credited, dated photograph from PDBFF's own history — treated as
  an archival object, with the same provenance discipline the data model
  requires of a `media_assets` row.
- Iconography is **functional, not decorative** — wayfinding, status, and
  action affordances only. A small, single-weight, consistent icon set
  (see `docs/decisions/0004-icon-library-lucide.md`), never mixed styles,
  never icons used purely to fill visual space.
- Avatars: for people without a photo (the overwhelming majority,
  especially for historical records), a calm, text-based placeholder
  (initials on a muted, deterministic-but-not-garish background) — never a
  generic silhouette that reads as "empty" or "missing," since for most of
  PDBFF's history a photo was never taken at all, not merely "not uploaded
  yet."

## Motion principles

Motion is used to clarify state changes (something opened, something
loaded, something moved), never to entertain or brand. Short durations,
simple easing, no bounce, no parallax, no scroll-triggered reveal
animations. Every motion respects `prefers-reduced-motion` by disabling or
substantially simplifying itself — this is a floor, not an enhancement to
consider later. See `docs/decisions/0005-no-animation-library-for-m5.md`
for why M5 achieves this without a new dependency.

## Responsive philosophy

Mobile is a first-class reading and task environment, not a cut-down
version of desktop. The correct response to less width is **progressive
disclosure and reflow**, not indiscriminate hiding of content — a
participant's dense publication list should become a scrollable, tappable
list on mobile, not disappear behind an unlabeled icon. Desktop is where
density and multi-column layouts (e.g., a sidebar plus content) are
appropriate; mobile collapses to a single, clearly ordered column with
navigation moved into an explicit, discoverable mobile pattern (see
"Mobile navigation" in `docs/application-information-architecture.md`).

## Accessibility principles

Accessibility is a floor established at the token and component level, not
a pass applied afterward. Concretely: WCAG 2.1 AA contrast as the minimum
acceptable, not an aspirational target; every interactive element
reachable and operable by keyboard alone, with a visible focus state
(already established in M4's `focus-visible:ring-2` convention); every
status, icon, and color-coded element has a text equivalent; every form
error is programmatically associated with its field (already established
by `FormField`'s `aria-describedby` pattern) and announced (`FormMessage`'s
existing `role="alert"`/`role="status"` pattern). Complex future
interactive views (maps, timelines, network graphs) must ship with a
structured, non-visual equivalent path to the same information, not just
an alt-text apology — see "Signature NetPDBFF interaction principles."

## Dark-mode philosophy

Dark mode is a first-class reading mode, not an inverted afterthought —
many people using this platform (researchers reviewing records at odd
hours, people abroad in different time zones) will genuinely prefer it,
not just tolerate it. It must meet the same contrast and legibility
standards as light mode, independently verified, not derived by
mechanically inverting light-mode values. M4 already establishes a
`dark:` Tailwind convention driven by `prefers-color-scheme`; M5's job is
to formalize that into a token-driven system and add an explicit,
user-controllable override — see
`docs/decisions/0002-theming-and-server-client-theme-handling.md`.

## Multilingual-readiness principles

English is the only implemented language today, but every visual decision
must tolerate Portuguese arriving later without a redesign
(`docs/architecture.md`). Concretely:

- No fixed-pixel-width text containers sized to English string lengths;
  Portuguese equivalents are frequently 15–30% longer.
- No text baked into images or icons.
- No truncation-by-default for personal or institutional names — long
  names (including compound Portuguese surnames and Indigenous names) must
  wrap or reflow rather than being clipped with an ellipsis as the default
  behavior; truncation with an accessible full-text alternative (e.g. a
  tooltip or expand action) is acceptable only where space is genuinely
  fixed, such as a dense table cell.
- No layout that assumes left-to-right is the only possibility forever —
  this is not an immediate requirement (Portuguese is also LTR), but
  logical CSS properties (`margin-inline-start` over `margin-left`, etc.)
  are the cheap, forward-compatible default worth adopting now rather than
  retrofitting later.
