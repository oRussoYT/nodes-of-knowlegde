# 0001. Separate people from user accounts

Date: 2026-07-31
Status: Proposed

## Context

PDBFF's community spans decades and includes researchers, field assistants,
students, technicians, and collaborators who were active long before a
platform like NetPDBFF existed — many of them will never register an
account, and some are no longer living. At the same time, the platform
needs authenticated accounts for the people who *do* register, so they can
log in, submit information, and manage their own data.

If "person" and "user account" were the same entity, every individual
NetPDBFF wants to document would first require an account — which is false
for most of PDBFF's actual history. The system needs to represent
historical and currently-unregistered participants with the same integrity
as registered ones, while still letting a real, living person eventually
step forward and say "this record is me."

This decision is foundational: nearly every other entity in
`docs/database-schema.md` (participation periods, career history,
relationships, publications, nominations) attaches to a `people` row, not
an `auth.users` row. Getting this wrong would be expensive to unwind later.

## Decision

Model `people` and `auth.users` (Supabase Auth) as two distinct entities
that are never merged into one table or one identity:

- A `people` row can exist, and often will exist, with no associated
  account — created via nomination, admin entry, or historical import.
- An `auth.users` row (an account) is linked to a `people` row only through
  a reviewed process: a `profile_claims` request, approved by an
  administrator, which then creates an active `user_person_links` row.
- The link is one-directional in trust: having an account never
  automatically grants control over a person record. Only an approved claim
  does.

See `docs/database-schema.md` (Identity and Access section) for the full
table design implementing this.

## Alternatives considered

**Single merged table (`people` with a nullable auth reference built in,
account fields on the same row).** Rejected — conflates "this record
exists" with "this record is controlled by an authenticated identity,"
making it impossible to cleanly represent a historical figure with no
account, and complicates account deletion (would require deleting or
nulling out historical facts about a person, not just revoking access).

**Auto-link by matching email or name on signup.** Rejected — silently
attaching a new account to an existing person record on a fuzzy match risks
identity takeover (someone claiming to be a person they aren't) and
violates the explicit rule that claiming requires review, not automatic
matching.

**No standalone person entity — only accounts, with historical figures
represented as unclaimed placeholder accounts.** Rejected — Supabase Auth
rows are meant to represent authenticateable identities with credentials;
using placeholder accounts for people who will never log in misuses the
auth system and would require workarounds (fake emails, disabled
credentials) that create more risk than they solve.

## Consequences

**Makes easier:**
- Documenting PDBFF's full historical community, including deceased or
  untraceable participants, without requiring an account for every one.
- A clean, reviewable claim workflow, instead of ad hoc trust decisions
  baked into signup.
- Independently deleting an account (revoking access) without erasing the
  historical record the person represents, and independently correcting or
  disputing a person record without touching account security.

**Makes harder:**
- Every feature that touches "the current user's data" must resolve
  `auth.users.id → people.id` through `user_person_links` rather than
  assuming they're the same row — one extra join, everywhere, forever.
- Duplicate person records become possible (two provisional records for
  the same real individual before either is claimed), requiring the
  `duplicate_candidates`/merge machinery described in
  `docs/database-schema.md`.
- Claim review becomes a real operational burden — administrators must
  process claims, not just approve signups.

## Benefits

- Preserves PDBFF's historical record as a first-class goal, not an
  afterthought bolted onto an accounts table.
- Keeps identity verification (is this really you?) separate from and
  reviewable independently of authentication (can you log in?).
- Gives every downstream entity (participation, relationships,
  publications) a stable subject — a `people.id` — that doesn't disappear
  or change shape if an account is deleted or never existed.

## Risks

- If the claim-review workflow is under-resourced, a backlog of pending
  claims could frustrate users trying to take ownership of their own
  historical record.
- Getting the `people` ↔ `auth.users` join wrong in any single feature
  (treating `auth.users.id` as if it were `people.id`) would silently break
  the boundary this ADR exists to protect — this needs to be a reviewed
  convention in code, not just a schema fact.
- Merge/duplicate handling adds real complexity that a merged-entity design
  wouldn't have needed at all; this is an accepted tradeoff, not a free
  win.

## Why this distinction is essential for NetPDBFF

Unlike a typical social platform where "user" and "person" are
interchangeable because the platform's data only exists once someone signs
up, NetPDBFF's stated purpose (`docs/product-specification.md`) is to
document PDBFF's human network *including* the decades of participants who
predate the platform and will never create an account. Collapsing person
and account into one entity would make that purpose structurally
impossible — the data model would have no way to represent a real,
significant participant who simply never registers. This distinction is
not a modeling nicety; it is the reason the schema in
`docs/database-schema.md` can represent PDBFF's actual history at all.
