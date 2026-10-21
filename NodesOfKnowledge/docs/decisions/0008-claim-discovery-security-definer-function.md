# 0008. Claim discovery via a SECURITY DEFINER function, not a GRANT/RLS policy on `people`

Date: 2026-08-02
Status: Proposed

## Context

M5.3 (identity claiming) requires that an authenticated user be able to
search or browse existing `people` records for the purpose of submitting a
`profile_claims` request. `people` currently has zero `GRANT` and zero RLS
policy for `anon` or `authenticated` — a deliberate two-layer deny
established in M3.1 (`supabase/migrations/20260801013649_create_identity_foundation.sql`)
and explicitly called out as a known follow-up in
`docs/database-implementation.md`'s "What remains for M3.2" section:
*"Design `profile_visibility_settings` and decide what (if anything) about
`people` becomes readable by `anon`/`authenticated` — this unblocks giving
`people` any GRANT/policy at all."*

`profile_visibility_settings` — the general-purpose, per-field visibility
system described in `docs/database-schema.md` — does not exist and
building it is out of this milestone's scope. Discovery cannot wait for
it: the milestone brief requires it now, and `docs/privacy-model.md`'s core
rule already gives a narrower, principled basis to act on today —
an unclaimed person's information defaults to "the most restrictive
visibility appropriate to how it was collected (typically
administrators-only or **registered members-only**)," and
`docs/database-schema.md`'s own `people` entry already names `display_name`
as the one field expected to be visible by default. That is exactly the
audience (`authenticated`) and exactly the field this milestone's discovery
feature needs — nothing more.

## Decision

Add three new database objects, all `SECURITY DEFINER` functions, rather
than a `GRANT SELECT` + RLS policy directly on `public.people`:

- `public.search_claimable_people(p_query text)` — search/browse eligible
  people for the purpose of submitting a claim. Returns up to 25 rows,
  `id` + `display_name` only.
- `public.get_claimed_person_display_name(p_person_id uuid)` — let a
  claimant see the *name* behind their own `profile_claims` row (in any
  status), since that row only stores `claimed_person_id`, a uuid.
  Authorization here is different from search: it does not filter by
  eligibility, it requires proof that the caller already has a
  `profile_claims` row for that specific person. A rejected or withdrawn
  claim's target may be merged or claimed by someone else by now, and the
  claimant should still be able to see what their own history refers to —
  a null return (id doesn't exist, or the caller never claimed it — the
  two are indistinguishable by design) means this cannot be used as a
  general existence check against `people`.
- `public.is_person_claimable(p_person_id uuid)` — re-check exactly one
  person id's eligibility at claim-submission time. Added because the
  claim Server Action cannot safely reuse `search_claimable_people`'s
  `LIMIT 25` result set to answer "is this one selected id still
  eligible" — the selected person may not be among the first 25
  alphabetically. Same eligibility predicate as `search_claimable_people`,
  applied to one id instead of a result page.

None of the three is a `GRANT SELECT` + RLS policy directly on
`public.people`.

- `people` is **not** modified at the grant/policy level by this decision.
  Every existing protection (no `GRANT` to `anon`/`authenticated`, zero RLS
  policies) stays exactly as M3.1 left it. `authenticated` still cannot run
  `SELECT * FROM people` before or after this change.
- The function is `SECURITY DEFINER`, so it can read `people` on the
  caller's behalf despite the caller having no table-level privilege to do
  so itself — the same technique `withdraw_profile_claim()` (M3.1) already
  established for the analogous "let `authenticated` perform one narrow,
  fully-controlled write without a general `UPDATE` grant" problem. This
  decision applies that established pattern to reads.
- The function returns only `id` and `display_name` — never
  `date_of_birth`, `date_of_death`, `biography`, `verification_status`,
  `source_type`, or `created_by_user_id`. It excludes people who are
  `verification_status = 'merged'` or already actively linked
  (`user_person_links.status = 'active'`), so a claimant is never shown a
  record that isn't realistically claimable.
- `search_path` is pinned (`public, pg_temp`), every reference is
  schema-qualified, `EXECUTE` is revoked from `PUBLIC` and granted only to
  `authenticated`, and the function itself checks `auth.uid() is not null`
  rather than trusting the grant alone. See the migration
  (`supabase/migrations/20260802110300_add_claim_discovery_search_function.sql`)
  for the full inline threat-model comment.

## Addendum (2026-08-02): security-correction pass

A follow-up review of the initial implementation found two real gaps,
both corrected in the same migration:

