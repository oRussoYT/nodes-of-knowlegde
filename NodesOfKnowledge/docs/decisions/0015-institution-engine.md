# 0015. Institution Engine: institutions as historical actors, extended additively from organizations

Date: 2026-08-03
Status: Accepted

## Context

Milestone M6.5 (Institution Engine) turns the fifth constitutional engine into
software, after Timeline (M6.2), Participation (M6.3, ADR-0013), and
Relationship (M6.4, ADR-0014). An Institution is a historical ACTOR -- it comes
into being, changes through time, organizes people and resources, produces
knowledge, preserves memory, and shapes conservation. It is not an employer, an
address, a logo, a container of people, an org chart, or a Node tenant. The
Design Bible's two clocks bind here: people enter/contribute/depart/die;
institutions endure/transform/merge/divide/move/decline/revive/preserve memory.
The engine must show both -- institutions outlast lives, and institutions are
continuously remade -- without portraying an institution as timeless or letting
a present-day identity overwrite historical ones.

M6.3 created a minimal `organizations` entity as the target of Participation.
M6.5 must NOT replace it or create a parallel identity table, must NOT
invalidate M6.3 Participation, must reuse canonical Events (M6.2) and
Participations (M6.3) by projection (never copies), and must reuse the shared
temporal/provenance kernels. It makes several durable decisions.

## Decision

**1. Extend `organizations` ADDITIVELY into an institutional identity -- no
parallel table.** New columns (`organization_type`, `status`, founding/closure
temporal, `location`, `website`, and the record's own `source_type`/
`verification_status`) all take defaults, so every existing organizations row
and every Participation pointing at it stays valid and naturally becomes part of
the Institution page. The canonical CURRENT name remains `organizations.name`.

**2. Model institutional transformation as a COMBINATION, not one mutable
field.** Founding/closure are temporal assertions; `status` (active | historical
| closed | dormant | merged | absorbed | succeeded | provisional |
status_unknown) is the operational/historical state -- distinct from
verification and from temporal precision. Renaming, relocation, merger, split,
succession, and dormancy are carried by institutional Events (M6.2, projected),
historical names, temporal assertions, and -- in a future additive step --
predecessor/successor Relationships. A current institution never erases a
predecessor; a successor does not automatically inherit a predecessor's
assertions. Historical continuity may be verified, provisional, disputed, or
unresolved.

**3. Historical names are first-class, not search synonyms
(`organization_names`).** Each carries the name form, language, a name type
(former | alternative | acronym | indigenous | local | translation), the period
it was used, provenance, and verification. An institution did not always have
its current name.

**4. External identifiers support interoperability, never authority
(`organization_external_identifiers`).** ROR / Wikidata / ISNI / VIAF / GRID /
national / archival schemes are optional; `unique(scheme, identifier_value)`
keeps one value mapping to one institution, but this NEVER auto-merges records
(duplicate resolution stays a governed process) and an external id NEVER defines
the institution's narrative, boundaries, sovereignty, or evidence.

**5. Institution types are data (`organization_types`); status is a fixed
vocabulary (a CHECK).** Types are an open, Node-neutral taxonomy in a lookup
table (not all institutions resemble universities/NGOs). Status is a small,
fixed state set expressed as a CHECK, exactly as `verification_status`/
`source_type` are -- the established pattern for stable state vocabularies,
versus lookup tables for open domain taxonomies (`event_kinds`,
`participation_capacities`, `relationship_kinds`, `organization_types`).

**6. Curated institutional narrative in distinct facets
(`organization_narrative`: introduction | overview | significance | legacy).**
Human-authored, provenance-bearing, one current per facet; never
auto-generated, never AI, never a mission statement presented as history. A
missing facet is an honest absence, distinct from the factual record.

**7. The institution timeline PROJECTS canonical Events
(`organization_events`) -- it never copies them.** The same `public.events` row
can appear on a person timeline (`person_events`) and an institution timeline
without contradictory copies (Many-Clocks). The TypeScript reuses the M6.2
timeline parser and components via an adapter.

**8. The institution's human history PROJECTS canonical Participation.**
`get_organization_participation` reads the SAME M6.3 `participations` rows from
the institution's perspective (the person is the counterpart), grouped by
capacity and ordered historically -- never a leaderboard or prestige hierarchy.
Equal dignity is binding. No second record exists; one Participation appears on
the person's biography AND the institution's page.

**9. Three bounded read functions, composed at the page (not a monolith).**
`get_organization` (identity + historical names + external identifiers +
narrative facets), `get_organization_timeline`, and
`get_organization_participation` -- each `SECURITY DEFINER`, `search_path`
pinned, `auth.uid()` required, `EXECUTE` to `authenticated` only, tables locked
deny-by-default. Independent evolution, bounded payloads, authorization
consistency, provenance preservation.

