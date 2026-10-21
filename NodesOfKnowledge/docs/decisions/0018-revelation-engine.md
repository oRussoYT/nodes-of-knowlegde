# ADR-0018: The Revelation Engine — co-presence (M8.1)

- Status: Accepted
- Date: 2026-08-05
- Milestone: M8.1 — Revelation Engine (co-presence)
- Supersedes: none
- Related: ADR-0017 (Knowledge Network Engine), ADR-0013 (Participation
  Engine), the shared temporal/provenance kernels (`src/features/shared`), and
  the ratified M8 design phase — the M8 Definitive Specification, the M8 Design
  Bible, and the M8 Engineering Blueprint.

## Context

M1–M6 **preserve** the record as explicit, provenance-bearing Assertions; M7
**connects** it (one hop, projection not copy, no inference, no metrics). M8
**reveals** it: it composes several already-preserved, already-connected
Assertions into the deterministic patterns their **joint truth entails**, each
decomposable without remainder back to those Assertions. Per the ratified M8
Specification (§9.2), the eighth milestone is deterministic **revelation** — not
inference, similarity, recommendation, ranking, centrality, or interpretation
(those are forbidden outright, deferred to the later human-confirmed Librarian,
or reserved for M9). The M8 Engineering Blueprint decomposes the milestone into
six capabilities and sequences them; **M8.1** is the kernel plus the first and
simplest lens end-to-end: **co-presence**, on the person page.

The constitutional risk is that "cohort" invites inference — treating a shared
institution, or a mere co-occurrence, as a relationship, a collaboration, or an
influence. This ADR fixes the architecture so revelation stays deductive.

## Decision

### 1. A derived, read-only read model — no new canonical assertion

M8.1 adds exactly **one** bounded `SECURITY DEFINER` function,
`public.reveal_person_cohorts(uuid)`, and **nothing else** — no table, no
column, no RLS change, no write path. (This is the sharpest contrast with M7,
which added the `organization_relationships` canonical relation. M8 is a pure
derived read layer over the canonical record; it **creates no Assertion**.) The
canonical `participations` rows remain the single source of truth; deleting or
changing one automatically changes or dissolves the revelation, because the
revelation copies nothing.

### 2. Co-presence = shared institution + documented temporal overlap

A person's **documented cohort** at an institution is the set of **other**
people whose participation at the **same** institution has a documented period
that **overlaps** one of the focal person's documented periods there. Overlap is
the standard interval test on the stored dates, with an unrecorded/open end
treated as open-ended (`coalesce(end_date, 'infinity')`). Both a shared
institution **and** a temporal overlap are required: a shared institution alone,
a non-overlapping period, or an **undated** participation is **not** co-presence
(the exact boundary that keeps revelation from becoming inference). Co-presence
is presented as a **documented co-presence** — a record that people were at the
same institution in the same years — never promoted to a relationship,
collaboration, similarity, or influence.

### 3. Deterministic, decomposable, neutrally ordered

The function is a pure function of the `participations` Assertions and a fixed
composition rule: the same record yields the same cohort for every reader.
Ordering is neutral and historical — cohorts by institution name, members by
display_name — never a metric. Every member carries the **exact canonical
`participations` row** that establishes the overlap (its `source`), plus that
row's temporal payload and provenance; every cohort carries the focal person's
own anchoring participation(s). A reader can always decompose a cohort to the
evidence, on demand. The revelation is never evidence for itself.

### 4. Temporal honesty; no fabricated overlap window

Overlap is computed from the stored date values via the shared Many-Clocks
kernel semantics; each member and anchor is shown **with its own period**, so
the reader sees the actual dates rather than a single fabricated overlap window
that would claim a false precision. Undated participations cannot establish
temporal co-presence and are excluded (an honest limit, stated on the surface,
not a claim that no co-presence exists).

### 5. Fail-closed security; merged handling — inherited from M7

