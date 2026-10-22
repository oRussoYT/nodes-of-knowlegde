# 0013. Participation Engine: bounded belonging, the minimal organization entity, and the shared temporal/provenance kernel

Date: 2026-08-03
Status: Accepted

## Context

Milestone M6.3 (Participation Engine) turns the second constitutional
primitive of Nodes of Knowledge into software, after the Timeline (M6.2,
ADR-0012). It must let an authenticated authorized reader of a Scientific
Biography see, honestly and provenance-aware, WHERE a person belonged, in WHAT
capacity, during WHAT period, under WHAT evidence, with WHAT verification --
as the smallest complete vertical slice that later extends unchanged to any
Node and any entity.

The ratified documents govern this precisely. **Constitutional Clarification
CC1** holds that Participation is bounded belonging through time and is *not*
authorship, ownership, provenance, causation, or relationship. The Design
Bible and Product Blueprint require it to preserve institutional *memory*, not
administrative structure -- it must read as history, not as an HR record or an
org chart. The Many-Clocks discipline and the provenance-first philosophy
(already realized for the Timeline) apply unchanged: approximate belonging
stays approximate, unknown stays unknown, and nothing fabricates certainty.
Node Independence requires the same engine to serve PDBFF, Cocha Cashu,
Mamirauá, the Smithsonian, Goeldi, Harvard, and Nodes not yet imagined, with
only data, vocabulary, governance, identity, and history differing.

M6.2 established the pattern this builds on: subject tables locked
deny-by-default (RLS on, no client GRANT/policy), read only through a
`SECURITY DEFINER` function returning a `jsonb` document, `EXECUTE` to
`authenticated` only; a data-backed generic vocabulary (`event_kinds`); and a
durable temporal model. M6.3 makes several durable decisions not covered by an
existing ADR.

## Decision

**1. Model Participation as bounded belonging: `public.participations` =
person + organization + capacity + a dated period + its own provenance and
verification.** A participation asserts that a person belonged to an
organization, in a capacity, during a period. It carries no authorship,
ownership, causation, or interpersonal-relationship semantics (CC1) -- a
person "joining an institution" may *also* produce an arrival/appointment
event on their timeline (M6.2), but the enduring belonging is recorded here,
separately. Every participation is an Assertion carrying `source_type` +
`verification_status`; a participation row never implies truth, and
`provisional`/`disputed` render calmly.

**2. Add a minimal belonging-target entity, `public.organizations` (identity
only) -- deliberately NOT the Institution Engine.** Participation needs a
"where," and a "where" must be an entity, not free text (free text would make
one institution inconsistent across people and violate Node Independence).
`organizations` holds identity only (`name`, `short_name`); organization
timelines, hierarchy, provenance, enrichment, and an institution read
experience are all **deferred** to the Institution Engine. This is the same
move M6.1 made with `person_narrative`: the smallest durable foundation that
makes the current slice honest, not a pre-built future engine. The *provenance*
that matters at this milestone is the participation's (the assertion that the
belonging happened), which is fully modelled.

**3. Capacities are data, not a hardcoded enum: `public.participation_
capacities`.** A lookup table (`key` PK, `label`, `description`, `sort_order`,
`is_active`) seeded with generic, Node-neutral capacities (researcher,
principal investigator, director, coordinator, technician, field assistant,
student, collaborator, volunteer, visiting researcher, staff, intern, other).
Every role in the brief maps onto one of these or is added by a Node as DATA --
a PDBFF *mateiro*, for example, is a row that Node adds, never a value
hardcoded in generic code (`docs/controlled-vocabularies.md`, CLAUDE.md, Node
Independence). "Institutional / temporary / historical / concurrent
appointments" are not capacities: they are properties of the temporal model
and of holding *multiple* participations, handled by (4) and the temporal
model.

**4. No uniqueness constraint on `participations`: many belongings at one
organization are first-class.** A person may hold sequential stints and
CONCURRENT appointments at the same organization, and may belong to several
organizations at once. CLAUDE.md is explicit: "never model participation as a
single date range or a single role." The schema therefore places no
`unique(person_id, organization_id, ...)` constraint; each belonging is its own
row.

**5. A per-subject read model, `public.get_person_participation(uuid)` -- one
SECURITY DEFINER function per clock, not a monolith.** Exactly the
ADR-0008/0009/0011/0012 pattern: `participations`/`organizations`/
`participation_capacities` stay fully locked; the only new capability is
`EXECUTE` to `authenticated`; the body requires `auth.uid()`, pins
`search_path`, schema-qualifies everything, and returns a `jsonb` document
`{ person_id, participations: [...] }` with organization and capacity resolved
from their vocabularies, ordered `start_date asc nulls last, created_at asc`
(undated last, honestly). Grouping for presentation is the client's job, so
the read model stays a flat, ordered, testable document; a future
`get_organization_participation` (a roster) is a sibling function, not a
reshape of this one.

