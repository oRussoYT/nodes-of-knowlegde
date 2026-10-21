-- Milestone M3.1: Identity Foundation
--
-- Establishes the minimum database structures required to represent
-- historical people independently of authenticated user accounts, per
-- docs/decisions/0001-separate-people-from-user-accounts.md and the
-- "Identity and Access" section of docs/database-schema.md.
--
-- Tables created: people, profile_claims, user_person_links, audit_logs.
-- See docs/database-implementation.md for the full design rationale,
-- field-name mapping against the milestone brief, and known deviations
-- from docs/database-schema.md that are flagged for product-owner
-- sign-off rather than applied silently.
--
-- Extensions: none required. PostgreSQL 17 (see supabase/config.toml,
-- db.major_version = 17) provides gen_random_uuid() as a built-in
-- function; pgcrypto/uuid-ossp are not needed for primary keys here.

-- ---------------------------------------------------------------------
-- Common foundations
-- ---------------------------------------------------------------------

-- Reusable trigger function to maintain updated_at on any table that
-- has the column. Kept generic on purpose (per CLAUDE.md's guidance to
-- avoid unnecessary abstraction, this is the one piece of boilerplate
-- genuinely needed by more than one table in this migration).
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

comment on function public.set_updated_at() is
  'Sets updated_at = now() on UPDATE. Attach via a BEFORE UPDATE trigger '
  'to any table with an updated_at timestamptz column.';

-- ---------------------------------------------------------------------
-- people
-- ---------------------------------------------------------------------

create table public.people (
  id uuid primary key default gen_random_uuid(),

  given_name text not null,
  family_name text not null,
  preferred_name text,
  display_name text not null,

  biography text,

  date_of_birth date,
  date_of_death date,
  -- Independently stored, NOT derived from date_of_death: NetPDBFF must
  -- be able to represent a person known to be deceased even when the
  -- exact date isn't known (common for historical/imported records).
  -- See docs/database-implementation.md for the revision history on
  -- this column -- an earlier draft made this a generated column, which
  -- could not represent "deceased, date unknown".
  is_deceased boolean not null default false,

  verification_status text not null default 'provisional',
  source_type text not null,

  created_by_user_id uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint people_given_name_not_blank check (btrim(given_name) <> ''),
  constraint people_family_name_not_blank check (btrim(family_name) <> ''),
  constraint people_preferred_name_not_blank
    check (preferred_name is null or btrim(preferred_name) <> ''),
  constraint people_display_name_not_blank check (btrim(display_name) <> ''),

  constraint people_verification_status_valid check (
    verification_status in (
      'provisional', 'claim_pending', 'verified_self', 'verified_admin',
      'disputed', 'merged'
    )
  ),
  constraint people_source_type_valid check (
    source_type in (
      'self_reported', 'nominated_by_other', 'admin_entered',
      'imported_historical'
    )
  ),
  constraint people_death_after_birth check (
    date_of_death is null or date_of_birth is null
    or date_of_death >= date_of_birth
  ),
  -- date_of_death may only be set once is_deceased is true. The reverse
  -- is deliberately NOT required: is_deceased = true with date_of_death
  -- null represents "known to be deceased, exact date unknown".
  constraint people_date_of_death_requires_deceased check (
    date_of_death is null or is_deceased
  )
);

comment on table public.people is
  'Durable record of a person connected to PDBFF, independent of whether '
  'they ever hold an auth.users account. Never merged with auth.users -- '
  'see docs/decisions/0001-separate-people-from-user-accounts.md. Not '
  'public by default: see docs/privacy-model.md and the RLS policies '
  'below (no client-side SELECT is granted in this milestone).';
comment on column public.people.display_name is
  'Name shown in listings; may differ from given_name/family_name.';
comment on column public.people.verification_status is
  'See "Person verification" status table in docs/database-schema.md.';
comment on column public.people.source_type is
  'How this record entered the system; see the Provenance Model section '
  'of docs/database-schema.md.';
comment on column public.people.is_deceased is
  'Independently stored -- may be true with date_of_death still null, '
  'to represent a person known to be deceased with an unknown date.';
comment on column public.people.created_by_user_id is
  'Nullable: imported/historical records may have no attributable '
  'submitter.';

create index people_verification_status_idx on public.people (verification_status);
create index people_created_by_user_id_idx on public.people (created_by_user_id);

create trigger people_set_updated_at
  before update on public.people
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- profile_claims
-- ---------------------------------------------------------------------

