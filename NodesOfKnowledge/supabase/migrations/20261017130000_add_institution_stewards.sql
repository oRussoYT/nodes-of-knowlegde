-- Several institutions in one system (docs/ROTEIRO.md etapa 3).
--
-- Until now every steward was a platform reviewer and saw everything. Now an
-- institution can have its OWN stewards, who see and act only on their
-- institution's part of the record:
--   * the steward console (overview, needs-a-human lists, corpus timeline)
--     scoped to the people documented at that institution,
--   * graduate-list imports for that institution,
--   * publishing the pages of people documented there.
-- Platform reviewers keep the whole view, keep the claim-review queue (which
-- stays platform-only), and are the only ones who appoint or remove
-- institution stewards. One shared record, many custodians: there is no copy
-- of the data per institution, only a scope per steward.
--
-- Tables: institution_stewards (RLS on, no client grants).
-- Helpers: can_steward_org(user, org), is_any_steward(user) -- internal.
-- Client functions: am_i_a_steward(), my_steward_scope(),
--   steward_grant_institution_steward(), steward_revoke_institution_steward(),
--   steward_list_institution_stewards(); the console functions gain an
--   optional p_organization_id; import and publish functions accept
--   institution stewards for their own institution.

create table public.institution_stewards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'active',
  granted_by_user_id uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_by_user_id uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  constraint institution_stewards_status_valid check (status in ('active', 'revoked')),
  constraint institution_stewards_revoked_consistent check ((status = 'revoked') = (revoked_at is not null)),
  constraint institution_stewards_no_self_grant check (granted_by_user_id is null or granted_by_user_id <> user_id)
);

create unique index institution_stewards_one_active
  on public.institution_stewards (organization_id, user_id) where status = 'active';
create index institution_stewards_user_idx on public.institution_stewards (user_id) where status = 'active';

comment on table public.institution_stewards is
  'Who looks after which institution''s part of the record. Appointed and '
  'removed only by platform reviewers. A steward''s reach is their '
  'institution; platform reviewers keep the whole view.';

alter table public.institution_stewards enable row level security;


