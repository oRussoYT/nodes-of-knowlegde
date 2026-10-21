-- Milestone M5.4: Claim Review, Approval, and Provenance Foundation
--
-- Closes the gap flagged since M3.1
-- (docs/database-implementation.md, "Admin-review limitation" / "What
-- remains for M3.2": "Design and implement an administrator-role
-- mechanism") and left unresolved in M5.3 (which only unblocked a
-- narrow, unrelated `people`-read gap). Adds:
--
--   1. `public.reviewers` -- the smallest explicit reviewer-authorization
--      table, per the Phase 0 architectural decision; see
--      docs/decisions/0009-reviewer-authorization-table.md. One row per
--      reviewer account (user_id is unique -- status toggles
--      active/revoked in place, never a new row per grant/revoke cycle),
--      provenance-tracked (granted_at/granted_by, revoked_at/revoked_by).
--      Locked down exactly like `people`/`user_person_links` -- no GRANT
--      and no RLS policy for anon/authenticated. Reviewer status can only
--      be granted or revoked via a trusted service-role connection in
--      this milestone -- no client-facing grant/revoke path exists, per
--      the milestone's explicit "no general role-management UI" boundary.
--   2. `public.is_active_reviewer(uuid)` -- internal predicate, reused by
--      every function below so "what counts as an active reviewer" has
--      exactly one definition.
--   3. `public.am_i_a_reviewer()` -- the one reviewer-status read
--      `authenticated` may perform directly. UI nav-visibility signal
--      only -- never itself the authorization boundary; every function
--      below re-checks independently of whatever this returned.
--   4. `public.list_claims_for_review()` / `public.get_claim_review_detail(uuid)`
--      -- the review queue and single-claim detail projections,
--      reviewer-gated, minimum-necessary columns.
--   5. `public.begin_claim_review(uuid)` -- submitted -> under_review,
--      atomic, reviewer-gated, self-review-blocked.
--   6. `public.approve_profile_claim(uuid)` -- under_review -> approved,
--      plus exactly one new `user_person_links` row, atomic,
--      reviewer-gated, self-review-blocked, eligibility re-verified at
--      decision time.
--   7. `public.reject_profile_claim(uuid, text)` -- under_review ->
--      rejected, atomic, reviewer-gated, self-review-blocked, creates no
--      link.
--   8. A column-level tightening of `profile_claims`' existing
--      `authenticated` SELECT grant, so a claimant reading their own row
--      can never see `reviewer_admin_id` -- see that section below for
--      the full reasoning.
--
-- Threat model matches the pattern already established in
-- 20260802110300_add_claim_discovery_search_function.sql: every function
-- below is SECURITY DEFINER with `search_path` pinned to `public,
-- pg_temp`, every reference is schema-qualified, every function checks
-- `auth.uid()` itself (never trusts the GRANT alone), `PUBLIC` execute is
-- revoked, and `EXECUTE` is granted only to `authenticated`. None of this
-- weakens any M5.3 constraint, grant, RLS policy, or RPC authorization --
-- `profile_claims`/`user_person_links` still have no direct client-side
-- `UPDATE`/`INSERT` path; these functions are additive, narrowly-scoped
-- alternatives, the same way `submit_profile_claim()` and
-- `withdraw_profile_claim()` already are.

-- ---------------------------------------------------------------------
-- reviewers
-- ---------------------------------------------------------------------