**10. Historical/closed/merged institutions are READABLE, not hidden.** Unlike a
merged PERSON (which the read model hides), an institution is returned for ANY
status; only a nonexistent id returns null. Predecessors are not redirected into
successors in a way that destroys their separate histories.

**11. Institution-to-institution Relationships are DEFERRED, not forced into
person columns.** M6.4 `relationships` is person<->person (typed `*_person_id`
FKs). M6.5 does NOT redesign it or invent unsupported polymorphism; it reserves
the institutional-relationship surface honestly on the page and documents the
additive path: a future generalization introduces entity-typed endpoints (or a
sibling institution-relationship table) behind the same read-model contract. An
institutional partnership is never fabricated from shared participants, shared
funding, co-appearance in a record, or proximity -- it requires its own
evidence.

**12. Contributions and Historical Records are reserved honest surfaces.**
Their conceptual sections render honest deferred states with extension points
(creator / custodian / holding institution / rights / access / provenance for
records; experiments / methods / monitoring / collections / datasets-as-entities
/ training / policy for contributions) -- CC2: the platform preserves the
history of knowledge-making, not raw datasets. Contribution is never inferred
from affiliation, and publications alone are not "contribution".

**13. Place is a single free-text `location`; sensitive-location governance is
deferred.** No precise coordinates, no territorial ownership implied from
activity, and Indigenous territory is not reduced to a location field.
Field-site / territory / dispersed-headquarters modeling is deferred.

**14. Route `/institutions/[organizationId]`, with discovery from
Participation.** Node-neutral route keyed by the organization UUID; the
`organizations` table is NOT renamed to match route copy. The person biography's
Participation now links each organization name to its Institution page -- the
minimal discovery needed to make institutions reachable. A directory/search is
deferred.

**15. `service_role` grants on the new tables**, following M6.2-M6.4 and the
M3.1 finding; tables stay RLS-enabled deny-by-default with no client
GRANT/policy (client read only via the three functions). The grant enables the
trusted server-side write path (no client authoring path in M6.5) and per-test
disposable fixtures.

## Alternatives considered

**A parallel `institutions` identity table.** Rejected: it would duplicate the
`organizations` identity, orphan M6.3 Participation, and force a join or a
migration to reconcile. Additive extension preserves M6.3 and keeps one identity.

**One monolithic `get_institution_page` RPC.** Rejected: an unstable, unbounded
payload coupling identity, timeline, and participation; three bounded reads
evolve and cache independently (the M6.1-M6.4 discipline).

**A single mutable status field for all transformation.** Rejected: it collapses
founding, renaming, relocation, merger, split, succession, and dormancy into one
value and erases predecessors. The Events + names + status + future-relationship
combination preserves change without rewriting history.

**Copying Events/Participation into institution-specific rows.** Rejected:
contradictory copies violate Many-Clocks; projection (organization_events; the
org-side participation read) keeps one canonical record.

**Forcing institution relationships into M6.4's person columns, or adding
polymorphism now.** Rejected: M6.4 is person<->person by typed FK; unjustified
polymorphism across five engines is premature. Deferred with a documented
additive path.

**Hiding historical/merged institutions (as merged people are hidden).**
Rejected: historical institutions must remain readable; hiding them destroys the
institutional memory this engine exists to preserve.

## Consequences

**Makes easier:** a first-class, provenance-bearing institution reading
experience that reuses the shared kernels, canonical Events, and canonical
Participation with no duplication; historical institutions stay readable;
sovereignty is supported by per-assertion provenance (multiple accounts can
coexist without a single "owner of truth"); the whole slice is testable end to
end (pgTAP, Vitest, Playwright).

**Makes harder:** institution<->institution relationships, Contributions, and
Historical Records await their own additive engines (reserved honestly now);
sensitive-location, sovereignty/dispute-governance, and duplicate-merge
workflows are documented open questions, not solved in code; the denormalized
narrative facets and external-id uniqueness are deliberate, reviewed choices.

## Relationship to other records

Extends the read-access and vocabulary patterns of ADR-0008/0009/0011/0012/0013/
0014 to a fifth engine; projects the M6.2 Event model (ADR-0012) and the M6.3
Participation model (ADR-0013); reuses the shared temporal/provenance kernels
(ADR-0013/0014). Implements the Institution primitive and the two-clocks
principle of the Design Bible / Product Blueprint, within
`docs/nodes-of-knowledge-constitutional-validation-m6v.md`. Respects CC1
(Participation is belonging; a Relationship is a bond; an Institution is an
actor -- none collapsed) and CC2 (knowledge-history, not a data repository). See
`docs/m6.5-institution-engine.md`.
