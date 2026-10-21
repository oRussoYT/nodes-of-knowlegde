# Database Model (Preliminary Conceptual Model)

## Status

This document is a **preliminary conceptual model only**. It exists to
establish shared vocabulary and the key distinctions the data model must
preserve. It intentionally does not define tables, columns, keys, or
constraints, and **no database migrations have been created yet**. The
first migrations will be introduced as a dedicated, later piece of work
and should be reviewed against this document, `docs/privacy-model.md`,
and `docs/user-roles.md`.

A detailed, table-level schema proposal now exists at
`docs/database-schema.md`, along with `docs/decisions/
0001-separate-people-from-user-accounts.md`. That document is the more
detailed and authoritative one where the two overlap; this document
remains the conceptual companion and is not being replaced by it.

## Why these distinctions matter

PDBFF's community spans decades, and most people who should be
represented in the system will never register an account. The data model
has to represent people independently of accounts, represent
uncertainty (a nominated-but-unverified person is not the same as a
verified one), and never conflate "the system inferred a connection"
with "a person confirmed a connection." Collapsing any of these
distinctions would either lose information or misrepresent it.

## Key concepts

### Person

The durable, canonical record of an individual connected to PDBFF. A
person record can exist, and typically will exist, without any
associated authenticated user account — for example, a researcher from
the 1980s who is documented from historical records but has never used
the platform.

### Authenticated user account

A login identity (managed via Supabase Auth) that lets someone access the
platform, submit information, and manage settings. An account is not
itself a person record. Per `CLAUDE.md`, person records and accounts are
kept separate; an account may be linked to a person record (see "claimed
profile" below), but the two are never merged into a single entity.

### Claimed profile

The state in which an authenticated user account has been linked to a
specific person record, asserting "this person record is me." Claiming is
an action, not an inherent property of a person record — most person
records will never be claimed.

### Provisional or nominated person

A person record created by someone else (see "person nominations" in
`docs/architecture.md`) that has not been confirmed by the person it
describes, and has not been verified by an administrator. Provisional
records carry lower confidence and are subject to the visibility
protections in `docs/privacy-model.md`.

### Verified person

A person record whose existence and core details have been confirmed —
either by the person themselves (via a claimed profile) or through an
administrative verification process. Verification is a status on a
person record, tracked separately from whether the record is claimed.

### PDBFF participation period

A distinct span of time during which a person participated in PDBFF, with
its own context. A single person is expected to have **zero, one, or
many** participation periods over their lifetime (e.g. a student who
returns years later as staff) — participation is never modeled as a
single date range or a single role per person. A participation period may
itself involve more than one concurrent role (e.g. someone who was both a
technician and a part-time student at the same time); `docs/
database-schema.md` covers how that's distinguished from two genuinely
separate periods.

### Person-to-person relationship

A connection between two person records (e.g. collaborator, mentor,
co-author, shared-project participant). Relationships are described along
two separate dimensions, not one: **how the relationship was asserted or
discovered** (e.g. the system inferred it from shared records such as
co-authorship, versus a person declared it directly, versus it came from a
historical document), and, independently, **whether it has been
verified** — ranging from unreviewed, through evidence-supported, to
**confirmed** (explicitly affirmed by a person or an administrator), with
a **disputed** state available at any point. Per `CLAUDE.md`, a
system-inferred relationship is never treated as, displayed as, or
promoted to a confirmed relationship without an explicit confirmation
step — this holds regardless of how the relationship was originally
asserted. See `docs/database-schema.md`'s Status Models section for the
full, named set of states and their transitions.

## Open questions for the future schema design

- How verification workflows differ between self-claimed and
  administrator-verified people, how participation periods relate to
  institutions/projects/career history, and what audit trail is needed
  around verification and nomination state changes are now addressed at
  the table level in `docs/database-schema.md` (see its Status Models,
  Provenance Model, and per-table sections).
- How relationship confirmation should work when only one side of the
  relationship is a registered, active user, and specifically whether a
  symmetric relationship type requires both parties (or just one) to
  confirm, remains an open product decision — see the "Open Questions and
  Product-Owner Decisions" section of `docs/database-schema.md`.

Remaining open items are tracked in `docs/database-schema.md` rather than
here, so they aren't duplicated or allowed to drift between the two
documents. This document's own scope stays limited to the conceptual
distinctions above; it will not be expanded with schema-level detail.