1. **Non-atomic claim submission.** The first version of
   `src/features/identity/actions/submit-claim.ts` checked
   `is_person_claimable()`, checked the caller's existing claims, and
   inserted, as three separate round trips — a check-then-act sequence a
   concurrent request could race. Fixed by adding a fourth function,
   `public.submit_profile_claim(p_person_id, p_supporting_evidence)`,
   which performs the eligibility check and the insert inside one
   function invocation (one atomic unit of work), and takes no
   claimant/status/reviewer/link parameter of any kind — the claimant is
   always `auth.uid()`, and the inserted row always gets `status`'s own
   column default, `submitted`. The Server Action now only validates
   input shape and calls this function.

2. **Missing account-level duplicate-claim invariant, and a real
   privilege-escalation gap in how claims were being inserted.** Nothing
   in the schema stopped one claimant holding simultaneous
   `submitted`/`under_review` claims on *different* people — closed by a
   new partial unique index,
   `profile_claims_one_active_or_approved_per_claimant_idx`, on
   `claimant_user_id` where `status in ('submitted', 'under_review',
   'approved')`. Investigating this surfaced a more serious, pre-existing
   issue: `authenticated`'s M3.1 `INSERT` grant on `profile_claims` was
   protected only by RLS's `WITH CHECK (claimant_user_id = auth.uid())`,
   which constrains *ownership*, not *content*. A client could issue a raw
   `INSERT` setting `status = 'approved'` plus any other real `auth.users`
   id as `reviewer_admin_id` (satisfying `profile_claims_no_self_review`
   and `profile_claims_reviewer_required_on_decision`, neither of which
   verifies the reviewer is an actual reviewer — no admin role/table
   exists to check against), fabricating a self-approved claim with no
   real review. `user_person_links` itself stays unreachable, so this
   could not create a real link — but `/member`/`/account` derive their
   "linked" UI state from `profile_claims.status` alone, so this would
   have let a user falsely display themselves as linked. Fixed by
   revoking `authenticated`'s `INSERT` grant on `profile_claims` entirely:
   `submit_profile_claim()` needs no such grant (it runs as the
   function's owner), and never accepts a status/reviewer/decision value
   from its caller in the first place. `SELECT` is unchanged.

`public.get_claimed_person_display_name` was also reviewed against a
narrower standard ("visible only through the caller's own claim or an
approved link") and found already correct without any code change — every
active `user_person_links` row is created only from an approved
`profile_claims` row for the identical pair
(`user_person_links_validate_source_claim`), so "has a claim" and "has an
approved link" are not independent authorization paths to check
separately; the existing `exists (...)` check already covers both. New
pgTAP coverage was added to prove this rather than to fix anything.

## Alternatives considered

**A narrow RLS policy + `GRANT SELECT` on `people`, with the client
selecting only `id, display_name`.** Rejected — a `GRANT` is a table-level
privilege; nothing stops a future (or malicious) query from selecting
every other column RLS lets the row through for. The client's own
`select()` call would be the only thing limiting exposure, which is an
application-layer convention, not a database guarantee — exactly the kind
of column-level attack surface the M3.1 migration already rejected once
for `profile_claims` UPDATE (see that migration's RLS section) for the
same underlying reason. A function's return type is a real, enforced
contract; a `GRANT` is not.

**Wait for `profile_visibility_settings` and block discovery until it
exists.** Rejected as the default path, though it was offered as an
explicit option and not chosen: `profile_visibility_settings` is a
general, per-field visibility system for a much broader set of future
fields and use cases (professional positions, participation, career
entries, and more) — building it now, just to unblock one field for one
feature, would be exactly the kind of speculative structure this
project's own conventions warn against. The function-based approach
solves this milestone's actual, narrow need without foreclosing or
duplicating that future system; when `profile_visibility_settings` is
eventually built, this function can be revisited (e.g. to also honor a
per-person "don't show me in discovery" preference) without any schema
migration required to get there.

## Consequences

**Makes easier:** discovery ships without a broader, undesigned visibility
system; the `people` table's existing lockdown stays intact and legible
(one exception, in one well-documented place, rather than a general
opening); the same pattern is available for any future narrow read need
that arises before `profile_visibility_settings` exists.

**Makes harder:** search is necessarily simple (a single `ILIKE` over one
column, no ranking, no accent-folding, a fixed result cap) since anything
more sophisticated would mean a more complex function to audit for the
same reason a `GRANT` was rejected — this is judged an acceptable
limitation for a claim-discovery feature over what is expected to be a
modest number of records, not a general person-search product feature.

## Risks

If more fields are later added to this function's return type without the
same scrutiny this one received (grep for `SECURITY DEFINER`, check the
threat-model comment, confirm the field is genuinely
registered-members-visible per `docs/privacy-model.md`), the narrow
guarantee this ADR describes erodes silently. Any future change to
`search_claimable_people`'s return columns should be treated with the same
care as a new `GRANT` on `people` itself, because that is functionally
what it is.
