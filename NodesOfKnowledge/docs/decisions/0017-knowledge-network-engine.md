# ADR-0017: The Knowledge Network Engine (M7)

- Status: Accepted
- Date: 2026-08-04
- Milestone: M7 — Knowledge Network Engine
- Supersedes: none
- Related: ADR-0011 (Scientific Biography read model), ADR-0012 (Timeline),
  ADR-0013 (Participation), ADR-0014 (Relationship), ADR-0015 (Institution),
  ADR-0016 (Contribution), the reading-index read models
  (`supabase/migrations/20260809090000_add_reading_index_read_models.sql`)

## Context

M1–M6 **preserved** the history of how scientific knowledge is produced: people
and scientific biographies, events and timelines, bounded participation,
person-to-person relationships, institutions as historical actors, and
contributions as historical objects — each an Assertion carrying provenance,
verification, and honest temporal uncertainty, read through bounded
`SECURITY DEFINER` functions rather than raw table access.

M7 must **connect** those already-preserved records so a reader can move through
the production of scientific knowledge as a connected historical fabric — from a
person, an institution, a contribution, or an event to the explicitly documented
records linked to it — while every connection stays historically situated,
provenance-bearing, temporally honest, and explainable.

The constitutional risk is that "network" invites the wrong architecture: a
generic property graph, a universal `entities`/`edges` store, a graph database,
inferred "friend-of-a-friend" links, or centrality/influence scoring. Any of
those would make the archive look more complete, more settled, and more
topological than the evidence supports, and would betray the records M6
preserved. This ADR fixes the architecture before implementation.

## Decision

### 1. The network is a derived, provenance-preserving READ MODEL — never a source of truth

The Knowledge Network is a family of bounded read models that **project**
existing canonical Assertions into one common reading shape. The canonical
records remain the single source of historical truth: `people`, `organizations`,
`events`, `participations`, `relationships`, `contributions`,
`person_contributions`, `organization_contributions`, narratives, provenance,
plus the one new canonical relation M7 introduces (institutional relationships,
§4). Deleting or changing a canonical Assertion automatically changes its
network projection, because the projection is computed from that row at read
time and stores no copy of it.

### 2. No generic edge table; no universal Entity table; no graph database

We do **not** create a `network_edges`/`edges` table that copies existing
relationships, and we do **not** refactor the canonical tables to inherit from a
universal `entities` parent. A projected edge that duplicated a canonical
Assertion would create a second, drifting version of history and circular
provenance. PostgreSQL remains the canonical database; no measured requirement
justifies a graph database, and "the milestone contains the word network" is not
a measured requirement. The common network shape lives in TypeScript as a
**discriminated union for reading projections** (`src/features/network/types.ts`),
not as a database ontology.

### 3. Direct vs. Projected vs. Inferred — a strict three-way boundary

- **Direct assertion**: a canonical row explicitly states the connection (a
  `relationships` mentorship row; an `organization_relationships` succession row).
- **Projected connection**: the network presents a direct assertion in the
  common reading shape (a `participations` row projected as Person ↔ Institution).
  Projection creates **no** second assertion.
- **Inferred connection**: a pattern-based conclusion (two people at the same
  institution during overlapping periods; shared contributors; a shared event).

**M7 presents only direct assertions and their projections. M7 presents no
inferred connections.** No overlap, co-occurrence, shared keyword, shared
institution, or shared event ever becomes a network connection unless an
explicit canonical Assertion supports it. Inference is M8's work and, when it
arrives, must be visibly labelled as suggestion rather than history. This
boundary is tested directly (pgTAP: "no edge from overlapping participation",
"no edge from shared institution"; Vitest: "absence of inferred edges").

### 4. Institutional Relationship Engine — the one genuine schema gap

Audit result: of the connection types M7 must show, all but one can be projected
from existing Assertions. Person ↔ Institution projects from `participations`;
Person ↔ Person from `relationships`; Person ↔ Contribution from
`person_contributions`; Institution ↔ Contribution from
`organization_contributions`; Contribution ↔ Event from `contribution_events`;
Institution ↔ Event from `organization_events`; Person ↔ Event from
`person_events`. Institution renames are already represented by
`organization_names` (name history) and are **not** an institution-to-institution
relationship.

