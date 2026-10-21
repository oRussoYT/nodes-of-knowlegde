# 0012. Timeline Engine: canonical event model, temporal model, and the Many-Clocks read boundary

Date: 2026-08-03
Status: Accepted

## Context

Milestone M6.2 (Timeline Engine — the Historical Spine) is the second
production engine of the Digital Scientific Biography, following M6.1's
identity + narrative foundation (ADR-0011). It must render a real,
database-backed chronology of a person's life-in-knowledge — honestly,
provenance-aware, for an authenticated authorized reader — as the smallest
complete vertical slice that later extends unchanged to institutions,
projects, stations, expeditions, collections, records, and species.

The ratified constitutional documents
(`docs/nodes-of-knowledge-design-bible-volume-1.md`,
`docs/nodes-of-knowledge-product-blueprint.md`,
`docs/nodes-of-knowledge-constitutional-validation-m6v.md`) require that a
timeline be a *historical spine*, not an activity feed, a résumé, or a
decorative date list. History is partial and uncertain, so the model must
carry precision, approximation, uncertainty, intervals, open-endedness, and
outright unknown dates as first-class distinct states — never collapsing "we
don't know" into a fabricated exact date. Every event must be an assertion
carrying its own provenance and verification state (Blueprint's three atoms:
Entity, Assertion, Provenance). The engine must respect **CC1** (an Event is
not a Participation: a timeline event records that something happened at a
time, never bounded belonging/authorship/production/causation/ownership) and
**CC2** (knowledge-history, not a data repository).

M6.1 established the pattern this builds on: subject tables locked
deny-by-default (RLS on, no client GRANT/policy), read only through a
`SECURITY DEFINER` function returning a `jsonb` document, `EXECUTE` granted to
`authenticated` only. M6.2 must make several durable decisions not covered by
an existing ADR.

## Decision