create table public.profile_claims (
  id uuid primary key default gen_random_uuid(),

  claimant_user_id uuid not null references auth.users (id),
  claimed_person_id uuid not null references public.people (id),

  status text not null default 'submitted',
  supporting_evidence text,

  reviewer_admin_id uuid references auth.users (id),
  decision_notes text,

  submitted_at timestamptz not null default now(),
  decided_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint profile_claims_status_valid check (
    status in ('submitted', 'under_review', 'approved', 'rejected', 'withdrawn')
  ),
  -- decided_at is set exactly on terminal-by-decision-or-withdrawal states,
  -- and only then.
  constraint profile_claims_decided_at_matches_status check (
    (status in ('approved', 'rejected', 'withdrawn')) = (decided_at is not null)
  ),
  -- an approval or rejection must be attributable to a reviewer.
  constraint profile_claims_reviewer_required_on_decision check (
    status not in ('approved', 'rejected') or reviewer_admin_id is not null
  ),
  -- self-approval is blocked at the database level, per milestone brief.
  constraint profile_claims_no_self_review check (
    reviewer_admin_id is null or reviewer_admin_id <> claimant_user_id
  )
);

comment on table public.profile_claims is
  'A user''s request asserting "this person record is me", subject to '
  'admin review before it becomes a user_person_links row. Inserting a '
  'claim never itself creates a link -- see docs/decisions/'
  '0001-separate-people-from-user-accounts.md. Status transitions are '
  'documented in the "Profile claims" table of docs/database-schema.md.';
comment on column public.profile_claims.supporting_evidence is
  'Free-text evidence/message from the claimant supporting their claim.';
comment on column public.profile_claims.decision_notes is
  'Reviewer notes explaining the decision (approval or rejection).';

-- No more than one pending (submitted/under_review) claim by the same
-- user for the same person at a time.
create unique index profile_claims_one_active_pair_idx
  on public.profile_claims (claimant_user_id, claimed_person_id)
  where status in ('submitted', 'under_review');

-- Direct, database-level enforcement that a claimant can hold at most
-- one approved claim, and a person can be the subject of at most one
-- approved claim, ever -- not merely "at most one active
-- user_person_links row", which is a separate, later step and can lag
-- behind approval. This closes a real gap in an earlier draft: a
-- trigger that only checked user_person_links did not stop a second
-- claim from being approved before the first approval's link row had
-- been created.
--
-- Conservative choice, flagged for product-owner confirmation: once a
-- claim is approved for a given claimant or person, no other claim for
-- that same claimant/person can ever become approved again, even after
-- the resulting user_person_links row is later revoked (profile_claims
-- rows are never un-approved -- see the Status Models section of
-- docs/database-schema.md). If "revoke, then approve a corrected
-- claim" needs to be supported as a real workflow, this constraint
-- will need revisiting -- see docs/database-implementation.md.
create unique index profile_claims_one_approved_per_claimant_idx
  on public.profile_claims (claimant_user_id)
  where status = 'approved';

create unique index profile_claims_one_approved_per_person_idx
  on public.profile_claims (claimed_person_id)
  where status = 'approved';

create index profile_claims_claimed_person_id_idx on public.profile_claims (claimed_person_id);
create index profile_claims_status_idx on public.profile_claims (status);

create trigger profile_claims_set_updated_at
  before update on public.profile_claims
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- user_person_links
-- ---------------------------------------------------------------------

create table public.user_person_links (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null references auth.users (id),
  person_id uuid not null references public.people (id),

  status text not null default 'active',
  linked_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,

  -- unique (see the index below): a given approved claim can back at
  -- most one link, ever -- it cannot be reused to authorize a second,
  -- later link once the first is revoked.
  source_claim_id uuid references public.profile_claims (id),
  -- Addition beyond docs/database-schema.md's user_person_links entry --
  -- see docs/database-implementation.md for why this was added and why
  -- it isn't treated as an architecture contradiction.
  linked_by_user_id uuid references auth.users (id),

  created_at timestamptz not null default now(),

  constraint user_person_links_status_valid check (status in ('active', 'revoked')),
  constraint user_person_links_revoked_at_matches_status check (
    (status = 'revoked') = (revoked_at is not null)
  )
);

comment on table public.user_person_links is
  'The authoritative, approved link between an auth.users account and a '
  'people row. Created only through the claim-approval workflow -- never '
  'directly writable by end users. See docs/decisions/'
  '0001-separate-people-from-user-accounts.md.';
comment on column public.user_person_links.source_claim_id is
  'The approved profile_claims row that produced this link, where '
  'applicable. Validated by a trigger to actually be approved and to '
  'match user_id/person_id.';
comment on column public.user_person_links.linked_by_user_id is
  'Administrative actor (if any) who performed the link. Nullable: an '
  'automated/service-role process may not have a human actor to record.';

-- At most one active link per account, and at most one active link per
-- person, per the initial one-to-one model in the milestone brief.
create unique index user_person_links_one_active_per_user_idx
  on public.user_person_links (user_id)
  where status = 'active';
create unique index user_person_links_one_active_per_person_idx
  on public.user_person_links (person_id)
  where status = 'active';

