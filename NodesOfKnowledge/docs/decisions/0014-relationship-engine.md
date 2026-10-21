# 0014. Relationship Engine: bonds as historical narratives, one canonical record, and directionality with inverse labels

Date: 2026-08-03
Status: Accepted

## Context

Milestone M6.4 (Relationship Engine) turns the fourth constitutional engine of
Nodes of Knowledge into software, after Timeline (M6.2, ADR-0012) and
Participation (M6.3, ADR-0013). A Relationship is a historically meaningful
BOND between entities -- who was connected, the nature of the bond, when it
existed, how it changed, the context in which it mattered, the evidence for it,
and its verification. It must read as history and interpretation, not as a
social graph, a contact list, or a follower connection.

The ratified documents bind this precisely. **CC1** separates it from
Participation: Participation is bounded belonging/inclusion within a larger
context (a student belonging to an institution); a Relationship is a bond
between entities (a student mentored by a scientist). They are not one generic
model. A Relationship is also distinct from an **Event** (M6.2): an Event is
something that happened; a Relationship is a bond that may persist, change,
deepen, weaken, pause, resume, or end -- Events may mark stages in it but never
replace it. A relationship value **never implies truth** and is **never
inferred** from co-authorship, shared institutions, overlapping dates, or graph
proximity (CLAUDE.md: "Never treat an inferred relationship as a confirmed
relationship"). The Many-Clocks temporal discipline and the provenance-first
philosophy (already shared by Timeline and Participation) apply unchanged, and
Node Independence requires one architecture for every Node.

M6.1-M6.3 established the pattern: subject tables locked deny-by-default, read
only through a per-capability `SECURITY DEFINER` function returning `jsonb`;
data-backed generic vocabularies; and the shared temporal/provenance kernel
(`src/features/shared`). M6.4 makes several durable decisions not covered by an
existing ADR.

## Decision

**1. Model a Relationship as ONE canonical record between a source and a target
person -- never a pair of mirror rows.** `public.relationships` holds a single
row per bond: `kind`, `source_person_id`, `target_person_id`, an optional
curated `narrative`, the shared temporal model, and provenance/verification. A
future or malicious duplicate mirror is structurally impossible (decision 3).
CC1/Event boundaries are enforced by keeping this model separate from
`participations` and `events` -- the same real-world moment may produce an
arrival Event, a belonging Participation, and an enduring Relationship, each in
its own model.

**2. Project the one record onto BOTH entities' pages with correct inverse
labels via `public.get_person_relationships(uuid)`.** The read function, called
with either person, computes THAT person's perspective: their role, the
counterpart's role and its inverse label (singular + plural), and the direction
(`outgoing`/`incoming`/`symmetric`). So a single mentorship record reads as
"Bob, under Students" on the mentor's page and "Alice, under Mentors" on the
student's page, with no duplication and no client re-computation. This is the
same locked-table + `SECURITY DEFINER` + `auth.uid()` + `EXECUTE`-to-
`authenticated` discipline as ADR-0011/0012/0013; grouping (by the
counterpart's role) is the client's job, so the read model stays a flat,
ordered, testable document.

**3. Encode directionality and reciprocity in the vocabulary, and store
symmetric bonds canonically.** `public.relationship_kinds` declares, per kind,
`is_directional` and the role each end plays -- `source_role_label`/
`target_role_label` (plus plural forms for group headings). Directional kinds
name two distinct roles (Mentor/Student); symmetric kinds repeat one
(Collaborator/Collaborator), enforced by a CHECK. On `relationships`,
`is_directional` is denormalized and FORCED to match its kind by a composite FK
`(kind, is_directional) -> relationship_kinds(key, is_directional)`; that lets a
CHECK guarantee **canonical reciprocal storage**: a symmetric bond must have
`source_person_id < target_person_id`, so `(A,B)` and `(B,A)` can never both
exist, while directional bonds keep source/target meaning (A->B and B->A are
distinct). A `unique(kind, source, target)` prevents exact duplicates, and a
CHECK forbids self-relationships.

**4. Relationship kinds are data, not a hardcoded enum.** A seed of generic,
Node-neutral kinds (mentorship, advising, interview, succession, collaboration,
co-research, field partnership, community collaboration, technical
collaboration, correspondence, other). Node-specific bonds are added as DATA;
institution/project/object-of-study kinds arrive with the Institution and
Contribution engines; **family kinds are deliberately NOT seeded** -- they are
ethically sensitive (living relatives, vulnerable individuals, power
asymmetries) and left as an open governance question, not decided in code.

**5. Person-to-person only now; entity-neutral in shape, but NOT polymorphic.**
The smallest complete slice is person<->person, read inside the Scientific
Biography. The model's shape (a source, a target, a kind, direction, temporal,
provenance, narrative) extends without redesign to person<->institution,
institution<->institution, etc. -- but M6.4 does **not** build a polymorphic
`(entity_type, entity_id)` source/target, the universal Entity Engine, or the
Institution Engine. **Tradeoff:** typed `*_person_id` FKs give real referential
integrity and simple, index-friendly queries now, at the cost of a future
migration to generalize the endpoints when other entities exist. That
migration is a well-understood, additive reshape (introduce endpoint tables or
polymorphic columns behind the same read-model contract), and is cheaper and
safer than carrying unjustified polymorphic complexity through four engines
that today only have people. Documented as "Deferred universal entity support".

**6. An optional curated narrative, distinct from the factual record.**
`relationships.narrative` is human-authored prose (how the bond began, its
meaning, how it changed, why it matters), never auto-generated, never AI, never
fabricated from sparse facts; a blank narrative is rejected, and a missing
narrative is an honest absence (the bond still shows its who/role/period/
provenance). This keeps narrative-as-assertion distinct from the structured
facts, consistent with M6.1's `person_narrative`.

**7. Equal historical dignity across roles.** The read model and UI rank no
relationship above another: bonds are grouped by the counterpart's role and
ordered by earliest involvement (never by academic prestige), so a bond with a
mateiro, technician, field assistant, or community collaborator receives the
same treatment as one with a senior scientist. No metrics, scores, or
engagement surfaces exist.

**8. `service_role` grants on the two new tables**, following M6.2/M6.3 and the
M3.1 finding; tables stay RLS-enabled deny-by-default with no client
GRANT/policy (client read only via `get_person_relationships`). The grant
enables the trusted server-side write path (no client relationship-authoring
path in M6.4) and per-test disposable fixtures.

## Alternatives considered

**Two mirror rows per bond (one per direction).** Rejected: it is the
"contradictory mirror records" the brief forbids; updates and provenance would
diverge. One canonical record + perspective projection is correct.

**A polymorphic `(source_type, source_id, target_type, target_id)` now.**
Rejected/deferred: unjustified by a schema that today has only people; it
sacrifices referential integrity and query simplicity for a generality nothing
yet uses. Typed person FKs now; generalize additively when entities exist.

**Relationship kind as a hardcoded enum.** Rejected: violates "vocabularies are
data, not code"; a Node could not add a bond without a migration, and
directionality/labels would be baked into code.

**Inferring relationships from co-authorship / shared institutions / overlap.**
Rejected categorically: that is exactly what a Relationship is NOT. Inference
may later be a librarian *suggestion*, never confirmed history.

**Folding relationships into Participation or Events.** Rejected: CC1 and the
Event boundary keep the three distinct; sharing the temporal/provenance kernel
gives consistency without conflation.

**Seeding family relationship kinds.** Deferred: ethically sensitive; needs
governance (living relatives, vulnerable individuals, consent, power). The
vocabulary can add them as data once that is settled.

## Consequences

**Makes easier:** a real, provenance-bearing, honestly-uncertain record of the
bonds that shaped a scientific life, projected onto both entities without
duplication; the shared kernels mean no new temporal/provenance code; grouping
by counterpart role gives dignity-preserving reading; the whole slice is
testable end to end (pgTAP, Vitest, Playwright).

**Makes harder:** generalizing endpoints to other entity types will need an
additive migration (accepted tradeoff); relationships are service-role/admin-
authored with no client editorial workflow yet (deferred, as narrative/events/
participations were); family and other sensitive kinds await governance.

## Relationship to other records

Extends the read-access pattern of ADR-0008/0009/0011/0012/0013 to a fourth
engine, and the data-not-code vocabulary rule
(`docs/controlled-vocabularies.md`) with `relationship_kinds`. Implements the
Relationship primitive of `docs/nodes-of-knowledge-product-blueprint.md` under
CC1 and the Event boundary, within
`docs/nodes-of-knowledge-constitutional-validation-m6v.md`. Shares the
Many-Clocks temporal kernel and provenance kernel first built for
`docs/decisions/0012-timeline-engine.md` and extracted in
`docs/decisions/0013-participation-engine.md`. Respects **CC1** (a bond between
entities, not belonging) and **CC2** (no dataset/repository behavior). See the
implementation summary in `docs/m6.4-relationship-engine.md`.
