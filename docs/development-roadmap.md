# Development Roadmap

> **HISTÓRICO — não é mais o plano.** O plano vigente é `docs/ROTEIRO.md`
> (13 out 2026). Este arquivo fica só como registro de agosto de 2026.

## Status

Phased plan at a conceptual level. Phases are sequential in intent but
scope and order may shift as design work in each area proceeds. Nothing
beyond Phase 0 is implemented yet.

## Phase 0 — Project foundation (this work)

Next.js + TypeScript + Tailwind + ESLint setup, initial source structure,
documentation set, and a minimal landing page. No authentication,
database, or product features.

## Phase 1 — Authentication and core people data

Supabase integration, authenticated user accounts, PostgreSQL migrations
introducing the initial person model (distinct from accounts), and basic
Row Level Security policies.

## Phase 2 — Profiles, participation history, and institutions

Person profiles (claimed and unclaimed), PDBFF participation periods,
career history, and institution records.

## Phase 3 — Nominations and relationships

Person nominations (adding people who haven't registered), person-to-
person relationships with inferred vs. confirmed status, and the
verification workflows that connect to `docs/privacy-model.md`.

## Phase 4 — Projects, publications, and oral histories

Research project records, publication records linked to people/projects,
and oral history documentation.

## Phase 5 — Forum

Member discussion space, scoped to registered/verified members per
`docs/user-roles.md`.

## Phase 6 — Search and network visualization

Cross-entity search and interactive visualization of the person/
institution/project network.

## Phase 7 — Analytics and administration

Aggregate, non-personal analytics, and administrative tooling for
moderation, verification, and auditable data management.

## Phase 8 — Portuguese internationalization

Introduction of a translation layer and Portuguese as a second interface
language, building on the i18n-readiness described in
`docs/architecture.md`.

## Ongoing, throughout every phase

- Tests accompanying each new feature (per `CLAUDE.md`).
- Accessibility and responsiveness review.
- Architecture decision records for significant choices (`docs/decisions/`).

## Milestone status — M6.1 (Scientific Biography Foundation)

**Implemented (pending local validation).** M6 begins turning the M1–M5
application foundation into institutional memory. M6.1 delivers the first
production, database-backed vertical slice of the Digital Scientific
Biography: the `person_narrative` assertion, the `get_person_biography`
canonical read model, and the authenticated `/people/[personId]` read
experience (identity, introductory narrative or honest absence, provenance
surface, reserved section architecture), with pgTAP/Vitest/Playwright
coverage. See `docs/m6.1-scientific-biography-foundation.md` and
`docs/decisions/0011-scientific-biography-read-model.md`. The Timeline,
Participation, Relationship, Institution, Historical Records, and Legacy
engines are deferred to later M6 milestones and reserved as extension points.

## Milestone status — M6.2 (Timeline Engine: the Historical Spine)

**Implemented (pending local validation).** M6.2 delivers the second
production engine of the Digital Scientific Biography: the historical spine.
It adds the subject-neutral event model (`events`), the event-kinds
vocabulary table (`event_kinds`), the person↔event projection edge
(`person_events`), and the `get_person_timeline` canonical read model, then
renders a calm, provenance-aware, honestly-uncertain chronology inside the
`/people/[personId]` biography — replacing the M6.1 reserved Timeline
placeholder with the real engine. The nine-state temporal model keeps
precision, approximation, uncertainty, intervals, open-endedness, and unknown
dates distinct; decade period navigation appears only when the record spans
two or more decades. pgTAP/Vitest/Playwright coverage accompanies it. See
`docs/m6.2-timeline-engine.md` and
`docs/decisions/0012-timeline-engine.md`. The event core is architected so the
same model later serves institution/project/station/expedition/collection/
record/species clocks unchanged; the Participation, Relationship, Institution,
and Legacy engines remain deferred and reserved as extension points.

## Milestone status — M6.4 (Relationship Engine: relationships as historical narratives)

**Implemented (pending local validation).** M6.4 turns the fourth
constitutional primitive into software: historically meaningful bonds between
entities. It adds the relationship-kind vocabulary (`relationship_kinds`, with
directionality and per-end role labels), the `relationships` table (ONE
canonical record per bond, with canonical reciprocal storage so a symmetric
bond is never duplicated and directional bonds keep source/target meaning, the
shared Many-Clocks temporal model, provenance, and an optional curated
narrative), and the `get_person_relationships` read model, which projects the
same record onto both entities' pages with correct INVERSE labels. Relationships
render inside `/people/[personId]` after Participation, grouped by the
counterpart's role ("Mentors", "Students", "Collaborators") with equal dignity
across roles, replacing the M6.1 reserved Relationships placeholder (CC1: a bond
between entities, not Participation and not an Event; never inferred).
pgTAP/Vitest/Playwright coverage accompanies it. See
`docs/m6.4-relationship-engine.md` and
`docs/decisions/0014-relationship-engine.md`. The universal Entity/Institution/
Contribution engines, Knowledge Network visualization, and any inference/AI
librarian remain deferred and reserved as extension points.

## Milestone status — M6.3 (Participation Engine: bounded belonging)

**Implemented (pending local validation).** M6.3 turns the second
constitutional primitive into software: bounded belonging through time. It adds
the capacity vocabulary (`participation_capacities`), a minimal belonging-target
entity (`organizations`, deliberately NOT the Institution Engine), the
`participations` assertion (person + organization + capacity + the shared
Many-Clocks temporal model + provenance, with no uniqueness so concurrent and
sequential appointments are first-class), and the `get_person_participation`
canonical read model, then renders a calm, provenance-aware record of belonging
inside `/people/[personId]` — grouped by organization (a map of belonging),
distinct from the Timeline's grouping by decade (a spine through time) —
replacing the M6.1 reserved Participation placeholder. M6.3 also extracts the
temporal and provenance kernels into `src/features/shared`, shared by Timeline
and Participation and every later engine (CC1: Participation is not authorship,
ownership, provenance, causation, or relationship). pgTAP/Vitest/Playwright
coverage accompanies it. See `docs/m6.3-participation-engine.md` and
`docs/decisions/0013-participation-engine.md`. The Institution, Relationship,
and Legacy engines remain deferred and reserved as extension points.

## Milestone status — M6.5 (Institution Engine: institutions as historical actors)

**Implemented (pending local validation).** M6.5 turns the fifth constitutional
primitive into software: the institution as a historical ACTOR. It extends the
M6.3 `organizations` entity ADDITIVELY (institution type, historical status,
founding/closure, location, website, provenance — no parallel table, M6.3
Participation unchanged), and adds historical names (`organization_names`),
external identifiers (`organization_external_identifiers`), curated narrative
facets (`organization_narrative`), and an Event projection join
(`organization_events`) that puts a canonical Event on an institution timeline
without duplication. Three bounded reads (`get_organization`,
`get_organization_timeline`, `get_organization_participation`) compose the
Institution page at `/institutions/[organizationId]`: identity, introduction,
names, the reused M6.2 timeline, people & participation (the SAME M6.3 records
projected, grouped by capacity with equal dignity), and honest reserved
Relationships/Contributions/Historical-records surfaces. The person biography's
Participation now links each organization to its Institution page. Historical/
closed institutions remain readable. pgTAP/Vitest/Playwright coverage
accompanies it. See `docs/m6.5-institution-engine.md` and
`docs/decisions/0015-institution-engine.md`. The universal Entity Engine,
institution↔institution Relationships, the Contribution and Historical Records
engines, the Knowledge Network, and any Node administration remain deferred.

## Milestone status — M6.6 (Contribution Engine: what was made possible)

**Implemented (pending local validation).** M6.6 turns the sixth constitutional
engine into software: Contribution as a first-class historical object — a
provenance-bearing account of what people, institutions, communities, and
knowledge traditions made possible. One additive migration
(`20260808090000_add_contribution_engine.sql`) adds `contribution_kinds` /
`contribution_capacities` (kind and capacity as distinct data-backed axes),
the canonical `contributions` record (its own temporal scope and provenance;
no ranking/impact/status), explicit typed `person_contributions` /
`organization_contributions` attributions (each its own assertion, never
inferred, never polymorphic), `contribution_narrative` (interpretation separate
from evidence), and `contribution_events` (canonical Event projection without
duplication). Four bounded SECURITY DEFINER reads drive a new
`/contributions/[contributionId]` page and replace the reserved
"Scientific contributions" placeholders on the person and institution pages with
live projections, consistent by construction. Collective and Indigenous
contributions are representable without fabricating individuals; community
authorization and culturally-restricted-knowledge governance are documented
deferred extension points. See `docs/decisions/0016-contribution-engine.md`,
`docs/m6.6-contribution-engine.md`, and
`docs/m6.6-contribution-engine-engineering-report.md`. The universal Entity
Engine, generalized polymorphic attribution, outputs/records ingestion, impact
scoring, and M6.7 remain deferred.

## M7 — Knowledge Network Engine (implemented, pending local validation)

Connects already-preserved records as a bounded one-hop, provenance-preserving read model over canonical assertions; adds the institution-to-institution `organization_relationships` canonical relation; ships production `/network` routes. No inference and no metrics (those belong to M8 discovery and M9 interpretation). See `docs/m7-knowledge-network-engine.md`.


## Production Experience Phase I — unifying M1–M7 into one product (implemented, pending local validation)

An integration/refinement pass between M7 and M8. Introduces no new engine, AI,
discovery, inference, ranking, metric, dashboard, or schema change. It makes the
completed M1–M7 architecture read as one continuous scholarly environment:
completes the onward reading doorways (relationship → person; institution
participation → person; approved claim → the reader's own canonical Person page),
unifies the canonical-page reading spine (identity → divider → narrative →
engines) across People/Institutions/Contributions, corrects obsolete capability
copy (claiming/participation/network are no longer described as future work), and
locks provenance-affordance consistency across engines. The Knowledge Network
stays invisible infrastructure; `/dev/exhibition` stays inspection-only (it keeps
the one retained `/network/institutions/[id]` route as its inspection surface for
the M7 read model). See `docs/production-experience-phase-1.md` and
`docs/production-experience-phase-1-engineering-report.md`.

## M8 — Knowledge Revelation (design phase ratified; M8.1 implemented, pending local validation)

M1–M6 preserve; M7 connects; **M8 reveals**; M9 interprets. M8 is deterministic
**revelation**: it composes several already-preserved, already-connected explicit
Assertions into the patterns their joint truth entails, each decomposable back to
them. It performs no inference, similarity, recommendation, ranking, centrality,
or interpretation (those are forbidden outright, deferred to a later
human-confirmed Librarian, or reserved for M9). The design phase is ratified — the
M8 Definitive Specification (the law), the M8 Design Bible (philosophy), the M8
Benchmarking Report, the M8 Critical Review, and the M8 Engineering Blueprint
(which decomposes M8 into sub-milestones M8.1–M8.6, ordered by dependency and
ascending interpretive risk).

**M8.1 — Revelation Engine: co-presence (implemented, pending local validation).**
The kernel plus the first lens end-to-end. One additive migration adds a single
bounded `SECURITY DEFINER` read model `reveal_person_cohorts(uuid)` and **nothing
else** — no table, no write path; M8 creates no Assertion. It reveals the
**documented cohorts** a person belonged to: other people documented at the same
institution during an **overlapping** documented period, each decomposable back to
its `participations` record. Co-presence requires both a shared institution and a
temporal overlap (a shared institution alone, a non-overlapping period, or an
undated participation is not a member — the boundary that keeps revelation from
becoming inference); it is shown as a documented co-presence, never promoted to a
relationship. Reads **inline** on `/people/[personId]` (no route, no navigation
entry, no metric, no visualization), with pgTAP/Vitest/Playwright coverage. See
`docs/m8.1-co-presence-revelation.md` and
`docs/decisions/0018-revelation-engine.md`. M8.2+ (institution/event co-presence,
lineage, continuity/rupture, recurrence, comparison, bounded pathway) remain
deferred.

**M8.2 — Revelation Engine: institution-surface co-presence (implemented, pending local validation).**
The second revelation lens: the *documented co-presence* within one institution.
One additive migration adds a single bounded `SECURITY DEFINER` read model
`reveal_organization_generations(uuid)` and **nothing else** — no table, no write
path; M8 creates no Assertion. For a focal institution it reveals, for each
documented participant, the other people the record places there during an
**overlapping** documented period, each decomposable back to its `participations`
row and the anchor carrying all of their own participations there. Co-presence
requires both the shared institution and a temporal overlap (pairwise; no
clustering/windows); undated, merged, and different-institution are excluded. Reads
**inline** on `/institutions/[organizationId]` (no route, no navigation, no metric,
no visualization), with pgTAP/Vitest/Playwright coverage. The M8.1 parse primitives
were harvested into a shared module (`parse-shared.ts`) once the second lens
demonstrated the identical need. Per the ratified blueprint's M8.2, **event
company** (no event reading surface) and **comparison C5** (its M8.3 lineage host)
are deferred; M8.3+ (lineage, continuity/rupture, recurrence, bounded pathway)
remain deferred. See `docs/m8.2-institution-co-presence-revelation.md` and
`docs/decisions/0018-revelation-engine.md` (amended).

**M8.3 — Revelation Engine: lineage & institutional evolution (C2) (implemented, pending local validation).**
The lineage family: two bounded recursive `SECURITY DEFINER` read models —
`reveal_organization_lineage(uuid)` (institution succession/merger descent, deepening
M7's one-hop institutional lineage to the full transitive chain) and
`reveal_person_mentorship_lineage(uuid)` (person mentorship descent) — and **nothing
else** (no table, no write). Each traverses explicit same-kind directional edges
upstream and downstream, depth-capped (16) and cycle-safe, each canonical edge
de-duplicated to min depth, each step decomposable to its relationship row with both
endpoints as doorways. It shows what followed what, never what followed from what; no
inference, similarity, ranking, centrality, or interpretation. Reads **inline** on the
institution and person pages (no route, no navigation, no metric, no graph), with
pgTAP/Vitest/Playwright coverage. Scope clarification: the evolution chain uses the
temporal-descent kinds {succession, merger} only; governance kinds (administration,
parent_body, hosting) stay in M7's one-hop section (same-kind / structural-naming
rule). Comparison C5 is enabled by the lineage juxtaposition but not assigned to M8.3
(deferred). M8.4+ (continuity/rupture, recurrence, bounded pathway) remain deferred.
See `docs/m8.3-lineage-institutional-evolution.md` and
`docs/decisions/0018-revelation-engine.md` (amended).

**M8.4 — Revelation Engine: continuity & rupture (C3) (implemented, pending local validation).**
The continuity family: one bounded `SECURITY DEFINER` read model —
`reveal_organization_continuity(uuid)` — and **nothing else** (no table, no write). For
one institution it composes each capacity's dated `participations` into their **coverage**
over time (merged year-intervals via gaps-and-islands + the silences between them),
alongside the institution's own explicit `status` and `closure`. It holds four honest
states apart and never collapses them: CONTINUATION (an open-ended latest interval),
RUPTURE (the terminal status vocabulary + closure date), an EVIDENTIARY GAP (a whole-year
silence between intervals, never an end), and an UNKNOWN OUTCOME (a record that merely
stops — "not documented what followed", never "ended"). Reads **inline** on the
institution page after the M8.3 descent (no route, no navigation, no metric, no graph),
with pgTAP/Vitest/Playwright coverage. Rupture is grounded only in the explicit
`organizations.status` + `closure_date`, never inferred from the record's shape, and the
institution's terminal status never dates a particular capacity's end. Recurrence (C4,
M8.5), bounded pathway (C6, M8.6), and comparison (C5, enabled, not assigned) remain
deferred. See `docs/m8.4-continuity-rupture.md` and
`docs/decisions/0018-revelation-engine.md` (amended).

**M8.5 — Revelation Engine: documented recurrence (C4) (implemented, pending local validation).**
The recurrence family: two bounded `SECURITY DEFINER` read models —
`reveal_person_recurrence(uuid)` and `reveal_organization_recurrence(uuid)` — and
**nothing else** (no table, no write). For a focal entity they group the entity's
OWN explicit assertions by a structural recurrence key (organization + capacity;
event kind; contribution kind) and reveal each group with **>= 2** distinct
occurrences, with a plain count and the occurrences in time order (undated last).
Recurrence is NOT similarity: a GROUP BY + COUNT over identical explicit key values
— no AI, clustering, pattern mining, embedding, prediction, or inference. The count
is a count of records, never a metric; groups are ordered neutrally (category,
label), never by count. Reads **inline** on the person page (after co-presence and
lineage) and the institution page (after continuity), with pgTAP/Vitest/Playwright
coverage. Scope: single-entity repetition (ratified; the dyadic co-appearance count
of Spec §3.5 is deferred); the institution lens excludes participations (M8.4
continuity owns per-capacity coverage). Bounded pathway (C6, M8.6) and comparison
(C5, enabled, not assigned) remain deferred. See `docs/m8.5-recurrence.md` and
`docs/decisions/0018-revelation-engine.md` (amended).

**M8.6 — Revelation Engine: bounded pathway (C6) (implemented, pending local validation).**
The FINAL revelation capability. One bounded read model — `reveal_person_pathway(p_from,
p_to)` (plus an internal PUBLIC-revoked `pathway_entity_node` helper) — and **nothing else**
(no table, no write). The first TWO-ENDPOINT lens: for a focal person and a SELECTED target
entity (person/institution/contribution/event), the shortest documented chain of **>= 2**
explicit-assertion steps connecting them through intermediaries, over the heterogeneous
canonical graph, bounded to a small hop cap (4) and cycle-safe, each step decomposable to
its canonical row with both endpoints as doorways. Governed by the ENDPOINT RULE (Spec
§3.2): "a documented chain of N steps connects A and B", never "A is connected to B"; length
is a fact, never a rank; no chain within the bound is an honest absence, never "not
connected". Reads **inline** on the person page, target chosen via `?pathwayTo` with a calm
empty state and a minimal doorway on revealed cohort people (no console, no graph, no
metric), with pgTAP/Vitest/Playwright coverage. The >= 2-step rule avoids overlap with M7's
one-hop connection; composing across kinds avoids overlap with M8.3's same-kind descent.
Comparison (C5, enabled, not assigned) remains the only deferred affordance. With M8.6 the
M8 Revelation Engine (C1–C4, C6) is complete; interpretation is M9's. See
`docs/m8.6-bounded-pathway.md` and `docs/decisions/0018-revelation-engine.md` (amended).

**M8.7 — Revelation Engine: consolidation and constitutional closure (implemented, pending local validation).** The FINAL milestone of M8 — a review-and-refine pass, not a new capability. Treats M8.1–M8.6 as one engine and ships: one production correction (a new append-only migration makes `reveal_person_pathway`'s minimal-chain tie-break deterministic by folding each edge's canonical source id into the path key — the node-only key was non-total across parallel edges, a determinism + decomposability defect; reproduced-then-fixed in a real Postgres 16); one fail-closed hardening (recurrence deduplicated by source id, so a duplicated record can never fabricate a recurrence); two integrity-relevant consolidations (single `parseProvenance`/`parseSourceRef` evidence-contract parsers; shared `RevealedProvenanceFooter`/`NodeDoorway`); and one total constitutional-closure sweep over the whole engine's copy. Pure-logic 140/140; pathway fix sandbox-validated; typecheck + lint clean. **With M8.7 the M8 Revelation Engine (C1–C4, C6) is complete.** Comparison (C5) remains a deferred, enabled affordance (never assigned). Interpretation is M9. Ratified as the next architectural work before M9 (not built here): **Projects as First-Class Historical Actors** and the **Historical Operators Architecture**. See `docs/m8.7-consolidation-constitutional-closure.md` and its engineering report.
