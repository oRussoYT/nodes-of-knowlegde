# 0009. A dedicated `reviewers` table as the reviewer-authorization model

Date: 2026-08-02
Status: Proposed

## Context

M5.4 (claim review, approval, and provenance) requires that some
authenticated accounts, and only those accounts, be able to review and
decide `profile_claims` rows. No document or migration in this codebase
defines who those accounts are:

- `docs/product-specification.md`, `docs/privacy-model.md`, and
  `docs/database-schema.md` all cite `docs/user-roles.md` as the document
  that defines administrators/reviewers. That file does not exist
  anywhere in the repository.
- `docs/database-implementation.md` has a dedicated section,
  "Admin-review limitation": *"There is no administrator-role table in
  this milestone... When a real role system is designed,
  `profile_claims`/`user_person_links` policies will need revisiting."*
  Its "What remains for M3.2" list opens with *"Design and implement an
  administrator-role mechanism"* -- never done as its own milestone; M5.3
  only closed an unrelated, narrower `people`-read gap.
- `docs/application-information-architecture.md` and
  `docs/authentication-implementation.md` both describe "Administrator"
  as *"a role that doesn't exist in the schema yet,"* and explicitly list
  a claim-review queue under "Future administration structure (placeholder
  only)."

`profile_claims.reviewer_admin_id` has existed since M3.1 as a plain
nullable FK to `auth.users`, required once a claim is
`approved`/`rejected` and constrained to differ from `claimant_user_id`
(`profile_claims_no_self_review`) -- but nothing has ever verified that
the id it's set to actually belongs to an authorized reviewer, because
that concept did not exist. M5.4 cannot safely build approval/rejection
without first closing this gap, and its own brief requires stopping to
make this decision explicit rather than inferring it (e.g. from email
address, environment variables, or account age).

## Decision

**Add `public.reviewers`, a narrow, explicit reviewer-authorization
table, and gate every review/decision function on live membership in
it.**

- One row per reviewer account. `user_id` (FK to `auth.users`) is
  **unique** -- there is never more than one row per account, even across
  multiple grant/revoke cycles; `status` (`active`/`revoked`) toggles in
  place, preserving the account's full grant/revoke provenance rather
  than accumulating a new row each time.