create index user_person_links_user_id_idx on public.user_person_links (user_id);
create index user_person_links_person_id_idx on public.user_person_links (person_id);

-- A given claim can back at most one link, ever. NULLs are exempt from
-- uniqueness by normal Postgres semantics, so links with no
-- source_claim_id (none expected in practice, but not forbidden) don't
-- conflict with each other.
create unique index user_person_links_source_claim_id_idx
  on public.user_person_links (source_claim_id);

-- Referential integrity to the approved claim: if source_claim_id is
-- set, it must point at a profile_claims row that is actually approved
-- and actually belongs to the same user/person pair being linked.
create function public.user_person_links_validate_source_claim()
returns trigger
language plpgsql
as $$
declare
  claim public.profile_claims%rowtype;
begin
  if new.source_claim_id is null then
    return new;
  end if;

  select * into claim from public.profile_claims where id = new.source_claim_id;

  if not found then
    raise exception
      'user_person_links: source_claim_id % does not reference an existing profile_claims row',
      new.source_claim_id;
  end if;

  if claim.status <> 'approved' then
    raise exception
      'user_person_links: source_claim_id % is not an approved claim (status = %)',
      new.source_claim_id, claim.status;
  end if;

  if claim.claimant_user_id <> new.user_id or claim.claimed_person_id <> new.person_id then
    raise exception
      'user_person_links: source_claim_id % does not match this link''s user_id/person_id',
      new.source_claim_id;
  end if;

  return new;
end;
$$;

comment on function public.user_person_links_validate_source_claim() is
  'Ensures source_claim_id, when set, points at an approved claim for '
  'the same user/person pair -- preserves referential integrity to the '
  'claim that authorized the link.';

create trigger user_person_links_validate_source_claim_trigger
  before insert or update on public.user_person_links
  for each row
  execute function public.user_person_links_validate_source_claim();

-- ---------------------------------------------------------------------
-- audit_logs
-- ---------------------------------------------------------------------
--
-- Narrow foundation only, per the milestone brief -- not the full
-- audit framework described in docs/database-schema.md (which adds
-- before_state/after_state/reason). Expand in a later milestone.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),

  actor_user_id uuid references auth.users (id),
  action text not null,

  subject_type text not null,
  subject_id uuid not null,
  subject_label text not null,

  metadata jsonb,

  occurred_at timestamptz not null default now(),

  constraint audit_logs_action_valid check (
    action in ('create', 'update', 'delete', 'approve', 'reject')
  )
);

comment on table public.audit_logs is
  'Append-only log of administrative and sensitive data changes. Not '
  'the authoritative source of any business record. subject_id is '
  'intentionally not a foreign key -- see docs/database-schema.md''s '
  '"Is a generic reference justified here?" note for audit_logs -- '
  'compensated for by the required subject_label snapshot.';
comment on column public.audit_logs.subject_id is
  'Deliberately not a foreign key: audit rows must outlive their '
  'subject (e.g. after a merge or deletion).';
comment on column public.audit_logs.subject_label is
  'Stable, human-readable snapshot of the subject at write time, so '
  'the entry stays legible even if the underlying row changes or is '
  'gone.';

create index audit_logs_subject_idx on public.audit_logs (subject_type, subject_id);
create index audit_logs_actor_user_id_idx on public.audit_logs (actor_user_id);
create index audit_logs_occurred_at_idx on public.audit_logs (occurred_at);

-- ---------------------------------------------------------------------
-- Claim withdrawal function
-- ---------------------------------------------------------------------
--
-- The narrowly-scoped alternative to a column-open UPDATE policy,
-- referenced in the profile_claims RLS section below. SECURITY DEFINER
-- so it can perform its single, tightly-constrained UPDATE even though
-- authenticated has no UPDATE grant on profile_claims at all; search_path
-- is pinned to avoid the classic SECURITY DEFINER search_path hijack.
-- The function enforces ownership (claimant_user_id = auth.uid()) and
-- the pending -> withdrawn transition itself -- it does not depend on
-- any RLS policy to do so, since SECURITY DEFINER bypasses RLS on the
-- table it touches.
create function public.withdraw_profile_claim(p_claim_id uuid)
returns public.profile_claims
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_claim public.profile_claims%rowtype;
begin
  update public.profile_claims
  set status = 'withdrawn',
      decided_at = now()
  where id = p_claim_id
    and claimant_user_id = auth.uid()
    and status in ('submitted', 'under_review')
  returning * into updated_claim;

  if not found then
    raise exception
      'withdraw_profile_claim: claim % was not found, is not owned by the '
      'caller, or is not in a withdrawable state (submitted/under_review)',
      p_claim_id;
  end if;

  return updated_claim;
end;
$$;