create table public.reviewers (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users (id),

  status text not null default 'active',

  granted_at timestamptz not null default now(),
  granted_by_user_id uuid references auth.users (id),

  revoked_at timestamptz,
  revoked_by_user_id uuid references auth.users (id),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint reviewers_status_valid check (status in ('active', 'revoked')),
  constraint reviewers_revoked_at_matches_status check (
    (status = 'revoked') = (revoked_at is not null)
  ),
  constraint reviewers_revoked_by_required_on_revoke check (
    status <> 'revoked' or revoked_by_user_id is not null
  ),
  -- Defense-in-depth: grants/revokes only ever happen via a trusted
  -- service-role connection in this milestone, which bypasses ordinary
  -- GRANT/RLS entirely -- so this CHECK is not the primary enforcement.
  -- It still guarantees a self-grant or self-revocation is never a valid
  -- row under this governance model even if that changes later, matching
  -- the same defense-in-depth reasoning as profile_claims_no_self_review
  -- (M3.1).
  constraint reviewers_no_self_grant check (
    granted_by_user_id is null or granted_by_user_id <> user_id
  ),
  constraint reviewers_no_self_revoke check (
    revoked_by_user_id is null or revoked_by_user_id <> user_id
  )
);

comment on table public.reviewers is
  'One row per reviewer account -- never a new row per grant/revoke '
  'cycle; user_id is unique and status toggles active/revoked in place, '
  'preserving provenance. No GRANT to anon/authenticated and no RLS '
  'policy exists for either -- the same two-layer deny used for '
  'people/user_person_links/audit_logs. Reviewer status is granted or '
  'revoked only via a trusted service-role connection in this milestone; '
  'no client-reachable grant/revoke path exists. See '
  'docs/decisions/0009-reviewer-authorization-table.md.';

create unique index reviewers_user_id_idx on public.reviewers (user_id);
create index reviewers_status_idx on public.reviewers (status);

create trigger reviewers_set_updated_at
  before update on public.reviewers
  for each row
  execute function public.set_updated_at();

alter table public.reviewers enable row level security;
-- No policy for anon or authenticated -- combined with no GRANT below,
-- this is the same two-layer deny as people/user_person_links/audit_logs
-- (supabase/migrations/20260801013649_create_identity_foundation.sql).

grant select, insert, update, delete on public.reviewers to service_role;

-- ---------------------------------------------------------------------
-- is_active_reviewer -- internal predicate, reused below
-- ---------------------------------------------------------------------
--
-- Not itself a review/authorization entry point -- a plain SQL predicate
-- every review function below calls to check its caller, so the *one*
-- definition of "what counts as an active reviewer" cannot drift between
-- functions.
create function public.is_active_reviewer(p_user_id uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.reviewers r
    where r.user_id = p_user_id
      and r.status = 'active'
  );
$$;

comment on function public.is_active_reviewer(uuid) is
  'Internal predicate: does p_user_id have an active reviewers row? Used '
  'by every review/approval/rejection function below. Always returns a '
  'plain boolean, never raises, never distinguishes "not a reviewer" from '
  '"not a real user id." Not granted to any client role -- only called '
  'from inside the SECURITY DEFINER functions in this file, which is '
  'permitted regardless of GRANTs since the calling function already runs '
  'as its owner. am_i_a_reviewer() below is the client-facing equivalent, '
  'scoped to auth.uid() only.';

revoke all on function public.is_active_reviewer(uuid) from public;

-- ---------------------------------------------------------------------
-- am_i_a_reviewer -- the one reviewer-status read authenticated may
-- perform directly
-- ---------------------------------------------------------------------
--
-- For UI nav-visibility only, per the milestone's explicit "navigation
-- visibility must be derived from authoritative reviewer authorization;
-- do not rely on hiding navigation as the authorization boundary" -- this
-- function IS that authoritative check the UI reads, but it is never
-- itself the enforcement boundary: every review/decision function below
-- re-checks authorization independently of whatever this returned. Takes
-- no parameters, so it cannot be used to probe another account's
-- reviewer status -- it only ever answers "is the caller a reviewer."
create function public.am_i_a_reviewer()
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'am_i_a_reviewer: authentication required';
  end if;

  return public.is_active_reviewer(auth.uid());
end;
$$;

comment on function public.am_i_a_reviewer() is
  'Whether the calling account is an active reviewer -- UI nav-visibility '
  'signal only, never the authorization boundary itself (every review '
  'function re-checks independently). Takes no parameters: cannot be used '
  'to probe another account''s reviewer status. Never grant EXECUTE to '
  'anon or PUBLIC.';

