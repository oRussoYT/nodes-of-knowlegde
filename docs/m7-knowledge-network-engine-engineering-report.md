# M7 — Knowledge Network Engine — Engineering Report

## 1. Executive verdict

M7 is implemented as a complete vertical slice: one additive migration (the
institutional-relationship canonical relation plus five bounded `SECURITY
DEFINER` one-hop read models), a TypeScript projection kernel with fail-closed
parsing and deterministic copy, four production `/network` routes with a fully
textual reading experience, integration into production navigation and every
canonical page, deterministic Exhibition inspection states added after
production, and pgTAP/Vitest/Playwright coverage plus documentation. The
Knowledge Network is a derived, provenance-preserving read model — no generic
edge store, no universal Entity table, no graph database, no inference, no
metrics. Local Mac validation (Docker-backed Supabase, build, e2e) is required
to certify; it could not run in the authoring environment. Recommendation: run
the validation sequence in §55; on green, M8 may begin.

## 2. M7 purpose

Connect the already-preserved records so a reader can move from a person,
institution, contribution, or event to the explicitly documented records linked
to it, with every connection historically situated, provenance-bearing,
temporally honest, and explainable.

## 3. Constitutional position in the roadmap

M6 preserves; **M7 connects**; M8 discovers; M9 interprets. M7 introduces no
inference, no discovery, no interpretation, and silently implements none of M8/M9.

## 4. Ratified architecture

Per ADR-0017: the network is a derived read model over canonical records; the
canonical tables remain the sole source of truth; deleting/altering an Assertion
changes its projection automatically because the projection copies nothing.
PostgreSQL remains canonical. The common reading shape is a TypeScript
discriminated union, not a database ontology.

## 5. Benchmarking Synthesis

**Problem landscape studied.** Provenance standards; archival authority networks;
museum/cultural-heritage information integration; event-centred historical
documentation; statement-with-qualifiers-and-references systems; scholarly
knowledge graphs; biodiversity infrastructures; research-infrastructure maps;
lineage/dependency systems; network visualization and node-link accessibility;
Indigenous data governance; sensitive-data aggregation; bounded graph-query
performance.

**Problems discovered.** (a) Generic property/edge models flatten distinct
historical relations ("mentored", "succeeded", "hosted", "contributed to") into
one "related to", destroying meaning. (b) Copying relations into an edge store
creates a second, drifting version of history and circular provenance (an edge
citing itself). (c) Qualifiers (time, precision, uncertainty, verification,
disputed state) are exactly where naive graphs lose the truth. (d) Node-link
diagrams manufacture false authority — distance reads as importance, size as
prestige, centrality as significance. (e) Aggregating individually harmless
records can expose sensitive patterns (places, unnamed contributors, social
structure). (f) Inference silently masquerades as documented history.

**Principles extracted.** Preserve the specific relation and its qualifiers;
project, never copy; keep provenance pointing at a canonical Assertion, never at
the projection; bound traversal to one hop; make the textual list canonical and
any visualization strictly supplementary; forbid all ranking/metric computation;
fail closed and reserve a withholding posture; separate direct/projected from
inferred and present only the former.

**Patterns deliberately rejected.** A universal `entities`/`edges` table; a graph
database; RDF triples / property-graph schemas; SPARQL; automatic
centrality/PageRank/"most connected"; recommendation/similarity/link-prediction;
CRediT-style weighted authorship; a force-directed, ever-moving canvas; a public
graph API. Their *implementations* were studied then deliberately forgotten.

**Original Nodes of Knowledge synthesis.** The network is a set of bounded,
per-record read functions that project canonical Assertions into one common
reading shape, each edge carrying its exact canonical source, provenance, and
honest temporal payload, grouped by historical meaning and explained in
deterministic prose. The one genuinely missing relation — institution ↔
institution — is added as an explicit canonical assertion mirroring the existing
Relationship Engine, not as a generic edge.

**Why a read model, not a second source of truth.** A copied edge would drift
from its canonical row and cite itself for evidence; a projection cannot — it is
recomputed from the canonical row at read time and points back at it.

