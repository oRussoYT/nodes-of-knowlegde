# 0010. Platform Vision — Nodes of Knowledge

Date: 2026-08-02
Status: Accepted

## Context

`docs/decisions/0007-netpdbff-first-vertical-general-research-infrastructure.md`
already established, while M5's architecture was being decided, that
NetPDBFF is the first domain-specific implementation of a broader,
discipline-independent research-infrastructure architecture, and that
reusable code must stay layered above PDBFF-specific vocabulary rather than
fused to it. That ADR did its job: the M5 codebase reaching this point is,
by deliberate discipline, already platform-clean — the implemented schema
uses generic names (`people`, `profile_claims`, `user_person_links`,
`reviewers`, `audit_logs`), the design-system primitives and navigation
config are domain-neutral, and the only PDBFF-specific strings in code are
legitimate product branding, deployment-scoped storage keys, and rationale
comments.

What ADR-0007 did **not** do is give that broader platform a name, a shared
vocabulary, or a single foundational document every future milestone can be
measured against. It spoke of "a general research-infrastructure platform"
and "verticals." Without a concrete name and a canonical concept model,
that vision stays abstract: easy to nod at, hard to hold a specific
architectural decision accountable to. This milestone (M5.6) exists to fix
that — to align terminology and documentation with the long-term platform
vision **before** M6 adds new features, so the vision is load-bearing
guidance rather than folklore.

This ADR names the platform and formalizes its concept model. It does not
change how the software behaves, does not broaden product scope, and does
not authorize building the multi-institution platform. It authorizes
continuing to build NetPDBFF in a way that does not foreclose it, now with
shared words for what "it" is.

## 1. Decision

**The platform is named _Nodes of Knowledge_. Each participating
institution is one _Node_. The running application is that platform's first
Node — _Node PDBFF_ — delivered to the public under its existing product
name, NetPDBFF.**

Nothing about NetPDBFF's current scope, mission, branding, routes, data, or
delivery timeline changes as a result of this decision. "Node PDBFF" is an
_architectural and strategic_ framing of the same application users already
use; it is not a rename, a new UI, or a new tenant abstraction. NetPDBFF
remains the product name shown to people.

This ADR extends and names the vision of ADR-0007; it does not supersede
it. ADR-0007's three-layer model and guardrails remain in force and are
restated here in the platform's now-shared vocabulary.

## 2. Why the platform exists

The same underlying problem — documenting people, organizations, places,
projects, outputs, relationships, and evidence, with honest handling of
time, uncertainty, and verification — recurs across universities, long-term
research stations, research institutes, museums, archives, laboratories,
funding bodies, and other knowledge-producing institutions. Each currently
solves it, if at all, with fragmented personal memory, aging spreadsheets,
and disconnected records. Nodes of Knowledge exists to be the trustworthy,
provenance-aware home for that institutional memory — first proven on one
real, demanding community (PDBFF) rather than guessed at from an abstract
requirements document.

The central long-term asset is the **trusted, provenance-bearing record** —
the accumulated, verified account of who participated in what, and how
people and institutions connect. Not a particular UI, tech stack, or visual
brand; those are replaceable. The trustworthy record is not.

## 3. What a Node is

A **Node** is a single institution's instance of the platform: its people,
its projects and outputs, its places and collections, its participation
history, its relationships and evidence — governed by that institution and
presented under its own identity. The current application is exactly one
Node (Node PDBFF), and today the platform is, deliberately, a
single-Node application.

Illustrative future Nodes (naming only, none authorized or built by this
ADR): Node PDBFF, Node Cocha Cashu, Node Mamirauá, Node Museu Goeldi, Node
Smithsonian, Node Redpath Museum, Node AMNH.

## 4. Kinds of Nodes that may exist

The generic model must be able, _eventually_, to represent Nodes for:
long-term field stations and research programs (the PDBFF case), university
departments and research groups, standalone research institutes,
natural-history and other museums, archives and special collections,
laboratories, and funding organizations. A Node may eventually hold:
people, projects, publications and other outputs, archives, collections,
events, expeditions, research sites, species, datasets, relationships, and
timelines. This is a statement of _capability the architecture must not
foreclose_, not a schema, a backlog, or a promise of dates.

## 5. Why NetPDBFF becomes Node PDBFF

NetPDBFF was built as an excellent, focused product for one community. That
focus is a feature, not a limitation to be genericized away (ADR-0007's
rejected "build the general platform first" alternative). Framing it as
_Node PDBFF_ does three things at zero behavioral cost:

