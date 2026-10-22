# M7 — Knowledge Network Engine

Status: implemented (pending local Mac validation). See
`docs/decisions/0017-knowledge-network-engine.md` for the ratified architecture
and `docs/m7-knowledge-network-engine-engineering-report.md` for the full
engineering report and benchmarking synthesis.

## Purpose

M6 **preserved** the records. M7 **connects** them. It lets a reader begin at a
person, an institution, or a contribution and read the explicitly documented
paths linking that record to other records — as a connected historical fabric,
with every connection historically situated, provenance-bearing, temporally
honest, and explainable. M8 will **discover** (inference); M9 will **interpret**.
M7 does none of that.

## Architecture (ADR-0017)

The Knowledge Network is a **derived, provenance-preserving read model** over
canonical records. It is not a source of truth, not a generic edge store, not a
universal Entity table, and not a graph database. Most connections are
**projections** of Assertions already stored by M1–M6; the single new canonical
relation is institution-to-institution relationships.

### Direct vs. projected vs. inferred

- **Direct assertion** — a canonical row states the connection (a mentorship
  `relationships` row; a succession `organization_relationships` row).
- **Projected connection** — the network presents a direct assertion in the
  common reading shape (a `participations` row shown as Person ↔ Institution).
  No second assertion is created.
- **Inferred connection** — a pattern-based guess (two people at the same
  institution during overlapping periods). **M7 presents none.** No overlap,
  co-occurrence, shared keyword, shared institution, or shared event becomes a
  connection unless an explicit canonical Assertion supports it.

### What projects from where

| Connection | Family | Canonical source |
|---|---|---|
| Person ↔ Institution | `participation` | `participations` |
| Person ↔ Person | `relationship` | `relationships` |
| Person ↔ Contribution | `contribution_attribution` | `person_contributions` |
| Institution ↔ Contribution | `contribution_attribution` | `organization_contributions` |
| Contribution ↔ Event | `event_association` | `contribution_events` |
| Institution ↔ Event | `event_association` | `organization_events` |
| Person ↔ Event | `event_association` | `person_events` |
| Institution ↔ Institution | `institutional_relationship` | `organization_relationships` (new) |

Every projected connection carries a `source: { type, id }` pointing at the exact
canonical row, and exposes that row's provenance/verification. Event-association
edges (whose join tables carry no provenance) source their provenance and
temporal payload from the `events` row; contribution attributions carry the
attribution's own provenance and are honestly undated.

## Institutional Relationship Engine (the one schema gap)

`organization_relationships` mirrors the M6.4 Relationship Engine for
institutions: a composite `(kind, is_directional)` FK to
`organization_relationship_kinds`, canonical ordering for symmetric bonds
(`source < target`), no self-link, duplicate prevention, the shared Many-Clocks
temporal model, provenance + verification, an optional historically bounded
`note`, deny-by-default RLS, and a `set_updated_at` trigger. Institutional
relationships are explicit assertions, **never** inferred from shared personnel,
contributors, events, names, proximity, funding, or participation. There is no
untyped "related institution".

### Controlled vocabulary — `organization_relationship_kinds`

| key | label | directional | source role → target role |
|---|---|---|---|
| succession | Succession | yes | Predecessor → Successor |
| parent_body | Parent body | yes | Parent body → Subordinate body |
| administration | Administration | yes | Administering body → Administered body |
| hosting | Hosting | yes | Host → Hosted body |
| merger | Merger | yes | Antecedent body → Merged-successor body |
| affiliation | Affiliation | no | Affiliated institution (symmetric) |
| partnership | Institutional partnership | no | Partner institution (symmetric) |
| joint_operation | Joint operation | no | Joint operator (symmetric) |
| other | Institutional relationship | no | Associated institution (symmetric) |

Node-neutral and data-backed: a Node adds its own kinds as rows, never as code.

## Bounded read models

`get_person_network`, `get_organization_network`, `get_contribution_network`,
`get_event_network`, and `get_organization_relationships` — each `SECURITY
DEFINER`, `search_path` pinned, `auth.uid()` enforced in-body, revoked from
`PUBLIC`, granted to `authenticated` only, fail-closed. Each returns a **one-hop**
neighbourhood centred on one canonical record: only connections directly
justified by canonical Assertions involving the focal record. No two-hop, no
friend-of-a-friend, no client-side traversal. Merged counterpart people are
omitted; a merged/nonexistent focal returns null. Connections come back as one
flat, deterministically-ordered array (family, then chronology undated-last,
then label, then id).