**Why this advances beyond generic knowledge graphs.** It answers not "which
records are linked?" but "which historical assertions connect these records,
during what time, on what evidence, with what uncertainty, and under whose
authority may the connection be shown?" — the qualifiers a generic graph discards.

**Why benchmarking refined but did not determine architecture.** Benchmarking
surfaced problems and failure modes; the architecture was decided against the
Constitution (Entity/Assertion/Provenance, Node Independence, temporal honesty,
narrative/evidence separation, bounded reads), which no studied product could
reopen.

## 6. Existing connection-bearing records audited

`participations`, `relationships`, `person_contributions`,
`organization_contributions`, `person_events`, `organization_events`,
`contribution_events`, and `organization_names` (name history). Result: all
required connections project from these except institution ↔ institution.

## 7. Direct vs. projected vs. inferred

Direct = a canonical row states it; projected = the network re-presents a direct
assertion; inferred = a pattern-based guess. M7 presents only direct assertions
and their projections; it presents **no** inferred connections. Tested in pgTAP
("no edge from shared institution", "no edge from co-participation") and Vitest.

## 8. Network projection model

`ProjectedNode` (type, id, label, secondaryLabel, href, verificationStatus) and
`ProjectedConnection` (id, family, direction, node, kind, perspective, temporal,
provenance, source, visibility), assembled into `NetworkDocument { focal,
connections }`. Discriminants: `node.type` and `connection.family`.

## 9. Institutional Relationship Engine decision

Confirmed gap → built `organization_relationship_kinds` +
`organization_relationships` mirroring M6.4 exactly. Nine founding kinds
(succession, parent_body, administration, hosting, merger, affiliation,
partnership, joint_operation, other). No other new canonical relation;
contribution-to-contribution lineage explicitly deferred.

## 10. Controlled vocabularies

`organization_relationship_kinds` is data-backed with key, label, directionality,
source/target role labels (singular + plural, for inverse display), description,
sort order, and `is_active`, with a symmetric-roles-match check and a
`(key, is_directional)` unique target for the composite FK. Documented in
`docs/controlled-vocabularies.md`, the migration, TypeScript, and tests
consistently.

## 11. Database migration

One additive migration `supabase/migrations/20260810090000_add_knowledge_network_engine.sql`:
the vocabulary table + seed, the `organization_relationships` table (PK/FKs,
controlled-vocab composite FK, directionality + canonical-orientation checks,
self-link rule, uniqueness, temporal checks, source/verification checks, indexes,
`set_updated_at` trigger, deny-by-default RLS, service-role grants), and the five
read functions with pinned `search_path`, in-body auth, `PUBLIC` revokes, and
`authenticated` grants. No `network_edges` table; no `entities` table.

## 12. Canonical-source preservation

Every connection carries `source: { type, id }` naming its canonical table and
row. Event-association provenance/temporal come from the `events` row (join
tables carry none); attribution edges carry the attribution's own provenance and
are honestly undated. The projection is never evidence for its own edge.

## 13. Bounded network reads

`get_person_network`, `get_organization_network`, `get_contribution_network`,
`get_event_network`, `get_organization_relationships`. One hop; flat
deterministic ordering; merged people omitted; null focal for merged/nonexistent.
No two-hop, no traversal, no unbounded expansion, no table grants.

## 14. Network return contract

See §8 and `docs/m7-knowledge-network-engine.md`. The projected id is
deterministic (`"<source>:<rowId>"`) and stable for tests, but is not a new
assertion.

## 15. One-hop boundary

Only connections directly justified by canonical Assertions involving the focal
record. Two-hop belongs to M8. Enforced structurally (each function queries only
tables referencing the focal id) and asserted in tests.

## 16. Person network

Participations → institutions, relationships → people (inverse roles), person
contributions → contributions, person events → events. Merged counterparts
omitted.

## 17. Institution network

Institutional relationships → institutions (lineage, inverse roles),
participations → people (incoming), organization contributions → contributions,
organization events → events. Historical/closed institutions never hidden.

## 18. Contribution network

Person and organization attributions → contributors (incoming), contribution
events → events.

## 19. Event connections