The one historically meaningful connection with **no** canonical home is
institution **to** institution (predecessor/successor, parent/subordinate,
administered-by, hosted-by, affiliation, merger, joint operation). M6.5 reserved
predecessor/successor semantics without building them. M7 therefore adds one
minimal additive canonical relation — `organization_relationship_kinds`
(data-backed controlled vocabulary) and `organization_relationships` (one
canonical row per bond) — mirroring the M6.4 Relationship Engine exactly
(composite kind/directionality FK, canonical ordering for symmetric bonds,
no self-link, duplicate prevention, the shared Many-Clocks temporal model,
provenance + verification, an optional historically bounded note, deny-by-default
RLS). Institutional relationships are **explicit assertions**; they are never
inferred from shared personnel, shared contributors, a shared event, similar
names, geographic proximity, common funding, web links, overlapping topics,
co-authorship, or participation. There is no untyped "related institution"
fallback.

No other new canonical relation is introduced. Contribution-to-contribution
intellectual lineage is explicitly deferred (no ratified need).

### 5. Bounded one-hop read models

M7 adds `SECURITY DEFINER` read functions — `get_person_network`,
`get_organization_network`, `get_contribution_network`, `get_event_network`, and
`get_organization_relationships` — each returning a **one-hop** neighbourhood
centred on one canonical record: only connections directly justified by canonical
Assertions involving the focal record. No two-hop expansion, no path expansion
disguised as data, no automatic friend-of-a-friend. Two-hop traversal belongs to
M8. Each function pins `search_path`, enforces `auth.uid()` in-body, is revoked
from `PUBLIC` and granted to `authenticated` only, fails closed, preserves each
edge's canonical source row id, is temporally honest, and orders deterministically.
Raw table reads remain denied; the network exposes no unrestricted table grant.

### 6. Canonical-source preservation and non-circular provenance

Every projected connection carries a pointer to the exact canonical row that
justifies it (`source: { type, id }`) and exposes that row's provenance and
verification. Event-association edges (`person_events`/`organization_events`/
`contribution_events` are pure join tables with no provenance columns) source
their provenance and temporal payload from the `events` row they point at;
contribution-attribution edges carry the **attribution's own** provenance (each
attribution is its own Assertion). The network projection is **never** used as
evidence for its own edge — provenance always points back to a canonical
Assertion, never to the projection.

### 7. Temporal honesty via the shared kernel

Connections reuse the shared Many-Clocks temporal kernel
(`src/features/shared/temporal.ts`); M7 introduces no new date logic. A
connection's temporal payload is the temporal of its canonical source where the
source is itself dated (participation, relationship, institutional relationship)
and the `events` row's temporal for event associations; contribution-attribution
edges are honestly undated (the attribution carries no period). A past
participation never reads as current; a historical institutional relationship
never reads as permanent; an unknown period never reads as "always". Overlap may
be shown only as a factual temporal comparison, never as inferred collaboration
or causation.

### 8. Textual network is canonical; visualization is supplementary and reserved

The accessible, textual connection list is the canonical M7 experience. A visual
node-link diagram is at most supplementary and may never carry a fact absent from
the text. For M7 we ship the **complete textual network** and leave the visual
map as an **honest reserved surface** rather than compromise security,
provenance, semantic integrity, accessibility, or testability to rush a diagram.
No large graph-visualization dependency is added (that would itself require an
ADR). When a visualization is built later it must be one focal record, one-hop,
deterministic layout, no distance-as-importance, no size-as-prestige, no
colour-only meaning, with a full textual equivalent, keyboard operability, and
reduced-motion compliance.

### 9. No metrics, rankings, or recommendations

M7 computes no centrality, PageRank, popularity, influence, productivity,
connectivity score, "top collaborators", "most important institutions", "key
contributors", or shortest-path-as-significance, and generates no recommendations.
A connection's screen position and a node's order never encode importance;
ordering is deterministic (family, then chronology, then id) and historical, not
ranked.

### 10. Node sovereignty and community governance boundaries