`SECURITY DEFINER`, `search_path` pinned, `auth.uid()` required in-body, revoked
from `PUBLIC`, granted to `authenticated` only; the underlying tables stay
deny-by-default (no table grant). A merged/nonexistent focal returns null;
merged member people are omitted (their pages 404) — exactly as M7. The reserved
`visibility` posture is inherited: M8.1 composes only already-readable
Assertions and projects `visible`, and the fail-closed reads preserve the future
ability to withhold sensitive aggregations without redesign (the pattern-level
consent governance and free-form reader queries are deferred per the M8
Specification's Accepted Limitation C; M8.1 ships this one curated lens).

### 6. Production-first, inline, no destination

The cohort reads **inline** on the Scientific Biography (`/people/[personId]`),
after the person's own engines, through the shared `ReadingSpine`. There is **no
new route, no navigation entry, no dashboard, and no visualization** — revelation
is infrastructure that enriches reading, a vantage that opens within the reading.
The textual, structured presentation is canonical; no fact lives only in a
diagram. Exhibition inspection is added after production.

### 7. No inference, metric, ranking, recommendation, or interpretation

The function computes no similarity, embedding, prediction, popularity,
centrality, or connection-count-as-importance, and generates no recommendation.
It names the pattern a **documented cohort** (a structural label, not an
evaluative one — never a "community," a "circle," or a "group that mattered").
Whether a documented co-presence meant anything is the reader's question and
M9's interpretation, never the system's.

## Consequences

Positive: co-presence is evidence-bearing, deterministic, and decomposable; the
canonical records remain authoritative; deleting a participation cleanly changes
the cohort; the engine is an independently testable read model following the
established M6/M7 patterns; no schema growth, no drift, no false authority. The
M8 kernel (feature module shape, provenance-decomposition contract, honest
absence, neutral ordering, deterministic copy) is now established for M8.2+.

Costs / trade-offs: an unrecorded/open end is treated as open for overlap
(shown honestly, each period visible); undated participations are excluded
(honest limit); one representative overlapping participation is shown per member
(the member links onward for the rest). These are accepted for constitutional
integrity and simplicity, exactly as the M8 Specification's worked examples
anticipate.

## Constitutional check

Read-only (no assertion created; no write grant); no inference (overlap is a
deductive date comparison; co-presence never promoted to a relationship — tested
in pgTAP: shared-institution-alone, non-overlapping, and undated are NOT
members); deterministic and decomposable (every member cites its canonical
`participations` row; determinism asserted); provenance-first and
temporally-honest (shared kernels, own-period display, honest uncertainty);
equal dignity (no ranking/metric; neutral ordering); fail-closed security
(bounded `SECURITY DEFINER`, deny-by-default, merged handling); production-first,
inline, no destination; M9 interpretation boundary respected. Consistent with
the M8 Specification's invariants (§9.1) and the Engineering Blueprint's M8.1
scope; no M1–M7 decision reopened.

---

## Amendment — M8.2: institution-surface co-presence (Accepted)

- Date: 2026-08-05
- Milestone: M8.2 — Revelation Engine (institution co-presence)

M8.2 extends this same decision (no new ADR: it is the same revelation engine, one
more lens) to the **institution surface**. It adds one bounded read model
`reveal_organization_generations(uuid)` — the institution-vantage mirror of
`reveal_person_cohorts` — and **nothing else**: no table, no write path, no new
route, no navigation, no metric. It reveals the *documented co-presence* within an
institution (for each participant, the others the record places there during an
overlapping period), composed by the **same pairwise interval-overlap rule** over
`participations`, decomposable to those rows, with each node in the canonical
`ProjectedNode` shape. It reads inline on `/institutions/[organizationId]` after the
Participation/Contributions engines.

**Reuse (harvested, not speculated).** With a second co-presence lens now
demonstrating the identical need, the shared fail-closed parse primitives were
extracted into `src/features/revelation/parse-shared.ts` and M8.1's `parse.ts` was
refactored to import them (public behaviour unchanged) — the M6.3 kernel-extraction
precedent. `CohortAnchor`/`CohortMember` types and the `CohortMember`/`RevealedPeriod`
components are reused directly.

**Terminology.** The blueprint's shorthand "institution generations" is kept only as
the internal capability name; per the Specification's structural-naming rule (calling
a documented cohort "a generation" is *interpretation*), the reader-facing surface says
**"documented co-presence," never "generation."**

**Deferrals (approved as a scope resolution, not a silent narrowing).** The
blueprint's M8.2 also names *event company* (C1 on events) and *comparison* (C5).
Both are deferred on an architectural basis: events are not a canonical reading
destination (M8 creates none), and C5 is explicitly "not a standalone page" whose
ratified host — the M8.3 lineage juxtaposition — does not yet exist. They are
deferred until their surfaces exist; nothing about them is built here.

**pgTAP contract lock retained and extended.** As with M8.1, the pgTAP asserts the
exact `ProjectedNode` projection shape (`type`/`label`) the parser requires, so the
M8.1 projection-shape defect class cannot recur.