- It makes the single-institution assumption **visible** — an assumption
  named is an assumption reviewers can catch when it leaks somewhere it
  shouldn't.
- It gives the deployment/"skin" layer (branding, copy, controlled
  vocabularies) a name — the thing that varies per Node — distinct from the
  generic core that does not.
- It sets the expectation for every future milestone: build the Node
  well; keep the core generic; add tenancy/federation only when a real
  second Node makes those requirements concrete, never before.

## 6. Which concepts must remain generic

Restating ADR-0007 §3 in platform vocabulary — these belong to the generic
core (`src/lib`, `src/types`, the design system, the implemented schema's
generic tables) and must never be named or shaped after PDBFF specifically:
people; organizations; places; projects; events; roles and participations;
outputs; collections and assets; relationships; evidence and provenance;
time and historical change; verification, uncertainty, and disputes; plus
the application shell, design tokens, and generic UI primitives.

Reusable components must be named for what they generically are
(`ParticipationTimeline`), never for the first Node (`PdbffHistoryCard`).

## 7. Which concepts remain deployment-specific (per Node)

These form a Node's "skin" and are _correctly_ specific — generalizing them
would be a mistake, not progress:

- **Brand identity** — product name and tagline (`src/config/site.ts`),
  wordmark, visual identity, documentary imagery.
- **Copy** — user-facing prose, including sentences that name the product
  (e.g. "Sign in to your NetPDBFF account."). This is translatable content
  (see i18n-readiness in `docs/architecture.md`), owned by the copy/i18n
  layer, not spliced from code constants.
- **Domain vocabulary** — a Node's actual terms as an _instance_ of the
  generic concepts: PDBFF participation roles, research types, study sites,
  forest-fragment concepts. These are data/config and content, never baked
  into generic component or type names.
- **Deployment-scoped identifiers** — e.g. the `netpdbff-theme` /
  `netpdbff_recovery_flow_hint` storage and cookie keys. Namespacing these
  per deployment is good practice; changing their values would break
  existing clients and is explicitly out of scope.

## 8. Architectural principles every future milestone must respect

1. **Three layers, always distinguished** — generic core vs. per-Node
   domain vocabulary vs. per-Node branding/config. Before naming a reusable
   component, type, or table concept, decide which layer it belongs to and
   name/scope it accordingly (ADR-0007's test, unchanged).
2. **The first Node stays excellent and focused.** Generality is a property
   preserved along the way, never a system built ahead of a real second
   Node's real requirements.
3. **No premature platform machinery.** No multi-tenancy, organization/
   institution/Node tables or IDs, tenant routing, cross-node sync,
   federation, distributed search, deployment-config layer, or public API
   is designed or built until a milestone explicitly calls for it. (These
   are exactly M5.6's "DO NOT IMPLEMENT" list.)
4. **Trust and provenance are the asset.** Decisions that would weaken the
   integrity, auditability, or provenance of the record are suspect by
   default, regardless of convenience.
5. **Behavior-preserving alignment.** Terminology and documentation may be
   aligned to this vision at any time; doing so must never change runtime
   behavior, product scope, or the Node's mission and visual language.

## Consequences

**Makes easier:** future architectural decisions now have a named vision
and a canonical concept model to be measured against, and this document is
the foundation later ADRs can reference instead of re-deriving. If a second
Node is ever pursued, the work is naming/configuration/refactoring on an
already-layered base, not a rewrite.

**Makes harder:** it adds a standing discipline — every milestone must keep
distinguishing the three layers and resist premature platform machinery.
The Guardrails/Risks of ADR-0007 apply unchanged: the main risk is
_over_-applying this vision, reading it as license to build tenancy or
abstractions M6+ don't need yet. Anything in a diff that looks like tenancy,
Node IDs, org tables, federation, or an abstraction layer beyond naming and
configuration discipline is out of scope, regardless of how this ADR is
invoked to justify it.

## Relationship to other records

- **Extends and names** `docs/decisions/0007-netpdbff-first-vertical-general-research-infrastructure.md`
  (now Accepted). 0007's layering model and guardrails are the mechanism;
  this ADR supplies the name (Nodes of Knowledge / Node), the concept
  model, and the foundational document.
- **Companion document:** `docs/master-vision.md` — the living, non-ADR
  home for the platform vision, kept current as the platform evolves; this
  ADR is the point-in-time decision, that document is the evolving picture.