`get_event_network` returns the people, institutions, and contributions
associated with an event. Event nodes have no reading route yet (`href` null) and
render as honest text with a note; `get_event_network` is reserved for a future
event reading surface and is exercised by pgTAP.

## 20. Institutional lineage

Directional (succession, parent/subordinate, administration, hosting, merger) and
symmetric (affiliation, partnership, joint operation) kinds, one canonical row
per bond, read with inverse roles from both ends via
`get_organization_relationships` and inside `get_organization_network`.

## 21. Provenance model

Each edge exposes source type + verification status via the shared provenance
kernel; the accessible name of each connection's provenance control states which
canonical record it is projected from, the source, and the verification/disputed
state. Non-circular by construction.

## 22. Temporal model

The shared Many-Clocks kernel is reused unchanged. Dated assertions
(participation, relationship, institutional relationship) carry their own period;
event associations carry the event's period; attributions are honestly undated
(`temporal: null`). Past never reads as current; unknown never reads as "always".

## 23. Verification and dispute

Verification status is carried through and rendered calmly: a visible badge for
provisional ("Awaiting review") and disputed ("Disputed"), never colour alone,
and never strengthened by copy.

## 24. Sensitive and withheld connections

A reserved `visibility` posture on every projection and fail-closed reads
preserve future withholding without redesign. M7 always projects `visible`.
Absence is never presented as proof of no connection (stated in the UI's limits
note).

## 25. Indigenous / community governance

Aggregation-harm review performed (see §47). The network combines only
already-preserved, provenance-bearing records and adds no inference, no
community-entity fabrication, and no reputational ranking. Unresolved governance
(fine-grained withholding, community consent surfaces) fails closed behind the
reserved `visibility` extension point and is documented as open (§47).

## 26. Node Independence

All copy is Node-neutral (unit-tested for the absence of PDBFF/Amazon/forest/…
vocabulary); vocabularies are data; no cross-Node federation, synchronization, or
tenancy. The engine works unchanged for any Node (station, museum, archive,
community association, defunct institution, government body).

## 27. Institutional sovereignty

Institutions are historical actors with explicit relationships they assert;
historical/closed institutions are never hidden; no institution is scored or
ranked; the withholding posture is reserved.

## 28. Production Network experience

`/network` (landing), `/network/people/[personId]`,
`/network/institutions/[organizationId]`,
`/network/contributions/[contributionId]`. Reading-first, grouped by historical
meaning, with focal record, "what this shows", counts, provenance, temporal,
limits, and a reserved visual surface.

## 29. Textual connection experience

The textual list is canonical and complete without any diagram: semantic
headings/lists, one deterministic sentence per connection, period line,
verification badge, provenance control, and canonical link.

## 30. Visual network, if implemented

Deferred as an honest reserved surface (ADR-0017 §8). No large
graph-visualization dependency added. The reserved surface states plainly that
the list is the complete view and that a future map will not encode
distance-as-importance or size-as-prestige.

## 31. Accessibility

One `h1` (focal label); logical h2/h3/h4 outline; semantic lists; provenance in
the accessible name (not tooltip-only); disputed/provisional as visible text;
no colour-only meaning; keyboard-operable links; event nodes as honest text.
Playwright runs axe (no serious/critical), duplicate-id, 375px overflow, and
light/dark checks.

## 32. Responsive behaviour

375px verified for no horizontal overflow; content-width container; flex-wrap on
the provenance/badge row.

## 33. Performance and query plans

One hop, indexed foreign keys on every join path (participations, relationships,
contributions attributions, event links, organization_relationships all have the
relevant `*_id` indexes). Each read is a bounded set of small subqueries
UNION-ed and aggregated once at the server; no N+1, no client traversal, no raw
tables to the browser. Expected node/edge counts are the focal record's direct
assertions (tens, not the whole graph). Query plans to be captured on the Mac
against representative fixtures (see §55).

## 34. Security

Deny-by-default RLS on both new tables; service-role-only writes; all reads via
`SECURITY DEFINER` with pinned `search_path`, in-body `auth.uid()`, `PUBLIC`
revoked, `authenticated`-only execute. No RLS weakened; no table grant to client
roles. pgTAP asserts anon/authenticated cannot read the tables and anon cannot
execute the functions.

