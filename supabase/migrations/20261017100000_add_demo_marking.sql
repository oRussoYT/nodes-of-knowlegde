-- Demonstration data: marked, visible, and removable in one step
-- (docs/REGRAS.md rule 11; founder decision Aug 2026: "fictitious data is only
-- for testing the platform; when the engine is finished, ALL of it will be
-- wiped").
--
-- 1. `is_demo` on the four root record families (people, organizations,
--    contributions, events). Every dependent row (participations,
--    relationships, narratives, names, credits, event links...) hangs off one
--    of these with ON DELETE CASCADE, so marking the roots marks the world.
-- 2. has_demo_data()        -- anyone (even signed out) may ask "is any of
--                              this fictional?" so every page can say so.
--                              Returns one boolean, no record content.
-- 3. steward_demo_summary() -- reviewer-gated counts of demo vs real roots.
-- 4. wipe_demo_data()       -- deletes every demo root (and, through the
--                              cascades, everything hanging off it), plus the
--                              claims and account links pointing at demo
--                              people. service_role ONLY: it is run on purpose
--                              by the founder, never from the app. Leaves one
--                              audit_logs row with the counts.

alter table public.people        add column is_demo boolean not null default false;
alter table public.organizations add column is_demo boolean not null default false;
alter table public.contributions add column is_demo boolean not null default false;
alter table public.events        add column is_demo boolean not null default false;

comment on column public.people.is_demo is
  'True for fictional demonstration records. Removed by wipe_demo_data().';
comment on column public.organizations.is_demo is
  'True for fictional demonstration records. Removed by wipe_demo_data().';
comment on column public.contributions.is_demo is
  'True for fictional demonstration records. Removed by wipe_demo_data().';
comment on column public.events.is_demo is
  'True for fictional demonstration records. Removed by wipe_demo_data().';

create index people_is_demo_idx        on public.people (is_demo) where is_demo;
create index organizations_is_demo_idx on public.organizations (is_demo) where is_demo;
create index contributions_is_demo_idx on public.contributions (is_demo) where is_demo;
create index events_is_demo_idx        on public.events (is_demo) where is_demo;


-- ---------------------------------------------------------------------------
create function public.has_demo_data()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.people        where is_demo)
      or exists (select 1 from public.organizations where is_demo)
      or exists (select 1 from public.contributions where is_demo)
      or exists (select 1 from public.events        where is_demo);
$$;

comment on function public.has_demo_data() is
  'True while any fictional demonstration record exists. Exposes a single '
  'boolean and no record content, so it is granted to anon as well: every '
  'page, signed in or not, can label the record as demonstration data.';

revoke all on function public.has_demo_data() from public;
grant execute on function public.has_demo_data() to anon, authenticated;


-- ---------------------------------------------------------------------------
create function public.steward_demo_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'steward_demo_summary: authentication required';
  end if;

  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_demo_summary: reviewer authorization required';
  end if;

  return jsonb_build_object(
    'people',        jsonb_build_object('demo', (select count(*) from public.people where is_demo),
                                        'real', (select count(*) from public.people where not is_demo)),
    'organizations', jsonb_build_object('demo', (select count(*) from public.organizations where is_demo),
                                        'real', (select count(*) from public.organizations where not is_demo)),
    'contributions', jsonb_build_object('demo', (select count(*) from public.contributions where is_demo),
                                        'real', (select count(*) from public.contributions where not is_demo)),
    'events',        jsonb_build_object('demo', (select count(*) from public.events where is_demo),
                                        'real', (select count(*) from public.events where not is_demo))
  );
end;
$$;

comment on function public.steward_demo_summary() is
  'Steward console: how much of the record is demonstration vs real, per '
  'root family. Reviewer-gated SECURITY DEFINER; never grant to anon/PUBLIC.';

revoke all on function public.steward_demo_summary() from public;
revoke all on function public.steward_demo_summary() from anon;
grant execute on function public.steward_demo_summary() to authenticated;


-- ---------------------------------------------------------------------------
create function public.wipe_demo_data()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  n_links bigint;
  n_claims bigint;
  n_people bigint;
  n_orgs bigint;
  n_contribs bigint;
  n_events bigint;
  summary jsonb;
begin
  -- Account links and claims point at people without a cascade (they are
  -- account history); for demo people they are demo too.
  delete from public.user_person_links l
   using public.people p
   where p.id = l.person_id and p.is_demo;
  get diagnostics n_links = row_count;

  delete from public.profile_claims c
   using public.people p
   where p.id = c.claimed_person_id and p.is_demo;
  get diagnostics n_claims = row_count;

  delete from public.contributions where is_demo;
  get diagnostics n_contribs = row_count;

  delete from public.events where is_demo;
  get diagnostics n_events = row_count;

  delete from public.people where is_demo;
  get diagnostics n_people = row_count;

  delete from public.organizations where is_demo;
  get diagnostics n_orgs = row_count;

  summary := jsonb_build_object(
    'people', n_people,
    'organizations', n_orgs,
    'contributions', n_contribs,
    'events', n_events,
    'profileClaims', n_claims,
    'accountLinks', n_links
  );

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'delete', 'demo_data', gen_random_uuid(), 'Demonstration data wiped', summary);

  return summary;
end;
$$;

comment on function public.wipe_demo_data() is
  'Deletes every demonstration record (is_demo) and everything that depends '
  'on it, plus account links and claims pointing at demo people. Records '
  'the counts in audit_logs. service_role only -- run deliberately from the '
  'Supabase dashboard, never from the application.';

revoke all on function public.wipe_demo_data() from public;
revoke all on function public.wipe_demo_data() from anon, authenticated;
grant execute on function public.wipe_demo_data() to service_role;