---

## Amendment — M8.3: lineage & institutional evolution (C2) (Accepted)

- Date: 2026-08-05
- Milestone: M8.3 — Revelation Engine (lineage)

M8.3 extends this same decision (no new ADR: same Revelation Engine, a new pattern
family) with the **lineage** capability C2. It adds two bounded recursive read models —
`reveal_organization_lineage(uuid)` and `reveal_person_mentorship_lineage(uuid)` — and
**nothing else**: no table, no write path, no new route, no navigation, no metric. Each
composes a chain of **same-kind directional** assertions (institution succession/merger;
person mentorship) by a bounded (depth 16), cycle-safe recursive traversal, each
canonical edge de-duplicated to its minimum depth, each step decomposable to its
relationship row with both endpoints in the canonical `ProjectedNode` shape and the
directional sentence driven by the kind vocabulary's `source_role_label`. It reads
inline on the institution and person pages.

**Scope clarification (reported, not silent).** The blueprint's C2 body lists
"succession/merger/administration"; `administration`/`parent_body`/`hosting` are
governance/structural relations, not temporal descent. Folding them into an evolution
chain would violate the same-kind / structural-naming rule (Spec §1, §3.4). The chain
therefore uses {succession, merger} only; governance kinds remain in M7's one-hop
"Institutional relationships" section. Faithful narrowing to the constitutional rule,
reversible if later wanted.

**Comparison C5** is enabled by this lineage juxtaposition but **not assigned** to M8.3
(the blueprint assigns C2 only; C5 is a deferred M8.2 capability). It is not built here.

**Reuse (harvested).** With two lineage lenses demonstrating the identical need, a shared
`LineageStep` type + `parseStep` (`parse-lineage.ts`) + a shared `LineageStepList`
component were introduced; the M8.1/M8.2 primitives (`parse-shared`, `ProjectedNode`,
temporal/provenance kernels, `RevealedPeriod`, `ProvenanceAffordance`) are reused
unchanged.

**pgTAP contract lock** for the `ProjectedNode` projection shape is retained (the
M8.1 projection-shape defect class cannot recur), and a diamond in the relation graph is
de-duplicated so no canonical edge is emitted twice.

## Amendment — M8.4: continuity & rupture (C3) (Accepted)

- Date: 2026-08-05
- Milestone: M8.4 — Revelation Engine (continuity & rupture)

M8.4 extends this same decision (no new ADR: same Revelation Engine, a new pattern
family) with the **continuity & rupture** capability C3. It adds one bounded
`SECURITY DEFINER` read model — `reveal_organization_continuity(uuid)` — and **nothing
else**: no table, no write path, no new route, no navigation, no metric. For one
institution it composes a time-ordered series of already-dated `participations` per
capacity into their entailed **coverage** (merged year-intervals via gaps-and-islands,
and the silences between them), alongside the institution's own explicit `status` and
`closure` from `organizations`. It reads inline on the institution page after the M8.3
descent. Operator design ratified with the user: **per-capacity coverage + terminal
status.**

