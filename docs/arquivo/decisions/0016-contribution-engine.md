# 0016. Contribution Engine: contribution as a first-class historical object, explicit typed attribution, kind distinct from capacity

Date: 2026-08-08
Status: Accepted

## Context

Milestone M6.6 answers the sixth engine question: *what did people,
institutions, communities, and knowledge traditions make possible — and how do
we know?* It follows the Timeline (M6.2), Participation (M6.3), Relationship
(M6.4), and Institution (M6.5) engines and begins under Design Bible v1.1,
Product Blueprint v1.1, Design Principle 17, and the Benchmarking Discipline
(Blueprint Part XIV).

Conventional scientific records privilege named authors, final outputs, formal
institutions, measurable citations, and current academic status. They lose
field knowledge, species recognition, long-term observation, site and
collection care, data stewardship, technical adaptation, translation,
logistical knowledge, local and Indigenous knowledge, institutional continuity,
training, community governance, archival preservation, and influence not
captured by authorship. The Contribution Engine must make that lost labour and
knowledge historically visible **without fabricating it, romanticising it,
ranking it, or converting it into a new credit economy**, and while preserving
equal dignity across forms of contribution.

Benchmarking (Design Principle 17) studied contributor-attribution and
scholarly-metadata traditions — CRediT, DataCite, Crossref, ORCID, OpenAlex,
Wikidata, CIDOC CRM, archival authority models, museum catalogues, publication
contribution statements, and conservation-evidence portals — **to discover
problems, never to discover solutions**. Their implementations were
deliberately forgotten; only the problems and trade-offs were carried forward
(see the M6.6 engineering report's Benchmarking Synthesis). Benchmarking may
refine the path; it may never reopen the Entity/Assertion/Provenance core, CC1,
CC2, Node Independence, equal dignity, temporal honesty, narrative/evidence
separation, or the ratified M6.1–M6.5 architecture.

## Decision

**1. Contribution is a first-class historical object, defined by a precise
semantic boundary.** A Contribution is a historically situated,
provenance-bearing account of something an actor helped bring into being,
sustain, transform, preserve, understand, transmit, or make possible. It is
recorded in a canonical `public.contributions` table and is deliberately
distinct from, and never inferred from:

- *Participation* (M6.3, bounded belonging) — a person belonging to an
  institution is not a contribution; a contribution is never inferred from
  affiliation, employment, or a participation row.
- *Relationship* (M6.4, a bond between entities) — a collaboration may enable a
  contribution, but the bond is not the contribution. Mentorship stays an M6.4
  Relationship and is **not** a contribution kind.
- *Event* (M6.2, something that happened) — a contribution may emerge through or
  be marked by events, but is not reducible to one, and its temporal scope is
  its own (see below).
- *Output* — a publication, dataset, specimen, protocol, map, or software may be
  evidence for, an output of, or a referenced entity of a contribution, but a
  contribution is not modelled as an output (CC2). Outputs/records are a later
  engine, reserved not built.
- *Narrative* — interpretation, kept in a separate table; it does not itself
  prove a contribution occurred.
- *Evidence* — supports an attribution; the contribution record's provenance
  does not automatically prove any contributor attribution.

**2. Canonical identity with its own temporal scope and provenance.**
`contributions` carries a title, a controlled kind, an optional description, the
shared M6.2 Many-Clocks temporal model (precision / approximation / uncertainty
/ missing + intervals + open-ended), an optional free-text place at a
steward-chosen safe granularity, and its own `source_type` / `verification_status`.
A contribution's temporal scope is **never** automatically a publication year,
an event date, a participation period, or an institution's founding date. There
is deliberately **no contribution "status"** (no "successful"/"effective"
state) and **no** ranking, score, reach, impact factor, citation count, or
popularity — historical significance is never a measurable ranking.

**3. Contribution kind and contributor capacity are different axes, both
data-backed.** `contribution_kinds` names *what* historical object was
contributed (empirical observation, field knowledge, long-term monitoring,
archival preservation, training, local/Indigenous knowledge, …).
`contribution_capacities` names *how* a particular contributor helped (field
observation, coordination, funding, institutional support, custodianship, …).
Both are lookup tables (Node-extensible as data, never code). Neither
reproduces CRediT or a publication/authorship taxonomy. "Mentorship" is not a
kind (it is an M6.4 Relationship); "funding" and "hosting" are capacities, never
kinds and never intellectual ownership.

**4. Explicit, typed attribution — never a polymorphic edge.**
`person_contributions` and `organization_contributions` are separate explicit
associations, each carrying a capacity, an optional attribution note, a
non-prestige `sort_order`, and **its own** `source_type` / `verification_status`.
Each attribution is its own assertion: the contribution record's provenance
does not prove it, and it is never inferred from authorship, affiliation,
employment, participation, event co-occurrence, shared institution, publication
or funding metadata, or another contributor's statement. No universal
polymorphic entity association is introduced.

**5. Collective and Indigenous contributions are representable without
fabrication.** A contribution requires **no** individual contributor: both
attribution tables may be empty. A collective whose authors cannot or should
not be isolated is attributed to a community or Indigenous organization (M6.5
types) or carried in narrative with an honest limitation — never a false
person. The platform records a historical role; it never claims ownership of
knowledge, never claims community authorization it was not granted, and never
exposes culturally restricted, sacred, private, or sensitive knowledge. The
governance of community authorization is an explicit deferred extension point,
not resolved in code in M6.6.

**6. Narrative separate from the assertion.** `contribution_narrative` holds
curated, human-authored interpretation in facets (overview / context /
significance / legacy), each with its own provenance. Never auto-generated,
never AI, never a publication abstract or self-description passed off as
history. A missing facet is an honest absence. Significance is documented from
evidence, never derived from citation counts, prestige, or later fame; adoption,
implementation, influence, consequence, effectiveness, and later interpretation
are distinct from the contribution and are reserved (a "Consequences" surface),
never asserted as caused outcomes.

**7. Events projected, never duplicated; relation vocabulary deferred.**
`contribution_events` projects canonical M6.2 Events onto a contribution with no
duplication (Many-Clocks; mirrors `person_events` / `organization_events`). The
event's own kind/title/summary carries its meaning; a relation-type vocabulary
(originated / announced / implemented / recognized / continued) is a deferred
additive extension point — implementing it now would fork the shared timeline
read shape and is not required for the first complete reading experience.
Association never implies causation.

**8. Bounded read-model, composed at each page.** Four SECURITY DEFINER
functions — `get_contribution` (identity + kind + narrative + person/org
attributions), `get_contribution_timeline` (projected events),
`get_person_contributions` and `get_organization_contributions` (the same
canonical attributions projected onto a person and an institution) — each
authenticate (`auth.uid()`), pin `search_path`, revoke EXECUTE from PUBLIC and
grant it to `authenticated`, expose only intended fields, return honest
null/empty states, and omit merged people (merged/historical institutions stay
readable, per M6.5). No Contribution field is added to the Biography or
Institution identity RPCs; consistency across the person page, the institution
page, and the dedicated Contribution page is guaranteed **by construction**
because all three project one canonical set of records.

**9. Deny-by-default security, unchanged model.** Every new table has RLS
enabled with no client policy; table writes are granted only to `service_role`;
reads reach clients solely through the SECURITY DEFINER functions. No direct
client write path is introduced to simplify tests (fixtures use the established
trusted service-role path).

**10. Deferred universal-entity / generalized-attribution path.** M6.6 does not
build a universal Entity Engine or polymorphic attribution. The explicit
`person_contributions` / `organization_contributions` shape is additively
extensible to future contributor entities (projects, sites, communities) by new
sibling tables and reads, exactly as M6.4's source/target and M6.5's additive
extension were — without redesign and without reopening settled architecture.

## Consequences

Easier: contributions that conventional records lose become first-class,
provenance-bearing history; one canonical record reads consistently on a
person, an institution, and its own page; kind-vs-capacity keeps "what was
contributed" and "how each actor helped" precise; equal dignity is structural
(no shares, no ranking, no prestige ordering); collective and Indigenous
contributions are representable without fabricating individuals; the temporal,
provenance, and event-projection kernels are reused verbatim.

Harder / deferred, by intent: no outputs/records ingestion, dataset or
publication repository, citation graph, effectiveness or impact scoring, or
contribution percentages; no contribution↔event relation vocabulary yet; no
generalized polymorphic attribution or universal Entity Engine; community
authorization workflows, culturally-restricted-knowledge governance, and a
distinct contributor/host/funder/custodian/beneficiary typology beyond capacity
remain open governance questions recorded here and in the engineering report,
not resolved in code. These are additive extension points, consistent with the
Constitution, and none reopens M6.1–M6.5.