- Provenance columns: `granted_at`, `granted_by_user_id`, `revoked_at`,
  `revoked_by_user_id`. `revoked_at`/`revoked_by_user_id` are required
  exactly when `status = 'revoked'` (`CHECK`, mirroring
  `profile_claims_decided_at_matches_status`'s pattern). Two `CHECK`
  constraints reject a self-grant or self-revocation
  (`reviewers_no_self_grant`, `reviewers_no_self_revoke`) as
  defense-in-depth, even though the only path that can write this table
  in this milestone (a trusted `service_role` connection) already bypasses
  ordinary `GRANT`/RLS and could otherwise write anything.
- Locked down exactly like `people`/`user_person_links`/`audit_logs`: RLS
  is enabled with **no policy** for `anon` or `authenticated`, and there
  is **no `GRANT`** to either role either -- the same two-layer deny
  those tables already use. Only `service_role` has any privilege on this
  table.
- **No grant/revoke path is exposed to any client role in this
  milestone.** Granting or revoking reviewer status happens only via a
  trusted `service_role` SQL statement (an operator action, today), never
  through a Server Action, RPC, or UI control. This is a deliberate scope
  boundary, not an oversight -- M5.4's brief explicitly excludes "general
  user administration" and "general role-management UI."
- `public.is_active_reviewer(uuid)` is the one, internal, reused
  predicate every review/decision function checks its caller against
  (`exists (select 1 from reviewers where user_id = $1 and status =
  'active')`). Not granted to any client role -- it is called only from
  inside the other `SECURITY DEFINER` functions in the same migration,
  which is permitted regardless of `GRANT`s since a `SECURITY DEFINER`
  function's body runs with its owner's privileges.
- `public.am_i_a_reviewer()` is the one client-facing read: takes no
  parameters (so it cannot probe anyone else's status), answers only
  "is the caller a reviewer," and exists purely so the UI can decide
  whether to show reviewer navigation and entry points. It is explicitly
  **not** the authorization boundary -- `begin_claim_review()`,
  `approve_profile_claim()`, `reject_profile_claim()`,
  `list_claims_for_review()`, and `get_claim_review_detail()` each
  independently re-check `is_active_reviewer(auth.uid())` themselves, so
  a stale or spoofed client-side read of `am_i_a_reviewer()`'s result
  cannot itself grant access to anything.
- Revocation takes effect immediately: since every review/decision
  function re-queries `reviewers` live (rather than trusting a JWT claim
  or any other cached value), flipping a row to `status = 'revoked'`
  denies that account on its very next call, with no propagation delay.

## A related finding, closed in the same migration

While designing the review-decision functions, re-reading
`profile_claims`'s existing RLS revealed that a claimant's own-row
`SELECT` policy is row-scoped, not column-scoped -- meaning a direct
client query against a claimant's own row could already read
`reviewer_admin_id` (the specific account that reviewed them), which this
milestone's brief explicitly says must never reach the claimant. This was
never exploited by application code (`src/features/identity/status.ts`
has always under-selected deliberately), but it was not a database
guarantee either -- the same category of gap M5.3's INSERT-grant
correction closed for `profile_claims`. Fixed the same way: the
table-level `SELECT` grant for `authenticated` is revoked and re-granted
only on every column except `reviewer_admin_id`. `decision_notes` stays
readable -- `docs/database-schema.md` documents `profile_claims`
visibility as "Administrators and the claimant only" for the row as a
whole, with no narrower carve-out for `decision_notes` specifically, and
this milestone's brief explicitly allows a concise, claimant-visible
rejection reason. This is not a new architectural decision on its own
(it's the same "RLS constrains rows, not columns" principle already
established), so it is recorded here rather than in its own ADR.

## Alternatives considered

**JWT custom claim (`app_metadata.is_reviewer`, exposed via a Supabase
custom-access-token Auth hook).** Rejected for this milestone. Avoids a
new table, but requires configuring an Auth hook that doesn't exist
anywhere in this repo today; stores reviewer status in
`auth.users.raw_app_meta_data`, which blurs ADR-0001's "NetPDBFF never
writes migrations against `auth.users` directly, only references its id"
boundary; and -- most importantly -- introduces a real security lag: a
revoked reviewer's already-issued access token would keep claiming
reviewer status until it naturally refreshes, directly conflicting with
"reviewer status must be immediately revocable" and "authorization is
enforced in PostgreSQL, not only in the UI" (a JWT claim, once minted, is
client-held data the server would have to choose to trust or re-verify
live anyway -- and if it has to re-verify live, the JWT claim adds
complexity without adding security over a direct table check).

**Postgres role membership** (a real `reviewer` database role, with
accounts mapped to it). Rejected. Supabase authenticates every client
request as one shared `authenticated` Postgres role via PostgREST/the
connection pooler, not as a distinct role per signed-in account -- there
is no native mechanism in this stack to grant one specific `auth.users`
row its own Postgres role membership without custom JWT-to-role mapping
infrastructure this project has no precedent for. It would also be
awkward to test with the existing pgTAP convention (`set local role
authenticated; set local request.jwt.claim.sub to '<uuid>'`), which
impersonates accounts via a shared role plus a JWT claim, not via
distinct Postgres roles per account.

**A `role` or `roles` column directly on `auth.users`.** Not seriously
considered -- `auth.users` is Supabase-managed (ADR-0001, "NetPDBFF never
writes migrations against this table directly, only references its id"),
and mixing this project's own governance state into a table this project
does not own would make it fragile against future Supabase schema
changes and harder to reason about than an ordinary, independent table
this project fully controls.

## Consequences

**Makes easier:** approval/rejection can be built now, on a real,
testable, immediately-revocable authorization primitive, without waiting
for a general role/permission system; the same table and predicate
extend later (an added `role` column, or a separate
`institution_reviewer_scopes` table referencing `reviewers.id`) without
redesigning how "is this caller allowed to review claims" is asked
anywhere that already calls `is_active_reviewer()`.

**Makes harder:** granting or revoking a reviewer today requires direct,
trusted database access (a `service_role` SQL statement) -- there is
deliberately no UI or Server Action for it yet. This is an accepted,
explicit scope boundary for this milestone, not an oversight; building
that surface is exactly the "general role-management UI" M5.4's brief
excludes.

## Risks

If a future milestone builds a grant/revoke UI on top of this table
without equally careful review (verifying the actor performing the grant
is themselves authorized, preventing self-grant, keeping the action
auditable), the governance model this ADR establishes could be
undermined by its own management surface. Any future grant/revoke
Server Action or RPC should be reviewed with the same scrutiny this
table's read/decision functions received here.