**6. Extract the temporal and provenance kernels to `src/features/shared`;
Participation and Timeline share ONE of each.** The Many-Clocks temporal model
and the provenance/verification vocabulary are constitutional and cross-engine.
Rather than duplicate M6.2's temporal formatter and provenance labels into
Participation (a parallel architecture, which the milestone brief forbids),
they are extracted to `src/features/shared/temporal.ts` and
`src/features/shared/provenance.ts`. The Timeline now re-exports them under its
historical names (`EventTemporal`, `describeEventProvenance`, ...) via
behavior-preserving shims, so M6.2's public surface and every M6.2 test are
unchanged, while a date and a provenance label are read, written, and rendered
identically across engines. This makes the next engine smaller, not larger.

**7. Present Participation grouped by ORGANIZATION (a map of belonging),
distinct from the Timeline's grouping by decade (a spine through time).** The
read model returns a chronological flat list; `derive.ts` groups it by
organization, ordering affiliation groups by earliest involvement (the flat
order makes first-encounter equal earliest, so grouping is historical, not
alphabetical). This is what makes the two engines read differently on one page
-- "what happened, when" versus "where and how did this person belong" -- as
the brief requires.

**8. `service_role` receives explicit table grants on the three new tables**
(`participations`, `organizations`, `participation_capacities`), following
M6.2/ADR-0012 and the M3.1 finding ("BYPASSRLS is not enough"). The tables stay
RLS-enabled deny-by-default with no client GRANT/policy -- client read access
is only through `get_person_participation`. The grant enables the trusted
server-side write path (there is no client participation-authoring path in
M6.3) and per-test disposable Playwright fixtures.

## Alternatives considered

**Store the organization as free text on the participation.** Rejected: it
makes one institution inconsistent across people, blocks the later Institution
Engine, and is not Node-neutral (a "where" is an entity). The minimal
`organizations` table is the honest floor.

**Build the Institution Engine now (organization timelines, hierarchy,
provenance).** Rejected/deferred: it is a later engine; M6.3 needs only the
belonging target. `organizations` reserves the extension point without
pre-deciding it.

**A hardcoded capacity enum.** Rejected: violates "vocabularies are data, not
code"; a Node could not add a *mateiro* without a migration, and PDBFF-specific
capacities would leak into generic code.

**A `unique(person_id, organization_id, capacity)` constraint.** Rejected: it
would forbid concurrent and repeated appointments, exactly what CLAUDE.md says
never to do.

**Fold participation into the Timeline (a participation as a special event).**
Rejected: CC1 keeps Event and Participation distinct; an event is a point/of
history, a participation is enduring belonging. Sharing the temporal kernel
gives consistency without conflating the two models.

**Duplicate M6.2's temporal formatter into Participation.** Rejected: a
parallel architecture and two sources of truth for constitutional temporal
semantics. The shared kernel (decision 6) is the intended architecture.

**One monolithic read function across all subjects.** Rejected for the
ADR-0012 reason: a function per clock is the Many-Clocks projection and keeps
each authorizable and cacheable independently.

## Consequences

**Makes easier:** a real, provenance-bearing, honestly-uncertain record of
belonging ships on the established locked-table + `SECURITY DEFINER` pattern;
the temporal and provenance kernels are now shared, so every later engine dates
and provenances assertions identically with no new code; the Institution Engine
attaches to `organizations` and a sibling roster read function without
reshaping this slice; the whole slice is testable end to end (pgTAP, Vitest,
Playwright).

**Makes harder:** participations are service-role/admin-authored with no client
editorial workflow yet (deferred by design, as narrative and events were);
`organizations` is intentionally thin, so anything about an institution beyond
its name waits for the Institution Engine; the `service_role` grant on the new
tables is called out for review, as in ADR-0012.

## Relationship to other records

Extends the read-access pattern of ADR-0008/0009/0011/0012 to a second engine,
and the data-not-code vocabulary rule (`docs/controlled-vocabularies.md`) with
`participation_capacities`. Implements the Participation primitive of
`docs/nodes-of-knowledge-product-blueprint.md` under CC1, within the boundary
set by `docs/nodes-of-knowledge-constitutional-validation-m6v.md`. Shares the
Many-Clocks temporal kernel first built for
`docs/decisions/0012-timeline-engine.md`. Respects **CC1** (Participation is
bounded belonging, not authorship/ownership/provenance/causation/relationship)
and **CC2** (no dataset/repository behavior). See the implementation summary in
`docs/m6.3-participation-engine.md`.
