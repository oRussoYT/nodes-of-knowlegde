-- The last three pieces of docs/ROTEIRO.md:
--   A. etapa 6  -- graduates confirm or correct their own record (links),
--   B. etapa 2  -- public programme pages (aggregates only, published on purpose),
--   C. etapa 7  -- suggestions with the reason, never ranked, with a way out.

-- ===========================================================================
-- A. Graduate confirmation links
-- ===========================================================================
-- A steward creates one private link per graduate on record and sends it the
-- way the institution already reaches its alumni (email, newsletter...). The
-- link opens a page that needs no account: the graduate sees what the record
-- says about them and answers "this is right", "something is wrong" (with a
-- note), or "please don't list me". The answer is stored and audited; "don't
-- list me" also takes their page out of public view at once.
-- A link is a capability (whoever holds it can answer once), so it is long,
-- random, single-use and expires after 90 days.

create table public.graduate_confirmations (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  row_id uuid not null references public.import_rows (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '90 days',
  responded_at timestamptz,
  response text,
  note text,
  constraint graduate_confirmations_response_valid check (response is null or response in ('confirmed', 'corrected', 'declined')),
  constraint graduate_confirmations_response_consistent check ((response is null) = (responded_at is null)),
  constraint graduate_confirmations_token_long check (length(token) >= 48)
);

create index graduate_confirmations_person_idx on public.graduate_confirmations (person_id);
create unique index graduate_confirmations_one_open_per_row
  on public.graduate_confirmations (row_id) where responded_at is null;

alter table public.graduate_confirmations enable row level security;

comment on table public.graduate_confirmations is
  'Single-use links a graduate uses to confirm, correct, or decline their '
  'record. No account needed; the token is the capability. Answers audited.';

-- Steward: create links for every decided row of a batch that has none open.
create function public.steward_create_confirmations(p_batch_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_n integer;
begin
  if auth.uid() is null then
    raise exception 'steward_create_confirmations: authentication required';
  end if;
  select organization_id into v_org from public.import_batches where id = p_batch_id;
  if not found then
    raise exception 'steward_create_confirmations: list not found';
  end if;
  if not public.is_active_reviewer(auth.uid())
     and (v_org is null or not public.can_steward_org(auth.uid(), v_org)) then
    raise exception 'steward_create_confirmations: reviewer authorization required';
  end if;

  insert into public.graduate_confirmations (token, row_id, person_id, created_by_user_id)
  select replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), r.id, r.resolved_person_id, auth.uid()
    from public.import_rows r
   where r.batch_id = p_batch_id
     and r.status in ('matched', 'created')
     and r.resolved_person_id is not null
     and not exists (select 1 from public.graduate_confirmations c where c.row_id = r.id)
  on conflict do nothing;
  get diagnostics v_n = row_count;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'create', 'graduate_confirmations', p_batch_id, 'Confirmation links created', jsonb_build_object('count', v_n));

  return v_n;
end;
$$;

revoke all on function public.steward_create_confirmations(uuid) from public;
revoke all on function public.steward_create_confirmations(uuid) from anon;
grant execute on function public.steward_create_confirmations(uuid) to authenticated;