**The four honest states, never collapsed.** CONTINUATION requires explicit continuation
evidence (a capacity whose latest interval is open-ended); RUPTURE requires explicit
termination evidence (the institution's terminal status vocabulary
closed/absorbed/succeeded/merged, with its closure date); an EVIDENTIARY GAP is a silence
between two documented intervals, never a demonstrated end; an UNKNOWN OUTCOME is a record
that merely stops ("the available record does not document what followed", not "the
activity ended"). The read model returns only the raw decomposable structure and stores
no verdict; the four states are read deterministically at the surface and held apart in
copy. The institution-level status is never propagated to date the end of any particular
capacity.

**Schema-grounding (reported, not silent).** The gap-vs-rupture crux is resolved by
grounding rupture in the explicit `organizations.status` vocabulary + `closure_date`
(only closed/absorbed/succeeded/merged read as `ended`); a gap is only ever a whole-year
silence between two dated participation intervals, never derived from status or from a
missing record. Coverage is merged and summarised at **year** granularity (overlapping
and adjacent years merge; only a whole-year silence is a gap) — the conservative choice
for a year-level overview; each participation keeps its full stored temporal for
decomposition.

**Reuse (no harvest).** One lens does not demonstrate repetition, so no new shared
primitive was extracted; `parse-continuity.ts` reuses the `parse-shared` primitives,
`ProjectedNode`, the temporal/provenance kernels, `RevealedPeriod`, and
`ProvenanceAffordance` unchanged. The **pgTAP `ProjectedNode` contract lock** is retained
(person nodes in coverage assert `type`/`label`), and pgTAP proves the non-collapse
directly (a closed institution's coverage ending 1990 is never back-filled to a 1998
closure).

**Comparison C5 / recurrence C4 / bounded pathway C6** remain deferred (not assigned to
M8.4).

## Amendment — M8.5: documented recurrence (C4) (Accepted)

- Date: 2026-08-05
- Milestone: M8.5 — Revelation Engine (recurrence)

M8.5 extends this same decision (no new ADR: same Revelation Engine, a new pattern
family) with the **documented recurrence** capability C4. It adds two bounded
`SECURITY DEFINER` read models — `reveal_person_recurrence(uuid)` and
`reveal_organization_recurrence(uuid)` — and **nothing else**: no table, no write
path, no new route, no navigation, no metric. For a focal entity it groups the
entity's OWN explicit assertions by a structural recurrence key (organization +
capacity; event kind; contribution kind) and reveals each group holding **>= 2**
distinct occurrences, with a plain count and the occurrences in time order (undated
last). It reads inline on the person page (after co-presence and lineage) and the
institution page (after continuity). Recurrence is **not similarity**: it is a
GROUP BY + COUNT over identical explicit key values — no AI, no clustering, no
pattern mining, no embedding, no prediction, no inference.

**Scope decision (ratified with the product owner).** Spec §3.5 names C4's
"recurrence counting" DYADICALLY (the count of distinct contexts in which the same
*pair* co-appears). The M8.5 mission defines recurrence as SINGLE-ENTITY repetition
("the same phenomenon occurred multiple independent times"). The owner ratified the
single-entity reading and the person + institution surfaces; the dyadic
co-appearance count remains a deferred sibling. Both obey the identical discipline
(count of distinct explicit assertions, never a metric).

**Count, never metric (Spec §4).** The count is literally the number of distinct
explicit assertions of that kind, presented as "Documented N times as …". Groups
are ordered NEUTRALLY (category, then label, then a stable key) — never by count;
the count never ranks, weights, or reads as importance, activity, or standing
(copy unit-tested to exclude that vocabulary). A single documented occurrence is
never a recurrence (the >= 2 rule). An UNDATED occurrence still counts and is shown
last, marked unknown (a deliberate, documented difference from M8.4, whose coverage
genuinely needs dates).

**Institution scope clarification (reported, not silent).** The institution lens
EXCLUDES participations; per-capacity coverage over time is M8.4's continuity lens,
and reading it again as a recurrence count would be duplicative. Institution
recurrence composes over the institution's repeated events and contributions only.
Reversible if participation-recurrence is later wanted.

**Reuse (no duplication).** M8.5 projects contribution and event nodes, which the
shared `parseNode` previously rejected. Rather than duplicate a node parser,
`parse-shared` gained `parseAnyNode` (all four `NetworkNodeType`s) and `parseNode`
now delegates to it and restricts to person/organization — so M8.1–M8.4 keep their
exact prior contract (the M8.1–M8.4 pure-logic suites pass unchanged). The pgTAP
`ProjectedNode` contract lock is retained (focal, role anchor, event node, and
contribution node types asserted).

**Comparison C5 / bounded pathway C6 / dyadic co-appearance recurrence** remain
deferred (not assigned to M8.5).

## Amendment — M8.6: bounded pathway (C6) (Accepted)

- Date: 2026-08-06
- Milestone: M8.6 — Revelation Engine (bounded pathway) — the FINAL revelation capability

M8.6 extends this same decision (no new ADR: same Revelation Engine, the last pattern
family) with the **bounded pathway** capability C6. It adds one bounded read model —
`reveal_person_pathway(p_from, p_to)` — plus an internal, PUBLIC-revoked
`pathway_entity_node` node-projection helper, and **nothing else**: no table, no write,
no new route, no navigation, no metric. It is the first TWO-ENDPOINT lens: given a focal
person and a SELECTED target entity, it reveals the shortest documented chain of **>= 2**
explicit-assertion steps connecting them through intermediaries, over the HETEROGENEOUS
canonical assertion graph (people/institutions/contributions/events; edges are
relationships, organization_relationships, participations, person/organization_contributions,
person/organization/contribution_events, read undirected), bounded to a small hop cap (4)
and cycle-safe, each step decomposable to its canonical row with both endpoints as
ProjectedNode doorways.