revoke all on function public.am_i_a_reviewer() from public;
grant execute on function public.am_i_a_reviewer() to authenticated;

-- ---------------------------------------------------------------------
-- list_claims_for_review -- the review queue
-- ---------------------------------------------------------------------
--
-- Scoped to claims that actually require attention (submitted,
-- under_review) -- decided/withdrawn claims are not part of "the queue"
-- per the milestone's "claim review queue" scope, though an authorized
-- reviewer can still look up any single claim's detail directly by id via
-- get_claim_review_detail() below, for audit purposes. Returns only the
-- minimum projection needed to triage: no supporting_evidence here (that
-- is detail-view-only, read one claim at a time, never listed in bulk).
create function public.list_claims_for_review()
returns table (
  id uuid,
  status text,
  claimant_email text,
  person_id uuid,
  person_display_name text,
  person_verification_status text,
  submitted_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'list_claims_for_review: authentication required';
  end if;

  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'list_claims_for_review: reviewer authorization required';
  end if;

  return query
    select
      pc.id,
      pc.status,
      u.email::text,
      p.id,
      p.display_name,
      p.verification_status,
      pc.submitted_at
    from public.profile_claims pc
    join public.people p on p.id = pc.claimed_person_id
    join auth.users u on u.id = pc.claimant_user_id
    where pc.status in ('submitted', 'under_review')
    order by pc.submitted_at asc;
end;
$$;

comment on function public.list_claims_for_review() is
  'The review queue: claims in submitted/under_review status only, '
  'oldest first. Reviewer-gated. Returns only the minimum projection '
  'needed to triage -- no supporting_evidence (see '
  'get_claim_review_detail() for the single-claim detail/evidence view). '
  'Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.list_claims_for_review() from public;
grant execute on function public.list_claims_for_review() to authenticated;

-- ---------------------------------------------------------------------
-- get_claim_review_detail -- the claim-detail / evidence-review surface
-- ---------------------------------------------------------------------
--
-- Unlike the queue, this works for a claim in *any* status -- an
-- authorized reviewer may need to look back at a decided claim (who
-- reviewed it, what was decided, whether the resulting link is still
-- active) for audit purposes, not only claims currently awaiting a
-- decision. This is a pure read: it does not check self-review (there is
-- nothing to decide here) and never changes state.
create function public.get_claim_review_detail(p_claim_id uuid)
returns table (
  id uuid,
  status text,
  claimant_email text,
  person_id uuid,
  person_display_name text,
  person_given_name text,
  person_family_name text,
  person_verification_status text,
  person_source_type text,
  person_created_at timestamptz,
  supporting_evidence text,
  submitted_at timestamptz,
  decided_at timestamptz,
  reviewer_email text,
  decision_notes text,
  active_link_exists boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'get_claim_review_detail: authentication required';
  end if;

  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'get_claim_review_detail: reviewer authorization required';
  end if;

  if not exists (select 1 from public.profile_claims pc where pc.id = p_claim_id) then
    raise exception 'get_claim_review_detail: claim not found';
  end if;

  return query
    select
      pc.id,
      pc.status,
      claimant.email::text,
      p.id,
      p.display_name,
      p.given_name,
      p.family_name,
      p.verification_status,
      p.source_type,
      p.created_at,
      pc.supporting_evidence,
      pc.submitted_at,
      pc.decided_at,
      reviewer.email::text,
      pc.decision_notes,
      exists (
        select 1
        from public.user_person_links upl
        where upl.source_claim_id = pc.id
          and upl.status = 'active'
      )
    from public.profile_claims pc
    join public.people p on p.id = pc.claimed_person_id
    join auth.users claimant on claimant.id = pc.claimant_user_id
    left join auth.users reviewer on reviewer.id = pc.reviewer_admin_id
    where pc.id = p_claim_id;
end;
$$;

comment on function public.get_claim_review_detail(uuid) is
  'The claim-detail/evidence-review surface: works for a claim in any '
  'status (not just pending), so an authorized reviewer can audit a past '
  'decision, not only triage a pending one. Reviewer-gated. Returns the '
  'claimant account (email only), the claimed person record, the '
  'claimant''s own evidence, existing person-record provenance, the '
  'review decision if any (including which reviewer, by email), and '
  'whether an active link resulted -- never an auth token, never '
  'unrelated claims, never internal-only database fields with no review '
  'purpose. Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.get_claim_review_detail(uuid) from public;
grant execute on function public.get_claim_review_detail(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- begin_claim_review -- submitted -> under_review
-- ---------------------------------------------------------------------
create function public.begin_claim_review(p_claim_id uuid)
returns table (id uuid, status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reviewer_id uuid;
  v_claimant_id uuid;
  v_rows_updated int;
begin
  v_reviewer_id := auth.uid();
  if v_reviewer_id is null then
    raise exception 'begin_claim_review: authentication required';
  end if;

  if not public.is_active_reviewer(v_reviewer_id) then
    raise exception 'begin_claim_review: reviewer authorization required';
  end if;

  select pc.claimant_user_id into v_claimant_id
  from public.profile_claims pc
  where pc.id = p_claim_id;

  if not found then
    raise exception 'begin_claim_review: claim not found';
  end if;

  if v_claimant_id = v_reviewer_id then
    raise exception 'begin_claim_review: a reviewer cannot review their own claim';
  end if;

  -- `profile_claims` is aliased and every WHERE-clause reference is
  -- qualified (pc.id, pc.status) -- this function's OUT parameters are
  -- also named id/status (see `returns table (id uuid, status text)`
  -- above), and plpgsql raises 42702 "column reference is ambiguous"
  -- for any unqualified reference to a name that could be either the
  -- table's column or the OUT-parameter variable of the same name. The
  -- SET clause's target columns (status = ...) are the one exception:
  -- that position can only ever mean the table's own column, never a
  -- variable, so it stays unqualified -- qualifying it would be a syntax
  -- error, not just unnecessary.
  update public.profile_claims pc
  set status = 'under_review'
  where pc.id = p_claim_id
    and pc.status = 'submitted';

  get diagnostics v_rows_updated = row_count;

  if v_rows_updated = 0 then
    raise exception 'begin_claim_review: claim is not in a reviewable state';
  end if;

  return query select p_claim_id, 'under_review'::text;
end;
$$;

comment on function public.begin_claim_review(uuid) is
  'Atomically transitions a claim from submitted to under_review. '
  'Reviewer-gated; rejects self-review; only succeeds from submitted (a '
  'claim already under_review, decided, or withdrawn is rejected, not '
  'silently no-op''d). Takes only a claim id -- no status, reviewer, or '
  'timestamp can be supplied by the caller. Never grant EXECUTE to anon '
  'or PUBLIC.';

revoke all on function public.begin_claim_review(uuid) from public;
grant execute on function public.begin_claim_review(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- approve_profile_claim -- under_review -> approved, plus exactly one
-- new user_person_links row
-- ---------------------------------------------------------------------
create function public.approve_profile_claim(p_claim_id uuid)
returns table (id uuid, status text, decided_at timestamptz, link_id uuid)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reviewer_id uuid;
  v_claim public.profile_claims%rowtype;
  v_link_id uuid;
begin
  v_reviewer_id := auth.uid();
  if v_reviewer_id is null then
    raise exception 'approve_profile_claim: authentication required';
  end if;

  if not public.is_active_reviewer(v_reviewer_id) then
    raise exception 'approve_profile_claim: reviewer authorization required';
  end if;

  -- Row lock: a concurrent approve/reject call on the same claim blocks
  -- here until the first transaction commits or rolls back, so two
  -- reviewers can never both observe status = 'under_review' and both
  -- proceed -- the second to acquire the lock re-reads the
  -- already-updated row and correctly fails the status check below.
  -- Aliased and qualified for the same reason as begin_claim_review's
  -- UPDATE below: this function's OUT parameters include `id`, so a bare
  -- `where id = p_claim_id` is ambiguous between the table column and
  -- the OUT-parameter variable.
  select * into v_claim
  from public.profile_claims pc
  where pc.id = p_claim_id
  for update;

  if not found then
    raise exception 'approve_profile_claim: claim not found';
  end if;

  if v_claim.claimant_user_id = v_reviewer_id then
    raise exception 'approve_profile_claim: a reviewer cannot decide their own claim';
  end if;

  if v_claim.status <> 'under_review' then
    raise exception 'approve_profile_claim: claim is not in an approvable state';
  end if;

  -- Re-verify eligibility at decision time, not just at submission time
  -- -- the person record's state may have changed in the interval.
  if not exists (
    select 1
    from public.people p
    where p.id = v_claim.claimed_person_id
      and p.verification_status <> 'merged'
      and not exists (
        select 1
        from public.user_person_links upl
        where upl.person_id = p.id
          and upl.status = 'active'
      )
  ) then
    raise exception 'approve_profile_claim: person record is no longer eligible to be linked';
  end if;

  if exists (
    select 1
    from public.user_person_links upl
    where upl.user_id = v_claim.claimant_user_id
      and upl.status = 'active'
  ) then
    raise exception 'approve_profile_claim: claimant already has an active link to a different person record';
  end if;

  -- The update and the insert happen inside one function invocation --
  -- one atomic unit of work in the calling transaction. If either
  -- statement fails for any reason (including the unique_violation
  -- handled explicitly below), Postgres rolls back every effect this
  -- function has made so far: there is no reachable state where the
  -- claim is approved but no link exists, or vice versa.
  begin
    -- Aliased and qualified for the same reason as the SELECT ... FOR
    -- UPDATE above: this function's OUT parameters include `id`,
    -- `status`, and `decided_at`, so a bare WHERE-clause `id` is
    -- ambiguous. The SET clause's target columns stay unqualified --
    -- that position can only mean the table's own column.
    update public.profile_claims pc
    set status = 'approved',
        reviewer_admin_id = v_reviewer_id,
        decided_at = now()
    where pc.id = p_claim_id;

    insert into public.user_person_links (user_id, person_id, source_claim_id, linked_by_user_id)
    values (v_claim.claimant_user_id, v_claim.claimed_person_id, p_claim_id, v_reviewer_id)
    returning user_person_links.id into v_link_id;
  exception
    when unique_violation then
      -- Covers profile_claims_one_approved_per_claimant_idx,
      -- profile_claims_one_approved_per_person_idx,
      -- profile_claims_one_active_or_approved_per_claimant_idx (M3.1/M5.3),
      -- and user_person_links_one_active_per_user_idx /
      -- user_person_links_one_active_per_person_idx -- whichever fires,
      -- the caller-facing message is the same: nothing was changed.
      raise exception 'approve_profile_claim: this claim, claimant, or person now conflicts with an existing approved claim or active link';
  end;

  return query select p_claim_id, 'approved'::text, now(), v_link_id;
end;
$$;

comment on function public.approve_profile_claim(uuid) is
  'Atomically approves a claim and creates exactly one active '
  'user_person_links row from it. Reviewer-gated; rejects self-review; '
  'only succeeds from under_review; re-verifies person eligibility and '
  'absence of a conflicting active link at decision time, not just at '
  'submission time; locks the claim row (SELECT ... FOR UPDATE) so '
  'concurrent or repeated approval attempts fail safely rather than '
  'racing; rolls back entirely (no partial approved-but-unlinked state) '
  'if any step fails. Takes only a claim id -- no claimant, status, '
  'reviewer, decision timestamp, or link id can be supplied by the '
  'caller. Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.approve_profile_claim(uuid) from public;
grant execute on function public.approve_profile_claim(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- reject_profile_claim -- under_review -> rejected, no link created
-- ---------------------------------------------------------------------
create function public.reject_profile_claim(p_claim_id uuid, p_decision_notes text default null)
returns table (id uuid, status text, decided_at timestamptz)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reviewer_id uuid;
  v_claim public.profile_claims%rowtype;
  v_notes text;
begin
  v_reviewer_id := auth.uid();
  if v_reviewer_id is null then
    raise exception 'reject_profile_claim: authentication required';
  end if;

  if not public.is_active_reviewer(v_reviewer_id) then
    raise exception 'reject_profile_claim: reviewer authorization required';
  end if;

  -- Aliased and qualified for the same reason as approve_profile_claim's
  -- identical lookup: this function's OUT parameters include `id`, so a
  -- bare `where id = p_claim_id` is ambiguous between the table column
  -- and the OUT-parameter variable.
  select * into v_claim
  from public.profile_claims pc
  where pc.id = p_claim_id
  for update;

  if not found then
    raise exception 'reject_profile_claim: claim not found';
  end if;

  if v_claim.claimant_user_id = v_reviewer_id then
    raise exception 'reject_profile_claim: a reviewer cannot decide their own claim';
  end if;

  if v_claim.status <> 'under_review' then
    raise exception 'reject_profile_claim: claim is not in a reviewable state';
  end if;

  v_notes := nullif(left(btrim(coalesce(p_decision_notes, '')), 2000), '');

  -- Aliased and qualified for the same reason as approve_profile_claim's
  -- UPDATE: this function's OUT parameters include `id`, `status`, and
  -- `decided_at`, so a bare WHERE-clause `id` is ambiguous. The SET
  -- clause's target columns stay unqualified -- that position can only
  -- mean the table's own column.
  update public.profile_claims pc
  set status = 'rejected',
      reviewer_admin_id = v_reviewer_id,
      decided_at = now(),
      decision_notes = v_notes
  where pc.id = p_claim_id;

  return query select p_claim_id, 'rejected'::text, now();
end;
$$;

comment on function public.reject_profile_claim(uuid, text) is
  'Atomically rejects a claim. Reviewer-gated; rejects self-review; only '
  'succeeds from under_review; creates no user_person_links row. '
  'p_decision_notes is optional, concise, claimant-visible reviewer '
  'context -- see the profile_claims column-grant note below for why '
  'decision_notes (but never reviewer_admin_id) is safe to surface to the '
  'claimant. Takes no status, reviewer, or timestamp from the caller. '
  'Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.reject_profile_claim(uuid, text) from public;
grant execute on function public.reject_profile_claim(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- Column-level tightening: claimants must never read reviewer_admin_id
-- ---------------------------------------------------------------------
--
-- M3.1 granted `authenticated` table-level SELECT on profile_claims,
-- restricted by RLS to the claimant's own row -- but RLS restricts which
-- *rows* are visible, not which *columns* within them (the same
-- distinction M3.1's own UPDATE-grant removal and M5.3's INSERT-grant
-- removal were about). src/features/identity/status.ts has always
-- deliberately under-selected (never reading reviewer_admin_id), but that
-- was an application-layer convention, not a database guarantee -- a
-- direct client query could still read reviewer_admin_id from a
-- claimant's own row. This milestone's brief is explicit that reviewer
-- identity must never reach the claimant ("do not expose private
-- reviewer identity or internal notes"). Fixed at the grant level:
-- table-level SELECT is revoked and re-granted only on every column
-- except reviewer_admin_id.
--
-- decision_notes stays readable: docs/database-schema.md documents
-- profile_claims visibility as "Administrators and the claimant only" for
-- the row as a whole, with no narrower carve-out for decision_notes
-- specifically, and this milestone's brief explicitly allows a concise,
-- claimant-visible rejection reason. Only reviewer_admin_id -- the
-- reviewer's actual identity -- is withheld.
revoke select on public.profile_claims from authenticated;
grant select (
  id,
  claimant_user_id,
  claimed_person_id,
  status,
  supporting_evidence,
  decision_notes,
  submitted_at,
  decided_at,
  created_at,
  updated_at
) on public.profile_claims to authenticated;