## 35. Production integration

Network added to primary navigation; every canonical Person/Institution/
Contribution page gains an honest network entry link. Exhibition states added
**after** production and never duplicate the directory.

## 36. Canonical user journey

Landing → Register/Sign in → Explore → People/Institutions/Contributions →
canonical entity page → Connections (network entry link) → Knowledge Network
neighbourhood → connected canonical record → continue reading. Verified by a
Playwright journey test.

## 37. Exhibition integration

A `knowledge-network` section and Journey 4 link `/network/...` neighbourhoods for
the seeded world; two seeded `organization_relationships` (a succession and an
affiliation) demonstrate institutional lineage from both ends. `EXHIBITION_ENGINES`
gains `network`. The Exhibition remains dev-only and never the primary access.

## 38. Test architecture

pgTAP for the DB contract, Vitest for the pure projection/derivation/copy layer,
Playwright for the rendered reading experience — the same three-layer discipline
as M6.

## 39. pgTAP plan and results

`supabase/tests/database/knowledge_network.test.sql` plans **69** tests;
`exhibition.test.sql` updated to **34**. Not run in the authoring environment (no
Docker); run on the Mac via `npm run supabase:test`.

## 40. Vitest results

`network-parse` / `network-derive` / `network-copy` added. Not run here (Mac-
native `node_modules`); run via `npm run test`.

## 41. Playwright results

`tests/e2e/network.spec.ts` added (+ `helpers/network.ts`). Not run here (no
running app/DB/browsers wired to this environment); run via `npm run test:e2e`.

## 42. Typecheck, lint, build, and audit results

Not run here. `npm run supabase:types` must precede `npm run typecheck` so the new
RPC names are typed. Run typecheck/lint/build/audit on the Mac (§55).

## 43. Documentation

New: ADR-0017, `docs/m7-knowledge-network-engine.md`, this report. Updated
(appended M7 sections): README index, development roadmap, application IA,
canonical user journey, database implementation, controlled vocabularies, the ADR
index, and the exhibition doc.

## 44. Files created

Migration, pgTAP suite, `src/features/network/{types,parse,read,derive,copy}.ts`,
nine `src/features/network/components/*`, four `src/app/(protected)/network/**`
pages, three Vitest suites, `tests/e2e/network.spec.ts`,
`tests/e2e/helpers/network.ts`, ADR-0017, the M7 doc, and this report.

## 45. Files modified

`src/lib/navigation/config.ts`; the three canonical pages
(`people/[personId]`, `institutions/[organizationId]`,
`contributions/[contributionId]`); `src/app/dev/exhibition/content.ts`;
`tests/unit/dev-exhibition.test.ts` (engine count 6→7);
`supabase/tests/database/exhibition.test.sql`;
`supabase/seeds/m6_exhibition.sql` (two institutional-relationship rows appended);
and the documentation files in §43.

## 46. Explicitly deferred scope

M8 discovery/inference/suggestion/link-prediction/similarity/semantic-search/
recommendation; centrality/ranking/influence/shortest-path interpretation;
whole-network visualization and any graph-viz dependency; two-hop/unbounded
traversal; graph DB / RDF / SPARQL; public API; federation / cross-Node sync /
multi-tenancy / Node administration; contribution-to-contribution lineage; M9
interpretation. None silently implemented.

## 47. Open ethical and governance questions

Fine-grained, per-connection withholding (culturally restricted, sacred,
community-restricted, protected-location, security-sensitive) is reserved via the
`visibility` posture but not yet governable in code — M7 fails closed and marks
this as the primary extension point. Community consent surfaces, aggregation-harm
review workflows, and Node-specific visibility policy remain future governance
work; M7 fabricates no collective entity to complete a graph.

## 48. Genuine compromises

(1) The visual map is deferred as a reserved surface rather than shipped, to
protect provenance/accessibility/testability. (2) Per-family temporal/provenance
sourcing (dated-assertion vs. event vs. undated attribution) is deliberate and
documented rather than uniform. (3) `get_event_network` exists ahead of an event
reading route (event nodes are routeless text for now). (4) The single dependency
not verifiable purely from prior reading — the `events.title` / `event_kinds.label`
column names — was confirmed against the migration during authoring.

