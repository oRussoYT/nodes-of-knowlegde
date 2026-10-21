# 0007. NetPDBFF as the first vertical of a general research-infrastructure platform

Date: 2026-08-01
Status: Accepted

> Extended and named by
> [ADR-0010 — Platform Vision: Nodes of Knowledge](0010-platform-vision-nodes-of-knowledge.md).
> ADR-0010 gives the "general research-infrastructure platform" described
> here its name (**Nodes of Knowledge**), calls each institution a **Node**,
> frames this application as the first Node (**Node PDBFF**), and adds the
> living `docs/master-vision.md`. This ADR's three-layer model and
> guardrails remain in force unchanged.

## Context

NetPDBFF is being built, right now, as a platform for one specific
research community: PDBFF, its Amazonian conservation and tropical-ecology
mission, and the people who have participated in it since 1979. Every
document produced so far — `docs/product-specification.md`,
`docs/ui-vision.md`, `docs/database-schema.md` — is correctly, deliberately
rooted in that identity, and this ADR does not change that.

Separately, there is a longer-term strategic intent: the same underlying
problem — documenting people, organizations, places, projects, outputs,
relationships, and evidence, with honest handling of time, uncertainty,
and verification — recurs across universities, long-term research
stations, research institutes, museums, archives, laboratories, funding
organizations, and other knowledge-producing institutions. NetPDBFF is the
first real, load-bearing test of whether that underlying architecture can
be discipline-independent, without ever becoming a generic, unfocused
product today.

This ADR exists to make that intent explicit and boundaried *now*, while
M5's architecture is still being decided, rather than discovering it as an
afterthought once PDBFF-specific naming and assumptions are already load-
bearing throughout the codebase — which would be far more expensive to
unwind later. It does not authorize building that broader platform. It
authorizes building NetPDBFF's own architecture in a way that doesn't
foreclose it.

## 1. Decision

**NetPDBFF is the first domain-specific implementation of a broader,
discipline-independent research-infrastructure architecture.** The
product being built, marketed, and delivered is NetPDBFF — a platform for
PDBFF's human network. The *architecture* underneath it should be built so
that "PDBFF" and "Amazonian conservation" are the first configuration of a
more general pattern, not permanent, load-bearing assumptions baked into
the reusable parts of the system. Nothing about NetPDBFF's current scope,
mission, branding, or delivery timeline changes as a result of this
decision.

## 2. Strategic distinction

Three layers, kept conceptually distinct from this point forward in every
architectural decision:

