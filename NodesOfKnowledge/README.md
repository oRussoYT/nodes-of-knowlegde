# NetPDBFF

NetPDBFF will document and connect all people who have participated in the
Biological Dynamics of Forest Fragments Project (PDBFF) across its
history — researchers, field assistants, students, staff, and
collaborators, past and present.

This repository currently contains the project foundation (tooling,
structure, documentation), the M3.1 identity-foundation database schema, and
an M4 email/password authentication vertical slice (see
`docs/authentication-implementation.md`). Profiles, person claiming,
institutions, and search are not implemented yet. See
`docs/development-roadmap.md` for what comes next.

## Stack

- [Next.js](https://nextjs.org/) (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- ESLint
- PostgreSQL via [Supabase](https://supabase.com/) (planned, not yet wired up)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Scripts

| Script              | Purpose                              |
| -------------------- | ------------------------------------ |
| `npm run dev`         | Start the development server         |
| `npm run build`       | Create a production build            |
| `npm run start`       | Run the production build             |
| `npm run lint`        | Run ESLint                           |
| `npm run typecheck`   | Run the TypeScript compiler (no emit) |
| `npm run test`         | Run unit tests (Vitest)              |
| `npm run test:e2e`     | Run end-to-end tests (Playwright; requires local Supabase — see below) |

## Project structure

```
src/
  app/          Next.js App Router routes, layouts, and global styles
  components/
    layout/     Structural, page-shell components
    ui/         Generic, reusable UI primitives
  features/     Feature modules (added as features are built)
  lib/          Shared utilities and integration code
  types/        Shared TypeScript types
  config/       Application-level configuration
docs/           Product, architecture, and data-model documentation
```

## Documentation

- `CLAUDE.md` — permanent project rules
- `docs/master-vision.md` — the platform vision (Nodes of Knowledge) and how
  NetPDBFF is its first Node (Node PDBFF); see also
  `docs/decisions/0010-platform-vision-nodes-of-knowledge.md`
- `docs/nodes-of-knowledge-design-bible-volume-1.md` — The Nodes of Knowledge
  Design Bible, Volume I (Scientific Identities & Institutional Memory): the
  product-philosophy foundation the vision rests on — why the platform exists,
  what a Scientific Biography is, and the design principles that guide every
  milestone (product philosophy, not implementation spec)
- `docs/nodes-of-knowledge-product-blueprint.md` — The Nodes of Knowledge
  Product Blueprint (First Constitutional Edition): the bridge from the Design
  Bible to the built platform — the product primitives, the conceptual engines
  (Scientific Biography, Timeline, Participation, Relationships, Institution),
  and the capability roadmap from which M6 implementation milestones emerge
  (Product Architecture, not implementation spec)
- `docs/nodes-of-knowledge-constitutional-validation-m6v.md` — The Nodes of
  Knowledge Constitutional Validation (M6.V): validates the Design Bible and
  Product Blueprint end-to-end against one real scientific life (G. Bruce
  Williamson at PDBFF); records the verdict that M6.1 may begin, and the
  provenance, participation, and knowledge-history findings behind it
- `docs/m6.1-scientific-biography-foundation.md` — M6.1 Scientific Biography
  Foundation: what the first production biography slice implements, defers, and
  reserves as extension points, plus the required local validation sequence
- `docs/m6.2-timeline-engine.md` — M6.2 Timeline Engine (the Historical
  Spine): the canonical event model, the nine-state temporal model, the
  `get_person_timeline` per-subject read boundary, what it defers, and the
  required local validation sequence
- `docs/m6.3-participation-engine.md` — M6.3 Participation Engine (bounded
  belonging): the `participations` assertion, the minimal `organizations`
  entity, the `participation_capacities` vocabulary, the shared temporal/
  provenance kernel, the `get_person_participation` read boundary, what it
  defers, and the required local validation sequence
- `docs/m6.4-relationship-engine.md` — M6.4 Relationship Engine (relationships
  as historical narratives): the one-canonical-record `relationships` model, the
  `relationship_kinds` vocabulary with directionality and inverse labels, the
  `get_person_relationships` both-side read boundary, ethics/governance notes,
  what it defers, and the required local validation sequence
- `docs/m6.5-institution-engine.md` — M6.5 Institution Engine (institutions as
  historical actors): the additive `organizations` extension, historical names,
  external identifiers, narrative facets, the `organization_events` Event
  projection, the three bounded `get_organization*` reads, the
  `/institutions/[organizationId]` page, sovereignty/ethics notes, what it
  defers, and the required local validation sequence
- `docs/m6.6-contribution-engine.md` — M6.6 Contribution Engine (contribution as a first-class historical object; ADR-0016; engineering report in `docs/m6.6-contribution-engine-engineering-report.md`)
- `docs/canonical-user-journey.md` — the canonical reading experience
  (Landing → Explore → People / Institutions / Contributions → detail pages)
  that the production application is built around, plus the governing rule
  that every future engine (M7+) integrates into production before any
  developer-exhibition representation
- `docs/m6-system-exhibition.md` — M6 System Exhibition: a development-only
  `/dev/exhibition` deterministic developer inspection environment and local
  seed world for inspecting deterministic examples and edge cases (fictional
  data, deterministic UUIDs, production-excluded; never duplicates the
  production browse)
- `docs/product-specification.md` — product scope and goals
- `docs/architecture.md` — modular-monolith architecture and planned modules
- `docs/database-model.md` — preliminary conceptual data model
- `docs/privacy-model.md` — visibility levels for personal information
- `docs/user-roles.md` — preliminary user roles
- `docs/controlled-vocabularies.md` — how domain vocabularies are managed
- `docs/development-roadmap.md` — phased build plan
- `docs/decisions/` — architecture decision records (ADRs)
- `docs/supabase-development.md` — local/hosted Supabase development setup
- `docs/database-implementation.md` — M3.1 identity-foundation schema
- `docs/authentication-implementation.md` — M4 email/password authentication
  (route map, Supabase clients, local Mailpit testing, security decisions)

## Environment variables

Copy `.env.example` to `.env.local` and fill in real values as they become
relevant. Never commit `.env.local` or any file containing real secrets.

## Internationalization

The interface language at launch is English. The codebase is structured to
support Portuguese as a future addition without requiring a rewrite — see
`docs/architecture.md`.

## M7 — Knowledge Network Engine

M7 connects the preserved records through a derived, provenance-preserving read model (no generic edge store, no universal Entity table, no graph database). See `docs/decisions/0017-knowledge-network-engine.md`, `docs/m7-knowledge-network-engine.md`, and `docs/m7-knowledge-network-engine-engineering-report.md`.

## M8 — Knowledge Revelation

M8 **reveals** what the preserved, connected record already demonstrates: it composes several canonical Assertions into the deterministic patterns their joint truth entails, decomposable back to them — no inference, similarity, recommendation, ranking, centrality, or interpretation. The design phase is ratified (the M8 Definitive Specification, Design Bible, Benchmarking Report, Critical Review, and Engineering Blueprint). **M8.1** implements the first lens — co-presence: the documented cohorts a person belonged to (other people at the same institution during overlapping periods), read inline on the biography. See `docs/decisions/0018-revelation-engine.md` and `docs/m8.1-co-presence-revelation.md`.

**M8.2** extends revelation to the **institution surface**: the *documented co-presence* within one institution — which participants the record places there at the same time as which others — read inline on `/institutions/[organizationId]` after its Participation/Contributions engines. It is the institution-vantage mirror of M8.1 (same `participations` composition, same pairwise overlap rule, decomposable back to the rows), reusing the M8.1 co-presence presentation. Event company (no event reading surface) and comparison C5 (its M8.3 lineage host) are deferred. See `docs/m8.2-institution-co-presence-revelation.md` and `docs/m8.2-institution-co-presence-revelation-engineering-report.md`.

**M8.3** adds the **lineage** family (C2): the documented **succession/formation descent** of an institution (kinds succession + merger), read inline on `/institutions/[organizationId]`, and the documented **mentorship descent** of a person (kind mentorship), read inline on `/people/[personId]`. Each is a bounded, cycle-safe transitive chain of same-kind directional records, each step decomposable to its canonical relationship row, both endpoints doorways; it records what followed what, never what followed from what. Comparison C5 is enabled but not assigned (deferred). See `docs/m8.3-lineage-institutional-evolution.md` and its engineering report.

**M8.4** adds the **continuity & rupture** family (C3): for one institution, the documented **coverage** of each participation capacity over time — the merged year-intervals of its dated `participations` and the silences between them — read inline on `/institutions/[organizationId]` after the M8.3 descent, alongside the institution's own recorded status and closure. It holds four honest states apart and never collapses them: continuation (an open-ended latest interval), rupture (the terminal status vocabulary + closure date), an evidentiary gap (a whole-year silence, never an end), and an unknown outcome (a record that merely stops — "not documented what followed", never "ended"). Every coverage span decomposes to its participation records; rupture is grounded only in the explicit `organizations.status`, never in the record's shape, and never dates a particular capacity's end. Recurrence (C4), bounded pathway (C6), and comparison (C5, enabled) remain deferred. See `docs/m8.4-continuity-rupture.md` and its engineering report.

**M8.5** adds the **recurrence** family (C4): the phenomena the record documents as having occurred more than once for a focal entity — for a person, the same role held again at an institution, events of the same kind, and contributions of the same kind (`reveal_person_recurrence`); for an institution, same-kind events and contributions (`reveal_organization_recurrence`, participations excluded — M8.4 continuity owns per-capacity coverage). Each groups the entity's own explicit assertions by a structural key and reveals each group with **≥ 2** distinct occurrences, with a plain count and the occurrences in time order (undated last), each decomposable to its canonical record. Recurrence is **not similarity**: a GROUP BY + COUNT over identical explicit key values — no AI, clustering, pattern mining, embedding, prediction, or inference. The count is a count of records, never a metric; groups are never ordered by count; a single documented occurrence is not recurrence. Read inline on `/people/[personId]` (after cohorts and lineage) and `/institutions/[organizationId]` (after continuity). Scope: single-entity repetition (ratified; the dyadic co-appearance count of Spec §3.5 is deferred). See `docs/m8.5-recurrence.md` and its engineering report.

**M8.6** adds the **bounded pathway** family (C6) — the final revelation capability: for a focal person and a **selected** target entity (person/institution/contribution/event, chosen via `?pathwayTo`), the shortest documented chain of **≥ 2** explicit-assertion steps connecting them through intermediaries, over the heterogeneous canonical graph (`relationships`, `organization_relationships`, `participations`, `person/organization_contributions`, `person/organization/contribution_events`, read undirected), bounded to a small hop cap (4) and cycle-safe, each step decomposable to its canonical row with both endpoints as doorways (`reveal_person_pathway`). It is governed by the **endpoint rule** (Spec §3.2): "a documented chain of N steps connects A and B", never "A is connected to B"; the length is a fact, never a rank; pathways are never ordered or scored by length; a no-chain result is an honest absence, never "not connected". Read inline on `/people/[personId]` after recurrence, with a calm "choose an entity" empty state and a minimal doorway on revealed cohort people (no console, no graph, no metric). The ≥ 2-step rule avoids overlap with M7's one-hop connection; composing across kinds avoids overlap with M8.3's same-kind descent. With M8.6, the M8 Revelation Engine (C1–C4, C6) is complete; interpretation belongs to M9. See `docs/m8.6-bounded-pathway.md` and its engineering report.

**M8.7** is the **final milestone of M8** — consolidation and constitutional closure, not a new lens. It re-audits M8.1–M8.6 as one engine and ships one production correction (a new append-only migration makes `reveal_person_pathway`'s minimal-chain choice deterministic across parallel edges by folding each edge's canonical source id into the ordering key — a determinism + decomposability fix, reproduced-then-fixed in a real Postgres), one fail-closed hardening (recurrence deduplicated by source id so a duplicated record can never fabricate a recurrence), two integrity-relevant consolidations (single `parseProvenance`/`parseSourceRef` evidence-contract parsers; shared `RevealedProvenanceFooter`/`NodeDoorway` reading primitives), and one **total constitutional-closure test** that sweeps the whole engine's reader-facing copy for forbidden interpretive frames. With M8.7 the **M8 Revelation Engine (C1–C4, C6) is complete**; comparison (C5) remains a deferred affordance and interpretation is M9's. Ratified next (not built): Projects as First-Class Historical Actors and the Historical Operators Architecture. See `docs/m8.7-consolidation-constitutional-closure.md` and its engineering report.