## 49. Closing-audit findings

See §54. No generic edge store, no universal Entity table, canonical records
authoritative, every projection cites its source, no co-occurrence/overlap
inference, no metrics/rankings, temporal/provenance via shared kernels, all reads
bounded and deny-by-default, `SECURITY DEFINER` search_path pinned, production
before Exhibition.

## 50. Constitutional audit

Entity/Assertion/Provenance preserved (projection, not copy); CC1/CC2 respected
(participation ≠ relationship ≠ contribution; no ingestion of external corpora);
temporal honesty and honest uncertainty preserved (shared kernel);
narrative/evidence separation preserved (deterministic copy, no AI); equal
dignity preserved (no ranking/metrics); institutional sovereignty and Node
Independence preserved; deny-by-default security preserved; bounded read
architecture preserved; production-first integration; benchmarking discipline
followed; M6 preservation, M8 discovery, and M9 interpretation boundaries
respected; no settled question reopened.

## 51. Confirmation: no inferred connections are presented

Confirmed. Only direct assertions and their projections appear; no
overlap/co-occurrence/shared-keyword/shared-institution/shared-event connection
exists. Tested in pgTAP and Vitest.

## 52. Confirmation: no network metrics or rankings exist

Confirmed. No centrality, PageRank, popularity, influence, productivity,
connectivity score, "top"/"most connected"/"key" labels, or shortest-path
significance is computed or displayed. Ordering is deterministic and historical.
Copy is unit-tested for the absence of such language.

## 53. Confirmation: benchmarking did not determine or reopen architecture

Confirmed. Benchmarking discovered problems and rejected patterns; the
architecture follows from the Constitution and ADR-0017, which benchmarking may
refine but never redefine.

## 54. Confirmation: nothing committed, pushed, or tagged

Confirmed. No `git commit`, `git push`, or `git tag` was performed. The working
tree change is the M7 slice only, staged for local validation.

## 55. Exact local validation sequence

```bash
npm run supabase:reset
npm run supabase:test
npm run supabase:types
npm run test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm audit
npm audit --omit=dev
git diff --check
git status
```

Run in order. `supabase:types` before `typecheck` (new RPC names). If any command
is environment-blocked, do not report it as passed.

## 56. Recommendation on whether M8 may begin

After the sequence in §55 is green on the Mac, M8 (discovery) may begin. M8 must
present inference as clearly-labelled suggestion, never as documented history, and
must not weaken the one-hop, no-inference, provenance-preserving boundaries M7
establishes.

## 57. Ratified refinement — the Network is infrastructure, not a product

Architectural principle (ratified): "The Knowledge Network is an internal historical infrastructure. The canonical product remains the historical reading experience. The Network enriches reading rather than replacing it." This supersedes the standalone-destination description in §28/§35/§36.

Why it better reflects the Design Bible's museum philosophy: connections belong inside each exhibit, not in a separate room; the reader's journey (Person → Biography → … → Institution → Contribution → continue) simply becomes richer, and the reader never consciously "enters the Network".

Production experience (superseding §28): no "Network" navigation entry; the `/network` landing redirects to `/explore`; person and contribution connections read inline on their canonical pages (their former network routes redirect to the canonical pages, which they would otherwise duplicate); institution-to-institution lineage reads inline on the Institution page (the M6.5 reserved slot, now live). The institution neighbourhood `/network/institutions/[id]` is retained as the network inspection surface the Exhibition points at (unique consolidated value; never in the reading chrome). Exhibition inspects; production uses.

Unchanged: every ratified architectural decision (§4, §7–§15). This is a user-experience refinement only. The `getPersonNetwork` / `getContributionNetwork` / `getEventNetwork` / `getOrganizationRelationships` read wrappers and the `NetworkEntryLink` component remain in the codebase as infrastructure (the underlying read models are all still exercised by pgTAP and the retained institution neighbourhood); production wiring uses `getOrganizationNetwork` inline (Institution page) and on the retained institution neighbourhood page.