1. **Generic platform concepts** — discipline-independent building blocks
   that any research-documentation platform would need (see "Generic core
   concepts" below). These belong in `src/lib`, `src/types`, and shared,
   domain-neutral component/token architecture.
2. **NetPDBFF-specific domain vocabulary** — PDBFF's actual terms:
   participation roles (`pdbff_roles`), research types, study sites,
   forest-fragment-specific concepts. These are a specific *instance* of
   the generic concepts, not a different thing — see the mapping below.
   They belong in NetPDBFF's own domain/config layer and content, not in
   generic component or type names.
3. **Institution-specific configuration and branding** — the layer that
   doesn't exist yet for anyone but NetPDBFF: visual theming, terminology
   substitution (e.g., a museum might say "object" where NetPDBFF says
   "specimen" or "record"), and institution-specific controlled
   vocabularies. NetPDBFF's own branding and copy are the first, and
   currently only, instance of this layer — see "UI implications for M5."

The discipline this ADR asks for is simple to state and easy to violate
by accident: before naming a reusable component, type, or table concept,
ask which of these three layers it actually belongs to, and name/scope it
accordingly.

## 3. Generic core concepts

The reusable platform, in its eventual general form, should be capable of
representing: people; organizations; places; projects; events; roles and
participations; outputs; collections and assets; relationships; evidence
and provenance; time and historical change; verification, uncertainty,
and disputes.

**This section does not redesign `docs/database-schema.md`.** No table,
column, or constraint changes as a result of this ADR. What follows is an
illustrative mapping, useful for judging future naming decisions, not a
migration plan:

| Generic concept | NetPDBFF's current instance |
|---|---|
| People | `people` |
| Organizations | `institutions` |
| Places | `study_sites`; institution city/state/country fields |
| Projects | `projects` |
| Events | *Not yet represented* — NetPDBFF's schema models continuous participation spans (`pdbff_participations`), not discrete events. The generic model is a superset of what NetPDBFF has built, not a mirror of it; this gap is noted, not filled, by this ADR. |
| Roles and participations | `pdbff_roles`, `participation_roles`, `pdbff_participations` |
| Outputs | `publications` |
| Collections and assets | `media_assets`, `external_links` |
| Relationships | `person_relationships`, `relationship_types` |
| Evidence and provenance | `relationship_evidence`, `verification_reviews`, `audit_logs`, and the Provenance Model in `docs/database-schema.md` generally |
| Time and historical change | Participation-period date ranges, `participation_roles` sub-ranges, the Provenance Model's "Corrections" pattern |
| Verification, uncertainty, disputes | `verification_status`, `origin`, `confidence_level`, and every status model in `docs/database-schema.md` |

The mapping shows NetPDBFF's schema already, mostly by good practice
rather than deliberate planning, keeps domain vocabulary (`pdbff_roles`,
`research_types`) layered on top of generic shapes (a roles-and-
participations join pattern, a controlled-vocabulary pattern) rather than
fused into them. That existing discipline is what this ADR asks to
continue and make deliberate — not a new direction.

## 4. UI implications for M5

- **Reusable components must not be named after PDBFF-only concepts.**
  `docs/design-system-architecture.md`'s component family
  (`Button`, `Card`, `Badge`, `EmptyState`, `AppShell`, etc.) is already
  entirely domain-neutral naming — this ADR confirms that naming
  discipline as a requirement going forward, not just a stylistic
  accident. A future component showing participation history should be
  named for what it generically is (e.g. `ParticipationTimeline`), not for
  PDBFF specifically (not `PdbffHistoryCard`).
- **Generic application-shell components remain domain-neutral.**
  `AppShell`, `PublicHeader`, `ProtectedHeader`, `MobileNavigation`, and
  the token system in `docs/design-system-architecture.md` carry no PDBFF-
  specific assumption today and must continue not to — they compose
  NetPDBFF's identity, they don't encode it structurally.
- **NetPDBFF branding, imagery, and copy form the first product skin.**
  The restrained, scholarly, Amazonian-history-aware visual identity in
  `docs/ui-vision.md` is real and should not be diluted — but
  architecturally, it is applied *through* the token and content layer
  (colors, wordmark, copy, any future documentary imagery), not hard-coded
  into component logic. A component should not need to know it's rendering
  for a conservation-research platform to render correctly.
- **Future institutional theming must remain possible.** The token-driven
  approach already chosen in `docs/decisions/0002-theming-and-server-client-theme-handling.md`
  and `docs/design-system-architecture.md` (semantic tokens, not hard-coded
  values in components) is what makes this possible later. Nothing further
  needs to change for M5 to keep this door open — it already does. No
  multi-brand/multi-tenant theming mechanism is built in M5.
- **Dashboard shells must be able to support laboratories, universities,
  museums, long-term field stations, and research centres**, in the sense
  that the dashboard pattern defined in
  `docs/application-information-architecture.md` (status header, real
  summary, honest `EmptyState` sections, quick links) is a generic shape
  for "here is what we know about your involvement here so far," not a
  PDBFF-specific layout. M5 still builds only the NetPDBFF instance of it.
- **Domain-specific future components may remain explicitly
  NetPDBFF-specific.** This ADR does not ask every future component to be
  generic. A future forest-fragment site map, a PDBFF-specific research-
  timeline visualization, or PDBFF-specific vocabulary displays are
  expected to be named and built for exactly what they are. The boundary
  is the *reusable core* (shells, tokens, generic primitives), not
  everything the product ever builds.

## 5. Product implications

- Individual researchers and community contributors may receive free
  access to NetPDBFF.
- Institutional licensing and services are a possible future business
  model for the broader platform this architecture could support.
- Pricing, commercialization, and enterprise functionality are **not**
  decisions being made or implemented in M5, or implied as imminent by
  this ADR.
- Trusted data, provenance, institutional memory, and network effects
  (the accumulated, verified record of who participated in what, and how
  people connect) are the central long-term strategic asset — not a
  particular UI, a particular tech stack, or a particular visual brand.
  Everything else is replaceable; the trustworthy record is not.

## 6. Guardrails

This ADR's general-platform vision must not:

- Cause premature multi-tenant or enterprise implementation — no tenancy
  model, organization-level billing, or multi-institution data isolation
  is designed or built as a result of this decision.
- Broaden M5's scope. `docs/m5-application-ui-design-system.md`'s scope
  and "must not implement" list are unchanged by this ADR — see the
  cross-reference added there.
- Weaken NetPDBFF's current mission, identity, or visual language.
  `docs/ui-vision.md`'s Amazonian-history-aware, PDBFF-rooted personality
  is not diluted, genericized, or hedged by this decision.
- Introduce speculative database abstractions. `docs/database-schema.md`
  is not redesigned, generalized, or refactored toward the mapping in
  Section 3 as a result of this ADR — that mapping is descriptive, not a
  work item.
- Delay delivery of the initial conservation-focused product. This ADR
  adds a naming and layering discipline to work already planned; it does
  not add new work, new milestones, or new review gates before M5 or any
  currently planned milestone can ship.

## Alternatives considered

**Build NetPDBFF as a fully bespoke, single-purpose product with no
consideration of reuse.** The simplest option, and not unreasonable on its
own — but it risks exactly the accidental-naming and fused-abstraction
problem this ADR heads off cheaply, while it's still cheap: if PDBFF-only
naming and assumptions became load-bearing throughout `src/components`
and `src/lib` before anyone thought about the boundary, disentangling them
later (if the platform-reuse opportunity is ever pursued) would be a
significant rewrite rather than a naming discipline.

**Design and build the general platform first, then instantiate NetPDBFF
as its first configured tenant.** Rejected clearly and deliberately — this
is precisely the premature-generalization failure mode the guardrails
exist to prevent. It would delay NetPDBFF's actual delivery, guess at
requirements from a second, third, and fourth vertical that don't exist
yet, and produce abstractions shaped by speculation rather than by a real
product's real needs. NetPDBFF must be built as an excellent, focused
product first; generality is a property to preserve along the way, not a
system to build ahead of it.

## Consequences

**Makes easier:** if the platform-reuse opportunity is pursued later,
extracting a generic core is a naming/refactoring exercise on top of
architecture that was never fused to PDBFF specifics in the first place —
not a rewrite. Reviewing future component and type names has a clear,
cheap test ("which of the three layers does this belong to?").

**Makes harder:** requires ongoing, deliberate discipline during M5 and
every later milestone — it's easy to reach for a PDBFF-specific name out
of convenience, and this ADR asks reviewers to catch that consistently
rather than fix it opportunistically later.

## Risks

The main risk is this ADR itself being over-applied — read as license to
gold-plate M5 with generality it doesn't need yet. The Guardrails section
exists specifically to make that misreading easy to catch in review:
anything in an M5 diff that looks like tenancy, billing, organization
switching, or a new abstraction layer beyond naming discipline is out of
scope, regardless of how this ADR is invoked to justify it.