**The endpoint rule (Spec §3.2) governs this milestone.** A chain asserts nothing about
its endpoints beyond its literal existence; the surface states "a documented chain of N
steps connects A and B", NEVER "A is connected to B". The length is a fact, never a rank;
pathways are never ordered or scored by length; the hop bound is small and longer chains
get MORE reserve. A no-chain result is "no documented chain within four steps", never "not
connected".

**Scope (ratified with the product owner).** Heterogeneous multi-entity graph; target
selected via `?pathwayTo=<id>` with a calm "choose an entity" state when absent (no
picker/console = no recommendation) and a minimal "trace the documented chain to this
person" doorway on people already revealed on the page (the M8.1 cohort members —
integration required by the design). >= 2 STEPS ONLY: a one-hop link is M7's connection,
not a pathway (no overlap with M7); the chain composes across kinds, so no overlap with
M8.3's same-kind directional descent.

**Reuse (no duplication).** Reuses `parse-shared` (incl. `parseAnyNode`), `ProjectedNode`,
the temporal/provenance kernels, `RevealedPeriod`, `ProvenanceAffordance`, and the
`revelationCopy` module; adds `parse-pathway.ts` with a chain-CONTIGUITY guarantee (a
broken or partial chain is never shown). The pgTAP ProjectedNode contract lock is retained.
Merged people excluded from the graph and as endpoints.

**Comparison C5** remains a deferred, enabled affordance (never assigned). With M8.6, the
M8 Revelation Engine (C1–C4, C6) is complete; interpretation is M9's.

## Amendment — M8.7: consolidation and constitutional closure (Accepted)

- Date: 2026-08-06
- Milestone: M8.7 — Revelation Engine (consolidation and constitutional closure) — the FINAL milestone of M8

M8.7 extends this same decision by **closing** the engine, not adding a lens. It
treats M8.1–M8.6 as one Revelation Engine, re-audits every operator against the
§9.1 invariants, and ships a small, deliberate set of concrete improvements.

**One production correction.** `reveal_person_pathway` (C6) chose its minimal
chain by a node-only `path_key`, which is non-total: two distinct assertions
between the same node pair (e.g. a person with two documented participation
periods at one institution) produced an identical ordering key, so the chosen
chain — and the exact canonical row each step decomposed to — was plan-dependent,
a **determinism + decomposability** violation. A new append-only migration
(`20260817090000_close_revelation_engine.sql`) folds each edge's canonical source
id into the path key, making the order total (reproduced-then-fixed in a real
Postgres 16). The historical M8.6 migration is untouched.

**One fail-closed hardening.** Recurrence groups are deduplicated by canonical
source id before the ≥ 2 test, so a duplicated occurrence can never fabricate or
inflate a recurrence — the one place a malformed revelation could have become a
false claim rather than an honest absence.

**Consolidations (integrity-relevant, not cosmetic).** The provenance envelope and
source-ref pointer — the evidence contract — are now single `parseProvenance` /
`parseSourceRef` primitives in `parse-shared` (six/five call sites unified), so the
contract cannot drift between lenses; the identical provenance footer and node
doorway every lens re-declared inline are now shared `RevealedProvenanceFooter` /
`NodeDoorway` components with byte-identical output.

**Constitutional closure test.** One total sweep asserts the whole engine's
reader-facing surface (all of `revelationCopy` + every `describe*` output) is free
of the forbidden interpretive frames, respecting the copy's honest negations
("not a connection", "never ranked", "never scored by length") — replacing six
divergent per-operator checks with one single-sourced guarantee.

**Rejected (reviewed, not made).** A shared SQL node-projection helper (cosmetic,
hot-path cost); a `person` node on `reveal_person_cohorts` (no consumer); a
`RevelationSection` wrapper (would lose per-lens clarity; e2e/axe-certified only);
institution-page re-ordering and heading-weight changes (aesthetic); an e2e
page-quality helper (un-runnable in the authoring environment). See the M8.7
engineering report.

**Closure.** With M8.7 the M8 Revelation Engine (C1–C4, C6) is complete.
Comparison (C5) remains a deferred, enabled affordance, never assigned.
Interpretation is M9's. Two architectural milestones are ratified as the next work
before M9 and are **not** built here: **Projects as First-Class Historical
Actors** and the **Historical Operators Architecture**.
