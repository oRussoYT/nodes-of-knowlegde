# 0011. Scientific Biography read model, narrative-as-assertion, and the M6.1 route boundary

Date: 2026-08-03
Status: Accepted

## Context

Milestone M6.1 (Scientific Biography Foundation) is the first production
implementation of the Digital Scientific Biography defined by the ratified
constitutional documents (`docs/nodes-of-knowledge-design-bible-volume-1.md`,
`docs/nodes-of-knowledge-product-blueprint.md`) and validated by
`docs/nodes-of-knowledge-constitutional-validation-m6v.md` (verdict: "M6.1
may begin"). It must render a real, database-backed biography — identity and
an introductory narrative — honestly, provenance-aware, for an authenticated
authorized reader, without building the later engines (Timeline,
Participation, Relationships, Institution, Legacy).

The implemented schema (`supabase/migrations/`) holds only the identity
foundation: `people`, `profile_claims`, `user_person_links`, `reviewers`,
`audit_logs`. `people` is fully locked at the table level (RLS on, no client
GRANT/policy); reads happen only through `SECURITY DEFINER` functions
(ADR-0008, ADR-0009). There is no narrative-as-assertion structure and no
per-field visibility system. M6.1 therefore requires the smallest durable
new schema plus a canonical read model, and must make three durable
decisions not covered by an existing ADR.

## Decision

**1. Add `public.person_narrative` — narrative as a first-class authored
assertion, separate from the factual record.** The Product Blueprint requires
narrative to be a first-class, human-authored assertion carrying its own
authorship and provenance, distinct from the structured facts.
`people.biography` is a bare text field with neither authorship nor its own
provenance/visibility, so it is **not** used as the biography narrative and
is **not** surfaced by the read model; it is left in place, documented as
superseded, for a later reconciliation. `person_narrative` carries
`body`, `source_type`, `verification_status`, and `authored_by_user_id`, is
locked deny-by-default exactly like `people` (RLS on, no client GRANT/policy),
and has no client write path in M6.1 — narrative is created only via a
trusted service-role/admin path (editorial-authorship governance is deferred;
see M6.V/G2). One current narrative per person; a revision/history model is a
later capability.

**2. Add `public.get_person_biography(uuid)` as the canonical Scientific
Biography read model — a `SECURITY DEFINER` function, not a GRANT/RLS on
`people`.** It follows the exact pattern established by
`search_claimable_people` (ADR-0008) and the M5.4 review functions
(ADR-0009): `people`/`person_narrative` stay fully locked; the only new
capability is `EXECUTE` granted to `authenticated` (never `anon`/`PUBLIC`);
the body requires `auth.uid()`, takes no caller-identity input, pins
`search_path`, and schema-qualifies every reference. It returns a `jsonb`
biography document in which every fact carries provenance: the identity
assertions share the person record's `source_type`/`verification_status`, the
narrative carries its own. A return type of `jsonb` (validated in TypeScript
by `src/features/biography/parse.ts`) is chosen so the canonical read model is
a single, testable document rather than a column-by-column contract.

**3. Encode a conservative M6.1 visibility policy in the read function;
defer `profile_visibility_settings`; keep the route protected.** To an
authenticated reader the function returns display/given/family/preferred
names, `is_deceased`, verification/claim state, and the narrative when
present — and **withholds** exact `date_of_birth`/`date_of_death` (personal
data per `docs/privacy-model.md`) and every internal column. `withheld` is a
fixed policy list, never data (it never reveals whether a value exists). A
per-field visibility system (`profile_visibility_settings`) is **not** built —
ADR-0008 already deferred it as premature. The biography route is
`(protected)/people/[personId]` — authenticated authorized reading only; a
public (unauthenticated) biography surface is **deferred** together with the
living-scholar public-record policy, which M6.V identified as governance +
LGPD work (G1), not a code decision. A nonexistent id and a `merged` record
both return SQL null (no biography), indistinguishably.

## Alternatives considered

**Use `people.biography` as the narrative.** Rejected: it is a bare field
without authorship or its own provenance/visibility, so surfacing it as "the
narrative" would violate the Blueprint's narrative-as-assertion requirement
and conflate narrative with the factual record.

**Build `profile_visibility_settings` now.** Rejected/deferred: ADR-0008
already judged a general per-field visibility system premature; M6.1's fixed
conservative policy is the "smallest safe visibility behavior." When the
public-record policy (G1) is settled, per-field visibility can be added
without changing how the read model is called.

**A GRANT SELECT + RLS policy on `people`/`person_narrative`.** Rejected for
the same reason as ADR-0008: a GRANT is a table-level privilege a future or
malicious query can over-read; a function's return type is an enforced
contract. `people` stays locked.

**A public biography route now.** Deferred: exposing a living, unregistered
person's record publicly is exactly the governance/legal line M6.V left open
(G1). Authenticated authorized reading delivers a coherent foundation without
pre-deciding it.

## Consequences

**Makes easier:** a real, provenance-bearing biography ships on the
established locked-`people` + `SECURITY DEFINER` pattern; the read model is a
single canonical document, testable end to end (pgTAP at the DB boundary,
Vitest for parse/derive/copy, Playwright for the reading flow); later engines
attach at the reserved section architecture without reshaping this.

**Makes harder:** narrative and per-field visibility remain
service-role/admin-managed with no client editorial workflow yet (deferred by
design); `people.biography` and `person_narrative` briefly coexist until a
later reconciliation.

## Relationship to other records

Extends the read-access pattern of
`docs/decisions/0008-claim-discovery-security-definer-function.md` and
`docs/decisions/0009-reviewer-authorization-table.md`. Implements the
primitives of `docs/nodes-of-knowledge-product-blueprint.md` (Entity,
Assertion, Provenance; narrative; conservative Governance Envelope) within
the boundary set by `docs/nodes-of-knowledge-constitutional-validation-m6v.md`
(G1 public-record policy and G2 narrative-authorship governance left open).
Respects CC1 (no biography fact is modelled as Participation) and CC2 (no
dataset/repository behavior).
