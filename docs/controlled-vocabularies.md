# Controlled Vocabularies

## Status

This document explains how controlled vocabularies are managed. The first
database-backed vocabulary table — `public.event_kinds` (M6.2 Timeline Engine)
— now realizes the approach described here; the rest of this document remains
the statement of approach for the vocabularies still ahead.

## What a controlled vocabulary is, here

A controlled vocabulary is a constrained, curated list of values used
consistently across the platform instead of free text — for example (not
final, illustrative only):

- Participation roles (e.g. researcher, field assistant, student, staff)
- Institution types (e.g. university, government agency, NGO)
- Relationship types (e.g. collaborator, mentor, co-author)
- Nomination/verification statuses (e.g. provisional, verified)
- Visibility levels (see `docs/privacy-model.md`)

## Rule: vocabularies are data, not code

Per `CLAUDE.md`, controlled vocabularies must not be hard-coded inside
interface components (e.g. as inline arrays of strings in a `<select>`).
They are expected to be stored and managed as data — ultimately as
database-backed reference tables, accessed through shared code in
`src/lib` — so that:

- Adding or retiring a value doesn't require a code change and deploy.
- The same vocabulary is enforced consistently across every feature that
  uses it, instead of drifting between components.
- Values can carry metadata (e.g. a Portuguese translation, a
  description, an active/retired flag) without touching UI code.

## Relationship to internationalization

Because vocabularies will need Portuguese translations eventually
(`docs/architecture.md`), storing them as data rather than embedding them
in components also keeps translation a data-layer concern rather than a
component-rewrite concern.

## What's deferred

The actual set of vocabularies, their storage schema, and an
administration interface for managing them are future work, sequenced in
`docs/development-roadmap.md`.

## First realization: `event_kinds` (M6.2)

The Timeline Engine's `public.event_kinds` table (see
`docs/database-implementation.md` and `docs/decisions/0012-timeline-engine.md`)
is the first controlled vocabulary implemented as data rather than code: a
lookup table (`key`, `label`, `description`, `sort_order`, `is_active`) that
`events.event_kind` references by foreign key, seeded with generic,
Node-neutral kinds. Kinds can be added, retired, or eventually translated
without a code change, and no PDBFF-specific category is embedded in interface
components — exactly the discipline this document describes. It is the template
for the participation-role, institution-type, and relationship-type
vocabularies still to come.

## Second realization: `participation_capacities` (M6.3)

The Participation Engine's `public.participation_capacities` table (see
`docs/database-implementation.md` and
`docs/decisions/0013-participation-engine.md`) is the second controlled
vocabulary implemented as data: a lookup table referenced by
`participations.capacity`, seeded with generic, Node-neutral capacities. It is
exactly the participation-role vocabulary anticipated above — and it is where a
Node adds its own capacities (for example a PDBFF *mateiro*) as data, with no
code change and no PDBFF-specific value hardcoded in generic code.

## Third realization: `relationship_kinds` (M6.4)

The Relationship Engine's `public.relationship_kinds` table (see
`docs/database-implementation.md` and
`docs/decisions/0014-relationship-engine.md`) is the third controlled
vocabulary implemented as data. Beyond a key and label, each kind carries
directionality (`is_directional`) and the role each end of the bond plays, in
singular and plural (`source_role_label(_plural)`, `target_role_label(_plural)`)
— the data that lets one canonical relationship record read with correct
inverse labels on both entities' pages. It is the relationship-type vocabulary
anticipated above, and it is where a Node adds its own kinds as data; family and
other ethically-sensitive kinds are deferred pending governance, not hardcoded.

## Fourth realization: `organization_types` (M6.5)

The Institution Engine's `public.organization_types` table (see
`docs/database-implementation.md` and
`docs/decisions/0015-institution-engine.md`) is the fourth controlled vocabulary
implemented as data — the institution-type taxonomy referenced by
`organizations.organization_type`, seeded with generic, Node-neutral types (not
all institutions resemble universities or NGOs). M6.5 also introduces several
small FIXED-state vocabularies as CHECK constraints rather than tables —
institution `status`, historical-name `name_type`, external-identifier `scheme`,
and narrative `kind` — following the established distinction: open domain
taxonomies are lookup tables (`event_kinds`, `participation_capacities`,
`relationship_kinds`, `organization_types`), while small stable state sets are
CHECKs (like `source_type`/`verification_status`).

## Fifth realization: `contribution_kinds` and `contribution_capacities` (M6.6)

The Contribution Engine introduces the fifth and sixth controlled vocabularies
implemented as data (see `docs/database-implementation.md` and
`docs/decisions/0016-contribution-engine.md`), and crucially keeps them on two
distinct axes. `public.contribution_kinds` (referenced by
`contributions.contribution_kind`) names the *kind* of historical object
contributed — empirical observation, field knowledge, long-term monitoring,
archival preservation, training, local/Indigenous knowledge, and so on (28
seeded, Node-neutral). `public.contribution_capacities` (referenced by
`person_contributions.capacity` and `organization_contributions.capacity`) names
the *capacity* in which a particular contributor helped — field observation,
coordination, funding, institutional support, custodianship, and so on (18
seeded). Neither reproduces CRediT or a publication/authorship taxonomy:
"author" is not a kind, "mentorship" is an M6.4 Relationship (not a kind), and
"funding"/"hosting" are capacities (not kinds and not ownership). Both are
lookup tables a Node extends as data. M6.6 also adds one small FIXED-state
vocabulary as a CHECK rather than a table — contribution-narrative `kind`
(`overview` / `context` / `significance` / `legacy`) — following the established
distinction: open domain taxonomies are lookup tables (`event_kinds`,
`participation_capacities`, `relationship_kinds`, `organization_types`,
`contribution_kinds`, `contribution_capacities`), while small stable state sets
are CHECKs (like `source_type` / `verification_status` and narrative `kind`). A
contribution↔event relation vocabulary is deliberately deferred rather than
guessed at.

## organization_relationship_kinds (M7)

Institution-to-institution relationship kinds — data-backed and Node-neutral — each with key, label, directionality, source/target role labels (singular + plural, for inverse display on both institutions' pages), description, sort order, and `is_active`. Founding kinds: `succession` (Predecessor → Successor), `parent_body` (Parent body → Subordinate body), `administration` (Administering body → Administered body), `hosting` (Host → Hosted body), `merger` (Antecedent body → Merged-successor body), `affiliation` (symmetric), `partnership` (symmetric), `joint_operation` (symmetric), `other` (symmetric). A Node adds its own kinds as rows, never as code. Migration, TypeScript copy, tests, and this document are kept consistent.