-- ---------------------------------------------------------------------------
-- Internal helpers (not granted to any client role).
-- ---------------------------------------------------------------------------
create function public.can_steward_org(p_user_id uuid, p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user_id is not null and p_organization_id is not null and (
    public.is_active_reviewer(p_user_id)
    or exists (
      select 1 from public.institution_stewards s
       where s.user_id = p_user_id and s.organization_id = p_organization_id and s.status = 'active')
  );
$$;

create function public.is_any_steward(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user_id is not null and (
    public.is_active_reviewer(p_user_id)
    or exists (select 1 from public.institution_stewards s where s.user_id = p_user_id and s.status = 'active')
  );
$$;

revoke all on function public.can_steward_org(uuid, uuid) from public;
revoke all on function public.can_steward_org(uuid, uuid) from anon, authenticated;
revoke all on function public.is_any_steward(uuid) from public;
revoke all on function public.is_any_steward(uuid) from anon, authenticated;


-- ---------------------------------------------------------------------------
-- Who am I, as a steward?
-- ---------------------------------------------------------------------------
create function public.am_i_a_steward()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'am_i_a_steward: authentication required';
  end if;
  return public.is_any_steward(auth.uid());
end;
$$;

comment on function public.am_i_a_steward() is
  'Whether the caller is a platform reviewer or an institution steward. UI '
  'signal only; every steward function re-checks.';

revoke all on function public.am_i_a_steward() from public;
revoke all on function public.am_i_a_steward() from anon;
grant execute on function public.am_i_a_steward() to authenticated;

create function public.my_steward_scope()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'my_steward_scope: authentication required';
  end if;
  return jsonb_build_object(
    'platform', public.is_active_reviewer(auth.uid()),
    'organizations', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name) order by o.name, o.id)
        from public.organizations o
       where exists (select 1 from public.institution_stewards s
                      where s.organization_id = o.id and s.user_id = auth.uid() and s.status = 'active')
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.my_steward_scope() is
  'The caller''s steward reach: platform-wide (reviewer) and/or the '
  'institutions they steward, alphabetical.';

revoke all on function public.my_steward_scope() from public;
revoke all on function public.my_steward_scope() from anon;
grant execute on function public.my_steward_scope() to authenticated;


-- ---------------------------------------------------------------------------
-- Appointing and removing institution stewards (platform reviewers only).
-- ---------------------------------------------------------------------------
create function public.steward_grant_institution_steward(p_organization_id uuid, p_email text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid;
  v_id uuid;
  v_org_name text;
begin
  if auth.uid() is null then
    raise exception 'steward_grant_institution_steward: authentication required';
  end if;
  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_grant_institution_steward: reviewer authorization required';
  end if;

  select name into v_org_name from public.organizations where id = p_organization_id;
  if not found then
    raise exception 'steward_grant_institution_steward: institution not found';
  end if;

  select id into v_user from auth.users where lower(email) = lower(btrim(coalesce(p_email, ''))) limit 1;
  if v_user is null then
    raise exception 'steward_grant_institution_steward: no account with that email';
  end if;
  if v_user = auth.uid() then
    raise exception 'steward_grant_institution_steward: you cannot appoint yourself';
  end if;

  select id into v_id from public.institution_stewards
   where organization_id = p_organization_id and user_id = v_user and status = 'active';
  if v_id is not null then
    return v_id;
  end if;

  insert into public.institution_stewards (organization_id, user_id, granted_by_user_id)
  values (p_organization_id, v_user, auth.uid())
  returning id into v_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'create', 'institution_steward', v_id, v_org_name,
          jsonb_build_object('organizationId', p_organization_id, 'userId', v_user));

  return v_id;
end;
$$;

revoke all on function public.steward_grant_institution_steward(uuid, text) from public;
revoke all on function public.steward_grant_institution_steward(uuid, text) from anon;
grant execute on function public.steward_grant_institution_steward(uuid, text) to authenticated;

create function public.steward_revoke_institution_steward(p_steward_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'steward_revoke_institution_steward: authentication required';
  end if;
  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_revoke_institution_steward: reviewer authorization required';
  end if;

  update public.institution_stewards
     set status = 'revoked', revoked_at = now(), revoked_by_user_id = auth.uid()
   where id = p_steward_id and status = 'active'
  returning organization_id into v_org;
  if v_org is null then
    raise exception 'steward_revoke_institution_steward: active appointment not found';
  end if;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'institution_steward', p_steward_id, 'Institution steward removed',
          jsonb_build_object('organizationId', v_org));
  return true;
end;
$$;

revoke all on function public.steward_revoke_institution_steward(uuid) from public;
revoke all on function public.steward_revoke_institution_steward(uuid) from anon;
grant execute on function public.steward_revoke_institution_steward(uuid) to authenticated;

create function public.steward_list_institution_stewards()
returns table (id uuid, organization_id uuid, organization_name text, email text, granted_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'steward_list_institution_stewards: authentication required';
  end if;
  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_list_institution_stewards: reviewer authorization required';
  end if;
  return query
    select s.id, o.id, o.name, u.email::text, s.granted_at
      from public.institution_stewards s
      join public.organizations o on o.id = s.organization_id
      join auth.users u on u.id = s.user_id
     where s.status = 'active'
     order by o.name, u.email;
end;
$$;

revoke all on function public.steward_list_institution_stewards() from public;
revoke all on function public.steward_list_institution_stewards() from anon;
grant execute on function public.steward_list_institution_stewards() to authenticated;


-- ---------------------------------------------------------------------------
-- Console functions, now with an optional institution scope.
-- p_organization_id null = the whole record (platform reviewers only);
-- otherwise the people documented at that institution (its stewards too).
-- ---------------------------------------------------------------------------
drop function public.steward_overview();
drop function public.steward_attention();
drop function public.steward_corpus_timeline();

create function public.steward_overview(p_organization_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'steward_overview: authentication required';
  end if;
  if (p_organization_id is null and not public.is_active_reviewer(auth.uid()))
     or (p_organization_id is not null and not public.can_steward_org(auth.uid(), p_organization_id)) then
    raise exception 'steward_overview: reviewer authorization required';
  end if;

  with scoped_people as (
    select p.* from public.people p
     where p_organization_id is null
        or exists (select 1 from public.participations x where x.person_id = p.id and x.organization_id = p_organization_id)
  ),
  scoped_parts as (
    select x.* from public.participations x
     where p_organization_id is null or x.organization_id = p_organization_id
  )
  select jsonb_build_object(
    'scope', case when p_organization_id is null then 'platform' else 'institution' end,
    'organizationId', p_organization_id,
    'people', jsonb_build_object(
      'total',    (select count(*) from scoped_people p where p.verification_status <> 'merged'),
      'merged',   (select count(*) from scoped_people p where p.verification_status = 'merged'),
      'claimed',  (select count(distinct l.person_id) from public.user_person_links l
                     join scoped_people p on p.id = l.person_id
                    where l.status = 'active' and p.verification_status <> 'merged'),
      'deceased', (select count(*) from scoped_people p where p.is_deceased and p.verification_status <> 'merged'),
      'byVerification', coalesce((select jsonb_object_agg(s.verification_status, s.n) from (
          select p.verification_status, count(*) as n from scoped_people p
           where p.verification_status <> 'merged' group by p.verification_status) s), '{}'::jsonb),
      'bySource', coalesce((select jsonb_object_agg(s.source_type, s.n) from (
          select p.source_type, count(*) as n from scoped_people p
           where p.verification_status <> 'merged' group by p.source_type) s), '{}'::jsonb)
    ),
    'organizations', jsonb_build_object(
      'total', (select count(*) from public.organizations o where p_organization_id is null or o.id = p_organization_id),
      'byVerification', coalesce((select jsonb_object_agg(s.verification_status, s.n) from (
          select o.verification_status, count(*) as n from public.organizations o
           where p_organization_id is null or o.id = p_organization_id
           group by o.verification_status) s), '{}'::jsonb)
    ),
    'participations', jsonb_build_object(
      'total',       (select count(*) from scoped_parts),
      'undated',     (select count(*) from scoped_parts x where x.date_is_unknown),
      'approximate', (select count(*) from scoped_parts x where x.is_approximate),
      'unconfirmed', (select count(*) from scoped_parts x where x.date_is_uncertain),
      'ongoing',     (select count(*) from scoped_parts x where x.is_ongoing)
    ),
    'relationships', jsonb_build_object('total', (
      select count(*) from public.relationships r
       where p_organization_id is null
          or exists (select 1 from scoped_people p where p.id = r.source_person_id)
          or exists (select 1 from scoped_people p where p.id = r.target_person_id))),
    'contributions', jsonb_build_object('total', (
      select count(*) from public.contributions c
       where p_organization_id is null
          or exists (select 1 from public.organization_contributions oc
                      where oc.contribution_id = c.id and oc.organization_id = p_organization_id))),
    'claimsAwaitingReview', (
      select count(*) from public.profile_claims c
       where c.status in ('submitted', 'under_review')
         and (p_organization_id is null or exists (select 1 from scoped_people p where p.id = c.claimed_person_id)))
  )
  into result;

  return result;
end;
$$;

create function public.steward_attention(p_organization_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'steward_attention: authentication required';
  end if;
  if (p_organization_id is null and not public.is_active_reviewer(auth.uid()))
     or (p_organization_id is not null and not public.can_steward_org(auth.uid(), p_organization_id)) then
    raise exception 'steward_attention: reviewer authorization required';
  end if;

  with
  scoped_people as (
    select p.id, p.display_name from public.people p
     where p.verification_status <> 'merged'
       and (p_organization_id is null
            or exists (select 1 from public.participations x where x.person_id = p.id and x.organization_id = p_organization_id))
  ),
  unattached as (
    -- Only meaningful for the whole record: inside an institution scope every
    -- person is, by definition, attached to it.
    select p.id, p.display_name from scoped_people p
     where p_organization_id is null
       and not exists (select 1 from public.participations x where x.person_id = p.id)
  ),
  undated as (
    select x.id, x.person_id, p.display_name as person_display_name,
           x.organization_id, o.name as organization_name, x.capacity
      from public.participations x
      join scoped_people p        on p.id = x.person_id
      join public.organizations o on o.id = x.organization_id
     where x.date_is_unknown
       and (p_organization_id is null or x.organization_id = p_organization_id)
  ),
  name_keys as (
    select p.id, p.display_name, lower(regexp_replace(btrim(p.display_name), '\s+', ' ', 'g')) as name_key
      from scoped_people p
  ),
  duplicate_groups as (
    select n.name_key,
           jsonb_agg(jsonb_build_object('id', n.id, 'displayName', n.display_name) order by n.display_name, n.id) as people
      from name_keys n
     group by n.name_key
    having count(*) > 1
  )
  select jsonb_build_object(
    'peopleWithoutParticipation', jsonb_build_object(
      'total', (select count(*) from unattached),
      'items', coalesce((select jsonb_agg(jsonb_build_object('id', u.id, 'displayName', u.display_name) order by u.display_name, u.id)
                           from (select * from unattached order by display_name, id limit 50) u), '[]'::jsonb)),
    'undatedParticipations', jsonb_build_object(
      'total', (select count(*) from undated),
      'items', coalesce((select jsonb_agg(jsonb_build_object(
                 'id', d.id, 'personId', d.person_id, 'personDisplayName', d.person_display_name,
                 'organizationId', d.organization_id, 'organizationName', d.organization_name, 'capacity', d.capacity)
               order by d.person_display_name, d.organization_name, d.id)
          from (select * from undated order by person_display_name, organization_name, id limit 50) d), '[]'::jsonb)),
    'possibleDuplicates', jsonb_build_object(
      'total', (select count(*) from duplicate_groups),
      'items', coalesce((select jsonb_agg(jsonb_build_object('nameKey', g.name_key, 'people', g.people) order by g.name_key)
          from (select * from duplicate_groups order by name_key limit 50) g), '[]'::jsonb))
  )
  into result;

  return result;
end;
$$;

create function public.steward_corpus_timeline(p_organization_id uuid default null)
returns table (decade integer, participations_starting bigint, people_starting bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'steward_corpus_timeline: authentication required';
  end if;
  if (p_organization_id is null and not public.is_active_reviewer(auth.uid()))
     or (p_organization_id is not null and not public.can_steward_org(auth.uid(), p_organization_id)) then
    raise exception 'steward_corpus_timeline: reviewer authorization required';
  end if;

  return query
    select (floor(extract(year from x.start_date) / 10) * 10)::integer,
           count(*)::bigint,
           count(distinct x.person_id)::bigint
      from public.participations x
      join public.people p on p.id = x.person_id
     where x.start_date is not null
       and p.verification_status <> 'merged'
       and (p_organization_id is null or x.organization_id = p_organization_id)
     group by 1
     order by 1;
end;
$$;

revoke all on function public.steward_overview(uuid) from public;
revoke all on function public.steward_overview(uuid) from anon;
grant execute on function public.steward_overview(uuid) to authenticated;
revoke all on function public.steward_attention(uuid) from public;
revoke all on function public.steward_attention(uuid) from anon;
grant execute on function public.steward_attention(uuid) to authenticated;
revoke all on function public.steward_corpus_timeline(uuid) from public;
revoke all on function public.steward_corpus_timeline(uuid) from anon;
grant execute on function public.steward_corpus_timeline(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- Imports and publishing: institution stewards act for their institution.
-- (Bodies identical to the earlier migrations except for the authorization.)
-- ---------------------------------------------------------------------------
create or replace function public.steward_create_import_batch(
  p_label text,
  p_organization_id uuid,
  p_rows jsonb
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_batch_id uuid;
  v_row jsonb;
  v_n integer := 0;
  v_given text;
  v_family text;
  v_year_text text;
  v_year integer;
begin
  if auth.uid() is null then
    raise exception 'steward_create_import_batch: authentication required';
  end if;
  if not public.is_active_reviewer(auth.uid())
     and (p_organization_id is null or not public.can_steward_org(auth.uid(), p_organization_id)) then
    raise exception 'steward_create_import_batch: reviewer authorization required';
  end if;
  if p_label is null or btrim(p_label) = '' then
    raise exception 'steward_create_import_batch: a label is required';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) = 0 then
    raise exception 'steward_create_import_batch: rows must be a non-empty list';
  end if;
  if jsonb_array_length(p_rows) > 5000 then
    raise exception 'steward_create_import_batch: at most 5000 rows per upload';
  end if;
  if p_organization_id is not null
     and not exists (select 1 from public.organizations o where o.id = p_organization_id) then
    raise exception 'steward_create_import_batch: institution not found';
  end if;

  insert into public.import_batches (label, organization_id, created_by_user_id)
  values (btrim(p_label), p_organization_id, auth.uid())
  returning id into v_batch_id;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    v_n := v_n + 1;
    if jsonb_typeof(v_row) <> 'object' then
      raise exception 'steward_create_import_batch: row % is not an object', v_n;
    end if;
    v_given := nullif(btrim(coalesce(v_row ->> 'givenName', '')), '');
    v_family := nullif(btrim(coalesce(v_row ->> 'familyName', '')), '');
    if v_given is null or v_family is null then
      raise exception 'steward_create_import_batch: row % needs a given name and a family name', v_n;
    end if;
    v_year_text := nullif(btrim(coalesce(v_row ->> 'graduationYear', '')), '');
    if v_year_text is not null and v_year_text !~ '^\d{4}$' then
      raise exception 'steward_create_import_batch: row % has an unreadable graduation year', v_n;
    end if;
    v_year := v_year_text::integer;

    insert into public.import_rows (batch_id, row_number, given_name, family_name, degree, programme, graduation_year, external_ref)
    values (
      v_batch_id, v_n, v_given, v_family,
      nullif(btrim(coalesce(v_row ->> 'degree', '')), ''),
      nullif(btrim(coalesce(v_row ->> 'programme', '')), ''),
      v_year,
      nullif(btrim(coalesce(v_row ->> 'externalRef', '')), '')
    );
  end loop;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'create', 'import_batch', v_batch_id, btrim(p_label),
          jsonb_build_object('rows', v_n, 'organizationId', p_organization_id));

  return v_batch_id;
end;
$$;


create or replace function public.steward_list_import_batches()
returns table (
  id uuid,
  label text,
  organization_id uuid,
  organization_name text,
  created_at timestamptz,
  total bigint,
  pending bigint,
  matched bigint,
  created bigint,
  skipped bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'steward_list_import_batches: authentication required';
  end if;
  if not public.is_any_steward(auth.uid()) then
    raise exception 'steward_list_import_batches: reviewer authorization required';
  end if;

  return query
    select b.id, b.label, b.organization_id, o.name, b.created_at,
           count(r.id),
           count(r.id) filter (where r.status = 'pending'),
           count(r.id) filter (where r.status = 'matched'),
           count(r.id) filter (where r.status = 'created'),
           count(r.id) filter (where r.status = 'skipped')
      from public.import_batches b
      left join public.organizations o on o.id = b.organization_id
      left join public.import_rows r on r.batch_id = b.id
     where public.is_active_reviewer(auth.uid())
        or (b.organization_id is not null and public.can_steward_org(auth.uid(), b.organization_id))
     group by b.id, o.name
     order by b.created_at desc, b.id;
end;
$$;


create or replace function public.steward_import_candidates(p_batch_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'steward_import_candidates: authentication required';
  end if;
  if not public.is_any_steward(auth.uid()) then
    raise exception 'steward_import_candidates: reviewer authorization required';
  end if;

  select b.organization_id into v_org from public.import_batches b where b.id = p_batch_id;
  if not found then
    return null;
  end if;
  if not public.is_active_reviewer(auth.uid())
     and (v_org is null or not public.can_steward_org(auth.uid(), v_org)) then
    raise exception 'steward_import_candidates: reviewer authorization required';
  end if;

  select coalesce(jsonb_agg(row_doc order by row_number), '[]'::jsonb)
    into result
    from (
      select r.row_number,
             jsonb_build_object(
               'id', r.id,
               'rowNumber', r.row_number,
               'givenName', r.given_name,
               'familyName', r.family_name,
               'degree', r.degree,
               'programme', r.programme,
               'graduationYear', r.graduation_year,
               'externalRef', r.external_ref,
               'candidates', coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'personId', c.id,
                          'displayName', c.display_name,
                          'reason', c.reason,
                          'documentedAtInstitution', c.at_org,
                          'isDemo', c.is_demo)
                        order by c.reason_order, c.display_name, c.id)
                   from (
                     select p.id, p.display_name, p.is_demo,
                            case when public.import_name_key(p.display_name) = public.import_name_key(r.given_name || ' ' || r.family_name)
                                   or (public.import_name_key(p.given_name) = public.import_name_key(r.given_name)
                                       and public.import_name_key(p.family_name) = public.import_name_key(r.family_name))
                                 then 'same_name' else 'same_family_initial' end as reason,
                            case when public.import_name_key(p.display_name) = public.import_name_key(r.given_name || ' ' || r.family_name)
                                   or (public.import_name_key(p.given_name) = public.import_name_key(r.given_name)
                                       and public.import_name_key(p.family_name) = public.import_name_key(r.family_name))
                                 then 1 else 2 end as reason_order,
                            (v_org is not null and exists (
                               select 1 from public.participations x
                                where x.person_id = p.id and x.organization_id = v_org)) as at_org
                       from public.people p
                      where p.verification_status <> 'merged'
                        and (
                          public.import_name_key(p.display_name) = public.import_name_key(r.given_name || ' ' || r.family_name)
                          or (public.import_name_key(p.given_name) = public.import_name_key(r.given_name)
                              and public.import_name_key(p.family_name) = public.import_name_key(r.family_name))
                          or (public.import_name_key(p.family_name) = public.import_name_key(r.family_name)
                              and left(public.import_name_key(p.given_name), 1) = left(public.import_name_key(r.given_name), 1))
                        )
                      order by 4, p.display_name, p.id
                      limit 10
                   ) c
               ), '[]'::jsonb)
             ) as row_doc
        from public.import_rows r
       where r.batch_id = p_batch_id
         and r.status = 'pending'
    ) rows;

  return jsonb_build_object('batchId', p_batch_id, 'organizationId', v_org, 'rows', result);
end;
$$;


create or replace function public.steward_resolve_import_row(
  p_row_id uuid,
  p_action text,
  p_person_id uuid default null,
  p_note text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.import_rows%rowtype;
  v_org uuid;
  v_label text;
  v_person uuid;
  v_summary text;
begin
  if auth.uid() is null then
    raise exception 'steward_resolve_import_row: authentication required';
  end if;
  if not public.is_any_steward(auth.uid()) then
    raise exception 'steward_resolve_import_row: reviewer authorization required';
  end if;
  if p_action not in ('match', 'create', 'skip') then
    raise exception 'steward_resolve_import_row: action must be match, create or skip';
  end if;

  select * into v_row from public.import_rows where id = p_row_id for update;
  if not found then
    raise exception 'steward_resolve_import_row: row not found';
  end if;
  if v_row.status <> 'pending' then
    raise exception 'steward_resolve_import_row: row already resolved';
  end if;

  select b.organization_id, b.label into v_org, v_label from public.import_batches b where b.id = v_row.batch_id;
  if not public.is_active_reviewer(auth.uid())
     and (v_org is null or not public.can_steward_org(auth.uid(), v_org)) then
    raise exception 'steward_resolve_import_row: reviewer authorization required';
  end if;

  if p_action = 'skip' then
    update public.import_rows
       set status = 'skipped', resolved_at = now(), resolved_by_user_id = auth.uid(), decision_note = p_note
     where id = p_row_id;
    return null;
  end if;

  if p_action = 'match' then
    if p_person_id is null then
      raise exception 'steward_resolve_import_row: match needs a person';
    end if;
    if not exists (select 1 from public.people p where p.id = p_person_id and p.verification_status <> 'merged') then
      raise exception 'steward_resolve_import_row: person not found';
    end if;
    v_person := p_person_id;
  else
    if p_person_id is not null then
      raise exception 'steward_resolve_import_row: create does not take a person';
    end if;
    insert into public.people (given_name, family_name, display_name, verification_status, source_type, created_by_user_id)
    values (v_row.given_name, v_row.family_name, v_row.given_name || ' ' || v_row.family_name,
            'provisional', 'imported_historical', auth.uid())
    returning id into v_person;

    insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
    values (auth.uid(), 'create', 'person', v_person, v_row.given_name || ' ' || v_row.family_name,
            jsonb_build_object('fromImportRow', p_row_id, 'batchId', v_row.batch_id));
  end if;

  if v_org is not null then
    v_summary := concat_ws(' · ',
      case when v_row.graduation_year is not null then 'Graduated ' || v_row.graduation_year end,
      v_row.degree,
      v_row.programme,
      'from the list "' || v_label || '"');
    insert into public.participations (person_id, organization_id, capacity, summary, date_is_unknown,
                                       source_type, verification_status, created_by_user_id)
    values (v_person, v_org, 'student', v_summary, true, 'imported_historical', 'provisional', auth.uid());
  end if;

  update public.import_rows
     set status = case when p_action = 'match' then 'matched' else 'created' end,
         resolved_person_id = v_person,
         resolved_at = now(),
         resolved_by_user_id = auth.uid(),
         decision_note = p_note
   where id = p_row_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'import_row', p_row_id, v_row.given_name || ' ' || v_row.family_name,
          jsonb_build_object('action', p_action, 'personId', v_person));

  return v_person;
end;
$$;


create or replace function public.steward_set_person_public(p_person_id uuid, p_public boolean, p_reason text default null)
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
    raise exception 'steward_set_person_public: authentication required';
  end if;
  if not public.is_active_reviewer(auth.uid())
     and not exists (
       select 1 from public.participations x
        where x.person_id = p_person_id
          and public.can_steward_org(auth.uid(), x.organization_id)) then
    raise exception 'steward_set_person_public: reviewer authorization required';
  end if;
  if p_public is null then
    raise exception 'steward_set_person_public: choose public or not public';
  end if;

  select display_name into v_name
    from public.people where id = p_person_id and verification_status <> 'merged'
    for update;
  if not found then
    raise exception 'steward_set_person_public: person not found';
  end if;

  if p_public and (p_reason is null or btrim(p_reason) = '') then
    raise exception 'steward_set_person_public: a reason is required to publish';
  end if;

  update public.people
     set is_public = p_public,
         published_at = case when p_public then coalesce(published_at, now()) else null end,
         published_by_user_id = case when p_public then auth.uid() else null end
   where id = p_person_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'person', p_person_id, v_name,
          jsonb_build_object('change', case when p_public then 'published' else 'unpublished' end,
                             'by', 'steward', 'reason', nullif(btrim(coalesce(p_reason, '')), '')));

  return p_public;
end;
$$;

