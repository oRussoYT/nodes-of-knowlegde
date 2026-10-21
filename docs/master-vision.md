# Master Vision — Nodes of Knowledge

## Status

**Living document.** Unlike an ADR (a point-in-time decision, see
`docs/decisions/`), this is the evolving picture of what the platform is and
is becoming. Keep it current as the platform changes. The founding decision
it rests on is
`docs/decisions/0010-platform-vision-nodes-of-knowledge.md`, which in turn
extends `docs/decisions/0007-netpdbff-first-vertical-general-research-infrastructure.md`.

Its philosophical foundation — why the platform exists, what a Scientific
Biography is, and the design principles that should guide every implementation
milestone — is developed at book length in
`docs/nodes-of-knowledge-design-bible-volume-1.md` (The Nodes of Knowledge
Design Bible, Volume I: Scientific Identities & Institutional Memory). That
book is product philosophy, not an implementation specification; this document
remains the operative, current-state picture of the platform.

That philosophy is translated into Product Architecture — the product
primitives, the conceptual engines, and the capability roadmap from which the
M6 implementation milestones emerge — in
`docs/nodes-of-knowledge-product-blueprint.md` (The Nodes of Knowledge Product
Blueprint, First Constitutional Edition). Like the Design Bible, it defines no
schema, API, or route; it is the bridge between the vision and implementation,
not implementation itself.

Both constitutional documents were validated end-to-end against one real,
incomplete scientific life in
`docs/nodes-of-knowledge-constitutional-validation-m6v.md` (M6.V — Validation
Through a Living Biography), which found no architectural contradiction,
ratified two Blueprint clarifications (the Participation boundary and the
knowledge-history boundary), and approved the verdict that M6.1 implementation
may begin.

This document describes intent and architecture. It is **not** a
description of what is built. Today, exactly one Node exists (Node PDBFF),
and the platform is deliberately a single-Node application. Everything here
about multiple Nodes is future capability the architecture must not
foreclose — not present functionality and not a commitment to dates.

## The platform in one paragraph

**Nodes of Knowledge** is a platform for the trustworthy, provenance-aware
documentation of knowledge-producing communities. Each participating
institution is one **Node**: its people, projects, outputs, places,
collections, participation history, relationships, and evidence — governed
by that institution and presented under its own identity. The platform is
being proven first on one real, demanding community, the Biological
Dynamics of Forest Fragments Project (PDBFF), delivered as the product
**NetPDBFF** — architecturally, the platform's first Node, **Node PDBFF**.

## Why it exists

The same hard problem recurs everywhere knowledge is produced: documenting
_who did what, when, with whom, and how we know_ — across decades, across
people who never signed up and may no longer be living, with honest handling
of uncertainty, inference, and dispute. Universities, field stations,
institutes, museums, archives, laboratories, and funders each face it, and
each mostly loses to it: the record fragments across personal memory, old
spreadsheets, and disconnected systems.

Nodes of Knowledge exists to be the durable, provenance-bearing home for
that institutional memory. The enduring asset is the **trusted record**
itself — the verified account of participation and connection — not any
particular interface, technology, or brand, all of which are replaceable.

## Core concepts

### Node

One institution's instance of the platform. The current application is one
Node (Node PDBFF). A Node has its own identity (brand, copy, domain
vocabulary) layered over the shared generic core.

### Generic core

The discipline-independent building blocks every Node needs: people,
organizations, places, projects, events, roles and participations, outputs,
collections and assets, relationships, evidence and provenance, time and
historical change, and the verification/uncertainty/dispute model — plus the
application shell, design tokens, and generic UI primitives. Lives in
`src/lib`, `src/types`, the design system, and the generic tables of the
implemented schema (`people`, `profile_claims`, `user_person_links`,
`reviewers`, `audit_logs`).

### Node skin (deployment-specific)

What varies per Node and _should_: brand identity (`src/config/site.ts`),
user-facing copy, domain vocabulary (PDBFF roles, research types, study
sites, as instances of the generic concepts), and deployment-scoped
identifiers (e.g. theme/cookie keys). Generalizing these would be a
mistake, not progress.

## The three-layer model

Every architectural decision keeps these distinct (from ADR-0007, named by
ADR-0010):

| Layer | What it is | Where it lives | Varies per Node? |
|---|---|---|---|
| Generic core | Discipline-independent concepts & infrastructure | `src/lib`, `src/types`, design system, generic schema | No |
| Domain vocabulary | A Node's terms as instances of generic concepts | Database/config data, content | Yes |
| Brand & copy | Identity, wordmark, prose, imagery | `src/config/site.ts`, page/feature copy, tokens | Yes |

The reviewer's test before naming a reusable component, type, or table
concept: **which layer does this belong to?** Name and scope it there. Name
reusable things for what they generically are (`ParticipationTimeline`),
never for the first Node (`PdbffHistoryCard`).

## Current state (single Node)

- Implemented data model is already generic: `people`, `profile_claims`,
  `user_person_links`, `reviewers`, `audit_logs`. No `pdbff_`-prefixed
  tables are built; the domain-vocabulary tables discussed in
  `docs/database-schema.md` are _proposed_, not implemented.
- Design system, application shell, and navigation config are
  domain-neutral by deliberate discipline (see `src/components/ui/README.md`).
- The deployment's public identity is centralized in `src/config/site.ts`
  (`SITE_NAME`, `SITE_DESCRIPTION`, `pageTitle()`) — the Node "skin" as
  configuration rather than as literals scattered through components.
- The single-institution assumption is otherwise expressed only as it
  should be: in branding, copy, domain vocabulary, and deployment-scoped
  identifiers.

## What must NOT be built ahead of a real second Node

No multi-tenancy; no organization/institution/Node tables or IDs; no tenant
routing; no cross-node synchronization, federation, or distributed search;
no deployment-configuration layer; no public API or infrastructure changes.
These become real work only when a milestone — driven by an actual second
Node's actual requirements — calls for them. Building them now would be
speculation shaped by imagined rather than real needs. See ADR-0010 §8 and
the "DO NOT IMPLEMENT" boundary of milestone M5.6.

## Relationship to the roadmap

This vision does not change `docs/development-roadmap.md`. The near-term
sequence remains building out Node PDBFF's own features (profiles,
participation history, institutions, nominations, relationships, projects,
publications, forum, search, analytics, administration, i18n). The vision
governs _how_ those are built — generic core kept generic, Node skin kept
configurable — not _what_ ships next or when.

## How to keep this document honest

When a milestone changes the platform's shape, update the relevant section
here in the same change. When a genuinely new, hard-to-reverse platform
decision is made, record it as a new ADR and reference it from here. Resist
the temptation to describe aspirational capability as if it exists — the
"current state" section must always describe the software as it actually is.