**1. A canonical, subject-neutral event model — `public.events` — with the
temporal states modelled explicitly, not encoded in prose.** An event carries
`event_kind` (FK to a vocabulary table, below), `title`, `summary`, `place`,
and a structured temporal envelope: `start_date` + `start_precision`,
`end_date` + `end_precision` (`day`/`month`/`year`/`decade`),
`is_approximate` (circa), `is_ongoing` (open-ended / "– present"),
`date_is_unknown`, and `date_is_uncertain` (proposed, not yet confirmed). CHECK
constraints keep the nine temporal states coherent and mutually honest: a
date and its precision are present-or-absent together; an unknown date carries
no qualifiers and no value; an end requires a start and may not precede it; an
ongoing event requires an open start. The point is that *the database refuses
to hold a dishonest date* — precision, approximation, uncertainty, and absence
are separate columns because they are separate facts, and the read model and
UI render each distinctly (`c.`, en-dash intervals, "– present", "Date
unknown", certainty notes). This is the Many-Clocks temporal discipline made
into schema.

**2. Every event is a provenance-bearing assertion with a verification
state.** `events` carries `source_type`
(`self_reported`/`nominated_by_other`/`admin_entered`/`imported_historical`)
and `verification_status`
(`provisional`/`verified_self`/`verified_admin`/`disputed`) — the same
provenance/verification vocabulary M6.1 uses for identity and narrative — so a
timeline never presents a bare trusted fact and renders `provisional`/
`disputed` calmly rather than as an error.

**3. Event kinds are data, not a hardcoded enum — `public.event_kinds`.** A
lookup table (`key` PK, `label`, `description`, `sort_order`, `is_active`),
seeded with generic, subject-neutral kinds (appointment, arrival, departure,
fieldwork, expedition, project start/end, publication, contribution,
institutional milestone, site established, interview, award, retirement,
death, archival deposit, observation, other). This realizes the
"vocabularies are data, not code" rule (`docs/controlled-vocabularies.md`,
`CLAUDE.md`): kinds can be added/retired and eventually translated without a
code change, and no PDBFF-specific category, camp, project, or role is baked
into generic code (Node Independence). `events.event_kind` is an FK to it.

**4. The person↔event edge is a separate join — `public.person_events` —
never a foreign key on `events`.** An event exists independently of the
subject it is projected onto; `person_events (person_id, event_id, unique)` is
the projection edge. This is what lets the same `events`/`event_kinds` core
later serve institution/project/station/expedition/collection/record/species
timelines through sibling join tables and sibling read functions, with no
change to the event model — and it keeps the door open to one event appearing
on several subjects' timelines (a shared expedition) without duplication.

**5. A per-subject read model — `public.get_person_timeline(uuid)` — one
SECURITY DEFINER function per clock, not a monolithic timeline.** Following
ADR-0008/0009/0011 exactly: `events`/`person_events`/`event_kinds` stay fully
locked at the table level; the only new capability is `EXECUTE` granted to
`authenticated` (never `anon`/`PUBLIC`); the body requires `auth.uid()`, takes
no caller-identity input, pins `search_path`, schema-qualifies every
reference, and returns a `jsonb` document `{ person_id, events: [...] }`
ordered `start_date asc nulls last, created_at asc` (undated events sort last,
honestly). A **separate function per subject clock** (rather than one function
that fans across all subject types) is the Many-Clocks projection at the read
boundary: each clock is independently authorizable, testable, and cacheable,
and adding the institution clock later adds a function, it does not reshape
this one. Return type `jsonb` (validated in TypeScript by
`src/features/timeline/parse.ts`, fail-closed per event) keeps the read model a
single testable document rather than a row contract.

**6. `service_role` receives explicit table grants on the three new
tables — a deliberate, documented divergence from M6.1's `person_narrative`.**
`events`, `person_events`, and `event_kinds` are RLS-enabled with no client
GRANT/policy (deny-by-default, identical to `people`), so no client can read or
write them directly; the only client read path is `get_person_timeline`. In
addition they carry explicit `grant select, insert, update, delete ... to
service_role`, following the M3.1 finding that "BYPASSRLS is not enough —
service_role also needs explicit GRANTs." This is a conscious departure from
M6.1, where `person_narrative` was deliberately left without a service_role
grant. The grant exists so the trusted server-side path can *write* events
(there is no client event-authoring path in M6.2, exactly as narrative had
none), and so the Playwright suite can create and tear down per-test
disposable event fixtures through the service role rather than seeding shared
fixtures. It does **not** widen client access: `authenticated`/`anon` still
reach the data only through the locked read function. This divergence is
flagged explicitly for review.

## Alternatives considered

**Collapse precision/approximation/uncertainty/unknown into one nullable date
or a free-text date string.** Rejected: it is exactly the "decorative date
list" the constitution forbids and it makes the database hold dishonest
history ("1887" indistinguishable from "circa 1887" from "sometime in the
1880s" from "date unknown"). Separate columns + CHECK constraints keep each
state a distinct, enforceable fact.

**A hardcoded `event_kind` enum (Postgres `enum` or a CHECK list).** Rejected:
violates "vocabularies are data, not code"; retiring/adding/translating a kind
would need a migration and deploy, and it invites PDBFF-specific kinds into
generic code.

**A `person_id` FK directly on `events`.** Rejected: it welds an event to one
subject and one subject type, blocking the later institution/project/expedition
clocks and shared events. The `person_events` join keeps `events` subject-
neutral (CC1-clean: the event is not "owned").

**One monolithic timeline read function across all subject types.** Rejected:
it couples every future clock's authorization and shape into one function and
one cache key; a function per clock is the Many-Clocks projection and matches
the established per-capability `SECURITY DEFINER` pattern.

**A GRANT SELECT + RLS policy on `events` for the client.** Rejected for the
ADR-0008 reason: a client GRANT is an over-readable table-level privilege; a
function's return type is an enforced, provenance-shaped contract. The tables
stay locked.

## Consequences

**Makes easier:** a real, provenance-bearing, honestly-uncertain chronology
ships on the established locked-table + `SECURITY DEFINER` pattern; the event
core is subject-neutral, so later engines (institution/project/station/
expedition/collection/record/species timelines) attach via sibling join tables
and sibling read functions without touching the event model or temporal model;
the whole slice is testable end to end (pgTAP at the DB boundary for
constraints/authorization/content, Vitest for temporal/derive/parse/copy,
Playwright for the reading flow, states, provenance, responsive, themes,
keyboard, axe).

**Makes harder:** events are service-role/admin-authored with no client
editorial workflow yet (deferred by design, exactly like narrative in M6.1);
the `service_role` grant on the new tables is a broader surface than
`person_narrative`'s and is called out for review; a general Participation
model is explicitly **not** built here (only the CC1-respecting extension
points), so belonging/roles remain future work.

## Relationship to other records

Extends the read-access pattern of
`docs/decisions/0008-claim-discovery-security-definer-function.md`,
`docs/decisions/0009-reviewer-authorization-table.md`, and
`docs/decisions/0011-scientific-biography-read-model.md` to a second engine.
Implements the Entity/Assertion/Provenance atoms and the Many-Clocks temporal
discipline of `docs/nodes-of-knowledge-product-blueprint.md` and
`docs/nodes-of-knowledge-design-bible-volume-1.md`, within the boundary set by
`docs/nodes-of-knowledge-constitutional-validation-m6v.md`. Realizes the
data-not-code rule of `docs/controlled-vocabularies.md` via `event_kinds`.
Respects **CC1** (an Event is not a Participation — no belonging/authorship/
ownership is modelled) and **CC2** (no dataset/repository behavior). See the
implementation summary in `docs/m6.2-timeline-engine.md`.