### Return contract

```
{ focal: ProjectedNode,
  connections: [ { id, family, direction, node: ProjectedNode,
                   kind, perspective, temporal, provenance,
                   source: { type, id }, visibility } ] }
```

The projected `id` is deterministic (`"<source>:<rowId>"`) for rendering and
testing but is not a new historical assertion. The TypeScript shape is a
discriminated reading projection (`src/features/network/types.ts`), never a
database ontology.

## Production experience

Routes (all under the authenticated `(protected)` shell):

- `/network` — a reading-first landing that explains the network and points to
  the directories.
- `/network/people/[personId]`
- `/network/institutions/[organizationId]`
- `/network/contributions/[contributionId]`

Each focal page shows the focal record, a plain "what this shows" statement, an
honest connection count, connections grouped by historical meaning (Institutional
lineage, People, Institutions, Contributions, Events), each with a deterministic
one-sentence explanation, its period (where known), and provenance one keyboard-
operable gesture away; disputed/provisional states render a visible verification
badge. A reserved visual-map surface and an always-present "Limits of this view"
note make clear the network shows documented connections, not the totality of
history. Every canonical Person, Institution, and Contribution page gains an
honest entry link into its network neighbourhood, and **Network** is in the
primary navigation.

The **textual list is canonical**; a visual node-link diagram is deferred as an
honest reserved surface (ADR-0017 §8) — no fact lives only in a visualization,
and no large graph-visualization dependency was added.

## Copy

All connection sentences are derived deterministically from the canonical
assertion (labels, family, direction, kind/role) — no AI prose. No metric,
ranking, recommendation, prestige, popularity, influence, or social/engagement
language exists anywhere. A provisional connection never reads as confirmed; a
disputed one never reads as settled; an unknown date never becomes timeless.

## Sovereignty and governance

The projection shape carries a reserved `visibility` posture and the reads fail
closed, preserving the future ability to withhold sensitive, protected,
culturally restricted, private, sacred, community-restricted, or
security-sensitive connections without redesign. M7 implements no federation,
cross-Node synchronization, multi-tenancy, or Node administration. Absence from
the visible network is never presented as proof no connection exists. The
aggregation-harm review and the open governance questions are recorded in the
engineering report.

## Testing

- **pgTAP** (`supabase/tests/database/knowledge_network.test.sql`, 69 tests):
  vocabulary integrity, directionality/canonical-ordering/self-link/duplicate/
  temporal/provenance constraints, deny-by-default (tables + functions), every
  projection with canonical-source preservation, the no-inference guarantees,
  and empty/merged/nonexistent/ordering behaviour.
- **Vitest** (`tests/unit/network-{parse,derive,copy}.test.ts`): fail-closed
  parsing, discriminated node/family types, deterministic ids, temporal/
  provenance through the shared kernels, direct-vs-projected, absence of
  inferred edges, disputed/provisional/unknown copy, institutional inverse
  labels, and the absence of metric/ranking/social language.
- **Playwright** (`tests/e2e/network.spec.ts`): unauthenticated redirect, the
  index, person/institution/contribution neighbourhoods, every projection,
  symmetric/directional institutional relationships with inverse roles,
  disputed/provisional/unknown states, empty network, the incompleteness
  statement, no inferred edge from co-participation, production navigation, the
  canonical journey, keyboard access, axe, themes, 375px, and console/hydration
  cleanliness.

## Local validation

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

`npm run supabase:types` must run before `npm run typecheck`: the new
`get_*_network` / `get_organization_relationships` RPC names are added to
`src/types/database.types.ts` by the regenerated types.

## Refinement — infrastructure, not a product (supersedes "Production experience" above)

Ratified principle: the Knowledge Network is internal historical infrastructure; the canonical product remains the historical reading experience; the Network enriches reading rather than replacing it. In production there is no "Network" nav entry and no standalone destination: `/network` redirects to `/explore`; person and contribution connections read inline on their canonical pages (their `/network/...` routes redirect to the canonical pages); institution-to-institution lineage reads inline on the Institution page (the M6.5 reserved slot, now live). The institution neighbourhood `/network/institutions/[id]` is retained only as the Exhibition's network inspection surface. All ratified architecture is unchanged.