The projection shape carries a `visibility` posture and the read models fail
closed, preserving the future ability to withhold sensitive, protected,
culturally restricted, private, sacred, community-restricted, or
security-sensitive connections without redesign. M7 implements no federation,
cross-Node synchronization, multi-tenancy, or Node administration. Absence from
the visible network is never presented as proof that no connection exists — the
UI states the view shows documented connections, not the totality of history.
Aggregation-harm review (combining individually harmless records) is documented;
where governance is unresolved, the engine fails closed and preserves an explicit
extension point rather than fabricating a collective entity to complete a graph.

### 11. Production first, Exhibition second

M7 appears first in the production application (`/network` routes, production
navigation, and an honest network entry point on each canonical Person,
Institution, and Contribution page). Only afterward are deterministic M7
inspection states added to `/dev/exhibition`; the Exhibition never becomes the
primary way to reach M7 and never duplicates the production directory.

### 12. Roadmap boundaries

M7 **connects**. It does not **discover** (M8: inference, suggestion, link
prediction, similarity, semantic search, recommendations, traversal, centrality)
and does not **interpret** (M9). Nothing in M7 silently implements M8 or M9.

## Consequences

Positive: connections stay evidence-bearing and honest; canonical records remain
authoritative; deleting an Assertion cleanly removes its projection; the network
evolves as bounded, independently testable read functions; no schema flattening,
no drift, no false authority. The one new canonical relation (institutional
relationships) fills a real historical gap using the established, tested
Relationship pattern.

Costs / trade-offs: the common shape lives in TypeScript, so each read model must
build the projection explicitly (no generic edge query); per-family temporal and
provenance sourcing (event vs. attribution vs. dated-assertion) is deliberate and
documented rather than uniform; and the visual map is deferred as a reserved
surface. These costs are accepted in exchange for constitutional integrity.

## Constitutional check

Entity/Assertion/Provenance preserved (projections, not copies); Node
Independence and institutional sovereignty preserved (no federation/tenancy;
withholding reserved); temporal and uncertainty honesty preserved (shared
kernel); narrative/evidence separation preserved (deterministic copy, no AI
prose); equal dignity preserved (no ranking/metrics); deny-by-default security
preserved (bounded `SECURITY DEFINER`, no table grants); benchmarking discipline
followed (problems extracted, implementations rejected — see the engineering
report's Benchmarking Synthesis); M6 preservation, M8 discovery, and M9
interpretation boundaries all respected.

## Ratified refinement — infrastructure, not a product (supersedes §1/§11's standalone-destination description)

**Principle (ratified):** The Knowledge Network is an internal historical infrastructure. The canonical product remains the historical reading experience. The Network enriches reading rather than replacing it.

This better reflects the Design Bible's museum philosophy: a museum does not send a visitor to a separate "connections room"; the connections are part of each exhibit. A reader moves Person → Biography → Timeline → Participation → Relationships → Institution → Contribution → continue reading, and every page simply gains richer *Documented Connections* through the same canonical assertions — the reader never consciously "enters the Network".

Production consequences (superseding the earlier standalone-destination description):

- There is **no** "Network" entry in the primary navigation, and **no** standalone `/network` product landing (that route redirects to `/explore`).
- A person's and a contribution's documented connections are read **inline** on their canonical pages (timeline / participation / relationships / contributions, and contributors / institutional-context / events, respectively). The former `/network/people/[id]` and `/network/contributions/[id]` routes **redirect** to the canonical pages, because a dedicated page there would only duplicate the canonical reading journey.
- The one genuinely new documented connection M7 adds to canonical reading — institution-to-institution lineage — reads **inline** on the Institution page (the M6.5 reserved "Relationships" slot, now live), projected from the canonical `organization_relationships` rows.
- One dedicated surface is retained: the institution neighbourhood at `/network/institutions/[id]`, as the network **inspection** view the Exhibition points at (unique consolidated value; never surfaced in the reading chrome). The Exhibition **inspects** the network; the production application simply **uses** it.

All ratified architecture is unchanged: derived read model; no generic edge table; no universal Entity model; one-hop boundary; provenance preservation; the institutional relationship engine; bounded read models; the direct/projected/inferred distinction; no graph database; no metrics; no rankings; no discovery; no recommendations.