comment on function public.withdraw_profile_claim(uuid) is
  'Lets the calling user withdraw their own pending profile_claims row. '
  'Only status and decided_at are ever changed, and only for a claim '
  'the caller owns while it is submitted/under_review. This exists so '
  'that authenticated never needs a raw UPDATE grant on profile_claims '
  '-- see the RLS section below for why a row-level UPDATE policy alone '
  'was rejected as insufficient.';

revoke all on function public.withdraw_profile_claim(uuid) from public;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
--
-- Conservative-by-default: no policy is created for anon/authenticated
-- unless explicitly required below. service_role bypasses RLS entirely
-- per Supabase convention, so administrative/server-side operations are
-- unaffected. No administrator role table exists yet -- administrative
-- review is performed through trusted server-side service-role
-- operations only, per the milestone brief; a client-controlled
-- "is_admin" flag is deliberately not introduced here.

alter table public.people enable row level security;
alter table public.profile_claims enable row level security;
alter table public.user_person_links enable row level security;
alter table public.audit_logs enable row level security;

-- people: no policies. anon and authenticated get zero access; this is
-- intentionally more restrictive than the eventual product (display_name
-- is meant to be public for verified people per docs/privacy-model.md),
-- pending profile_visibility_settings, which does not exist yet. See
-- docs/database-implementation.md for the follow-up this implies.

-- profile_claims: a claimant may see and create their own claims.
-- Withdrawal is deliberately NOT implemented as a row-level UPDATE
-- policy -- RLS restricts which *rows* a role can touch, not which
-- *columns*, so a policy of the form "authenticated may UPDATE their
-- own row while status is pending" would still let the same UPDATE
-- statement rewrite claimant_user_id, claimed_person_id,
-- reviewer_admin_id, decision_notes, submitted_at, or decided_at in the
-- same call, as long as the final row still matched the USING/WITH
-- CHECK condition on claimant_user_id/status. Column-level GRANTs
-- (`GRANT UPDATE (status) ON ...`) were considered and rejected too --
-- they're real, but still leave a raw UPDATE statement as the attack
-- surface, and Postgres's own docs note they interact with RLS policy
-- evaluation in ways that are easy to get subtly wrong. Instead:
-- authenticated has NO update grant on this table at all (see Grants
-- below), and the only way to withdraw a claim is the narrowly-scoped
-- withdraw_profile_claim() function defined above (see the "Claim
-- withdrawal function" section), which touches exactly two columns
-- (status, decided_at) and nothing else, and enforces ownership and the
-- pending -> withdrawn transition itself rather than relying on RLS to
-- do it.
create policy profile_claims_select_own
  on public.profile_claims
  for select
  to authenticated
  using (claimant_user_id = auth.uid());

create policy profile_claims_insert_own
  on public.profile_claims
  for insert
  to authenticated
  with check (claimant_user_id = auth.uid());

-- user_person_links: no policies. Links are created only through the
-- (service-role-mediated) claim-approval workflow; ordinary users
-- cannot read or write this table directly in this milestone.

-- audit_logs: no policies. Ordinary users, including the actor of a
-- logged action, cannot read audit logs; writes happen via service-role
-- only.

-- ---------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------
--
-- supabase/config.toml does not set api.auto_expose_new_tables (the
-- modern, non-legacy default), which per its own comment means new
-- public-schema tables are NOT reachable by anon/authenticated/
-- service_role "without explicit GRANTs". RLS alone is not enough --
-- Postgres checks table-level privileges before it ever evaluates a
-- row-level security policy, and BYPASSRLS (service_role's attribute)
-- only skips policy checks, not the underlying GRANT system. So every
-- role that needs any access at all must be granted it explicitly here.

-- service_role: full access, to support trusted server-side
-- administrative operations (claim review, link creation, audit
-- logging), per "service-role access remains available through
-- Supabase's normal server-side behavior."
grant select, insert, update, delete on public.people to service_role;
grant select, insert, update, delete on public.profile_claims to service_role;
grant select, insert, update, delete on public.user_person_links to service_role;
grant select, insert, update, delete on public.audit_logs to service_role;

-- authenticated: only what the policies above actually use. No UPDATE
-- and no DELETE -- claims are preserved, never removed, for audit/
-- history, and the only mutation authenticated can ever make is via
-- withdraw_profile_claim(), granted below.
grant select, insert on public.profile_claims to authenticated;
grant execute on function public.withdraw_profile_claim(uuid) to authenticated;

-- people, user_person_links, and audit_logs deliberately get NO grants
-- to anon or authenticated in this milestone. Combined with having zero
-- RLS policies on these tables, this is a two-layer deny (missing GRANT
-- *and* RLS with no matching policy) -- stronger than relying on RLS
-- alone. A later milestone that opens any client-side read (e.g. public
-- display_name once profile_visibility_settings exists) must add both
-- the GRANT and the corresponding policy; adding one without the other
-- will not restore access.