-- Steward: the links of a batch and their answers.
create function public.steward_list_confirmations(p_batch_id uuid)
returns table (
  id uuid, token text, person_id uuid, display_name text, created_at timestamptz,
  expires_at timestamptz, responded_at timestamptz, response text, note text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'steward_list_confirmations: authentication required';
  end if;
  select b.organization_id into v_org from public.import_batches b where b.id = p_batch_id;
  if not found then
    return;
  end if;
  if not public.is_active_reviewer(auth.uid())
     and (v_org is null or not public.can_steward_org(auth.uid(), v_org)) then
    raise exception 'steward_list_confirmations: reviewer authorization required';
  end if;
  return query
    select c.id, c.token, c.person_id, p.display_name, c.created_at, c.expires_at, c.responded_at, c.response, c.note
      from public.graduate_confirmations c
      join public.import_rows r on r.id = c.row_id
      join public.people p on p.id = c.person_id
     where r.batch_id = p_batch_id
     order by p.display_name, c.created_at;
end;
$$;

revoke all on function public.steward_list_confirmations(uuid) from public;
revoke all on function public.steward_list_confirmations(uuid) from anon;
grant execute on function public.steward_list_confirmations(uuid) to authenticated;

-- Anyone holding a valid link: what the record says (only about them).
create function public.get_confirmation(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  c public.graduate_confirmations%rowtype;
  v_row public.import_rows%rowtype;
  v_org_name text;
begin
  if p_token is null or length(p_token) < 48 then
    return null;
  end if;
  select * into c from public.graduate_confirmations where token = p_token;
  if not found or c.expires_at < now() then
    return null;
  end if;
  select * into v_row from public.import_rows where id = c.row_id;
  select o.name into v_org_name from public.import_batches b join public.organizations o on o.id = b.organization_id where b.id = v_row.batch_id;

  return jsonb_build_object(
    'displayName', (select display_name from public.people where id = c.person_id),
    'institution', v_org_name,
    'degree', v_row.degree,
    'programme', v_row.programme,
    'graduationYear', v_row.graduation_year,
    'destination', (select jsonb_build_object('institution', d.institution_name, 'country', d.country_code, 'asOfYear', d.as_of_year)
                      from public.person_destinations d where d.person_id = c.person_id
                     order by d.as_of_year desc nulls last, d.confirmed_at desc limit 1),
    'answered', c.responded_at is not null,
    'response', c.response
  );
end;
$$;

revoke all on function public.get_confirmation(text) from public;
grant execute on function public.get_confirmation(text) to anon, authenticated;

-- Anyone holding a valid link: answer once.
create function public.respond_confirmation(p_token text, p_response text, p_note text default null)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  c public.graduate_confirmations%rowtype;
begin
  if p_response not in ('confirmed', 'corrected', 'declined') then
    raise exception 'respond_confirmation: unknown answer';
  end if;
  if p_response = 'corrected' and (p_note is null or btrim(p_note) = '') then
    raise exception 'respond_confirmation: tell us what is wrong';
  end if;
  if p_note is not null and length(p_note) > 2000 then
    raise exception 'respond_confirmation: the note is too long';
  end if;

  select * into c from public.graduate_confirmations where token = p_token for update;
  if not found or c.expires_at < now() then
    raise exception 'respond_confirmation: this link is not valid';
  end if;
  if c.responded_at is not null then
    raise exception 'respond_confirmation: this link was already used';
  end if;

  update public.graduate_confirmations
     set responded_at = now(), response = p_response, note = nullif(btrim(coalesce(p_note, '')), '')
   where id = c.id;

  if p_response = 'declined' then
    update public.people
       set is_public = false, published_at = null, published_by_user_id = null
     where id = c.person_id and is_public;
  end if;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'graduate_confirmation', c.id, 'Graduate answered',
          jsonb_build_object('response', p_response, 'personId', c.person_id));

  return p_response;
end;
$$;

revoke all on function public.respond_confirmation(text, text, text) from public;
grant execute on function public.respond_confirmation(text, text, text) to anon, authenticated;


-- ===========================================================================
-- B. Public programme pages
-- ===========================================================================
-- What a prospective student most wants and can never get: where the people
-- who came before went. Published per institution, on purpose, by its
-- stewards, and AGGREGATE ONLY: counts by sector, country, decade and
-- destination institution -- no names, ever, on this page. Graduates who
-- declined (etapa 6) are left out of the counts.

alter table public.organizations
  add column outcomes_public boolean not null default false,
  add column outcomes_published_at timestamptz,
  add column outcomes_published_by_user_id uuid references auth.users (id) on delete set null;

alter table public.organizations
  add constraint organizations_outcomes_published_consistent check (outcomes_public = (outcomes_published_at is not null));

create function public.steward_set_outcomes_public(p_organization_id uuid, p_public boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  if auth.uid() is null then
    raise exception 'steward_set_outcomes_public: authentication required';
  end if;
  if p_organization_id is null or not public.can_steward_org(auth.uid(), p_organization_id) then
    raise exception 'steward_set_outcomes_public: reviewer authorization required';
  end if;
  if p_public is null then
    raise exception 'steward_set_outcomes_public: choose public or not public';
  end if;
  update public.organizations
     set outcomes_public = p_public,
         outcomes_published_at = case when p_public then coalesce(outcomes_published_at, now()) end,
         outcomes_published_by_user_id = case when p_public then auth.uid() end
   where id = p_organization_id
  returning name into v_name;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'organization', p_organization_id, v_name,
          jsonb_build_object('change', case when p_public then 'outcomes published' else 'outcomes unpublished' end));
  return p_public;
end;
$$;

revoke all on function public.steward_set_outcomes_public(uuid, boolean) from public;
revoke all on function public.steward_set_outcomes_public(uuid, boolean) from anon;
grant execute on function public.steward_set_outcomes_public(uuid, boolean) to authenticated;

-- Internal: graduates that may be counted publicly (not declined, not merged).
create function public.public_outcome_graduates(p_organization_id uuid)
returns setof record
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select g.programme, g.graduation_year, g.status, g.destination_institution, g.destination_type, g.destination_country, g.is_demo
    from public.outcome_graduates(p_organization_id) g
   where not exists (select 1 from public.graduate_confirmations c
                      where c.person_id = g.person_id and c.response = 'declined');
$$;

revoke all on function public.public_outcome_graduates(uuid) from public;
revoke all on function public.public_outcome_graduates(uuid) from anon, authenticated;

create function public.list_public_programmes()
returns table (organization_id uuid, organization_name text, programme text, graduates bigint)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select o.id, o.name, g.programme, count(*)
    from public.organizations o
    cross join lateral public.public_outcome_graduates(o.id)
      as g(programme text, graduation_year integer, status text, destination_institution text,
           destination_type text, destination_country text, is_demo boolean)
   where o.outcomes_public and g.programme is not null
   group by o.id, o.name, g.programme
   order by o.name, g.programme;
$$;

revoke all on function public.list_public_programmes() from public;
grant execute on function public.list_public_programmes() to anon, authenticated;

create function public.get_public_programme(p_organization_id uuid, p_programme text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_org public.organizations%rowtype;
  result jsonb;
begin
  select * into v_org from public.organizations where id = p_organization_id and outcomes_public;
  if not found or p_programme is null then
    return null;
  end if;

  with g as (
    select * from public.public_outcome_graduates(p_organization_id)
      as g(programme text, graduation_year integer, status text, destination_institution text,
           destination_type text, destination_country text, is_demo boolean)
     where g.programme = p_programme
  )
  select case when (select count(*) from g) = 0 then null else jsonb_build_object(
    'organizationId', v_org.id,
    'organizationName', v_org.name,
    'programme', p_programme,
    'graduates', (select count(*) from g),
    'known', (select count(*) from g where status = 'found'),
    'firstYear', (select min(graduation_year) from g),
    'lastYear', (select max(graduation_year) from g),
    'demo', (select count(*) from g where is_demo),
    'bySector', coalesce((select jsonb_agg(jsonb_build_object('sector', k, 'people', n) order by k)
       from (select coalesce(destination_type, 'unknown') as k, count(*) as n from g where status = 'found' group by 1) s), '[]'::jsonb),
    'byCountry', coalesce((select jsonb_agg(jsonb_build_object('country', k, 'people', n) order by k nulls last)
       from (select destination_country as k, count(*) as n from g where status = 'found' group by 1) s), '[]'::jsonb),
    'byDecade', coalesce((select jsonb_agg(jsonb_build_object('decade', k, 'graduates', n) order by k nulls last)
       from (select (graduation_year / 10) * 10 as k, count(*) as n from g group by 1) s), '[]'::jsonb),
    'destinations', coalesce((select jsonb_agg(jsonb_build_object('institution', k, 'people', n) order by k)
       from (select destination_institution as k, count(*) as n from g where status = 'found' group by 1) s), '[]'::jsonb)
  ) end
  into result;

  return result;
end;
$$;

comment on function public.get_public_programme(uuid, text) is
  'Public programme page: where graduates of one programme went, aggregates only '
  '(no names), only for institutions that published their outcomes, excluding '
  'graduates who declined. Granted to anon by design.';

revoke all on function public.get_public_programme(uuid, text) from public;
grant execute on function public.get_public_programme(uuid, text) to anon, authenticated;


-- ===========================================================================
-- C. Suggestions with the reason (PRODUTO.md screen 11)
-- ===========================================================================
-- For a signed-in person (through their account link): people they may want
-- to know, each with WHY -- documented at the same institution at the same
-- time, or trained by the same mentor -- excluding people they already have a
-- documented relationship with, people they dismissed, and people who asked
-- to be left out of everyone's suggestions. Writes nothing to the record.
-- Order: by reason, then alphabetical. Never a score.

create table public.suggestion_dismissals (
  user_id uuid not null references auth.users (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  dismissed_at timestamptz not null default now(),
  primary key (user_id, person_id)
);

create table public.suggestion_opt_outs (
  person_id uuid primary key references public.people (id) on delete cascade,
  opted_out_at timestamptz not null default now()
);

alter table public.suggestion_dismissals enable row level security;
alter table public.suggestion_opt_outs enable row level security;

create function public.my_suggestions()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid;
begin
  if auth.uid() is null then
    raise exception 'my_suggestions: authentication required';
  end if;
  select l.person_id into v_me from public.user_person_links l
   where l.user_id = auth.uid() and l.status = 'active' limit 1;
  if v_me is null then
    return jsonb_build_object('personId', null, 'optedOut', false, 'suggestions', '[]'::jsonb);
  end if;

  return jsonb_build_object(
    'personId', v_me,
    'optedOut', exists (select 1 from public.suggestion_opt_outs o where o.person_id = v_me),
    'suggestions', coalesce((
      with mine as (
        select x.organization_id, x.start_date, coalesce(x.end_date, case when x.is_ongoing then current_date end, x.start_date) as end_date
          from public.participations x
         where x.person_id = v_me and x.start_date is not null and x.verification_status <> 'disputed'
      ),
      overlap as (
        select x.person_id, o.name as org_name,
               greatest(extract(year from m.start_date), extract(year from x.start_date))::int as from_year,
               least(extract(year from m.end_date),
                     extract(year from coalesce(x.end_date, case when x.is_ongoing then current_date end, x.start_date)))::int as to_year
          from mine m
          join public.participations x
            on x.organization_id = m.organization_id
           and x.person_id <> v_me
           and x.start_date is not null
           and x.verification_status <> 'disputed'
           and x.start_date <= m.end_date
           and coalesce(x.end_date, case when x.is_ongoing then current_date end, x.start_date) >= m.start_date
          join public.organizations o on o.id = m.organization_id
      ),
      my_mentors as (
        select r.source_person_id as mentor_id from public.relationships r
         where r.target_person_id = v_me and r.kind in ('mentorship', 'advising') and r.verification_status <> 'disputed'
      ),
      siblings as (
        select r.target_person_id as person_id, mp.display_name as mentor_name
          from public.relationships r
          join my_mentors mm on mm.mentor_id = r.source_person_id
          join public.people mp on mp.id = r.source_person_id
         where r.kind in ('mentorship', 'advising') and r.target_person_id <> v_me and r.verification_status <> 'disputed'
      ),
      reasons as (
        select person_id, 1 as ord,
               jsonb_build_object('kind', 'same_place_same_time', 'institution', org_name, 'fromYear', from_year, 'toYear', to_year) as reason
          from overlap
        union all
        select person_id, 2, jsonb_build_object('kind', 'same_mentor', 'mentor', mentor_name) from siblings
      ),
      candidates as (
        select r.person_id, min(r.ord) as ord, jsonb_agg(distinct r.reason) as reasons
          from reasons r
         group by r.person_id
      )
      select jsonb_agg(jsonb_build_object('personId', p.id, 'displayName', p.display_name, 'reasons', c.reasons)
                       order by c.ord, p.display_name, p.id)
        from candidates c
        join public.people p on p.id = c.person_id
       where p.verification_status <> 'merged'
         and not exists (select 1 from public.relationships r
                          where (r.source_person_id = v_me and r.target_person_id = p.id)
                             or (r.target_person_id = v_me and r.source_person_id = p.id))
         and not exists (select 1 from public.suggestion_dismissals d where d.user_id = auth.uid() and d.person_id = p.id)
         and not exists (select 1 from public.suggestion_opt_outs o where o.person_id = p.id)
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.my_suggestions() is
  'People the caller may want to know, each with the documented reason. '
  'Excludes existing relationships, dismissals and opt-outs. Writes nothing. '
  'Ordered by reason then name -- never a score.';

revoke all on function public.my_suggestions() from public;
revoke all on function public.my_suggestions() from anon;
grant execute on function public.my_suggestions() to authenticated;

create function public.dismiss_suggestion(p_person_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'dismiss_suggestion: authentication required';
  end if;
  insert into public.suggestion_dismissals (user_id, person_id) values (auth.uid(), p_person_id)
  on conflict do nothing;
  return true;
end;
$$;

revoke all on function public.dismiss_suggestion(uuid) from public;
revoke all on function public.dismiss_suggestion(uuid) from anon;
grant execute on function public.dismiss_suggestion(uuid) to authenticated;

create function public.set_my_suggestion_opt_out(p_opt_out boolean)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid;
begin
  if auth.uid() is null then
    raise exception 'set_my_suggestion_opt_out: authentication required';
  end if;
  select l.person_id into v_me from public.user_person_links l
   where l.user_id = auth.uid() and l.status = 'active' limit 1;
  if v_me is null then
    raise exception 'set_my_suggestion_opt_out: no person record is linked to this account';
  end if;
  if p_opt_out then
    insert into public.suggestion_opt_outs (person_id) values (v_me) on conflict do nothing;
  else
    delete from public.suggestion_opt_outs where person_id = v_me;
  end if;
  return p_opt_out;
end;
$$;

revoke all on function public.set_my_suggestion_opt_out(boolean) from public;
revoke all on function public.set_my_suggestion_opt_out(boolean) from anon;
grant execute on function public.set_my_suggestion_opt_out(boolean) to authenticated;
