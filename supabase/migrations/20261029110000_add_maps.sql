-- Maps (docs/ROTEIRO.md fase 2, etapa G): where people are today, the map in
-- time ("in 1994, 37 people were here"), and movements between places.
--
-- Institutions get a location (latitude, longitude, country, city) with its
-- source. A location found automatically (ROR) is a PROPOSAL until a steward
-- accepts it. Maps show counts of records, never a ranking of people.

alter table public.organizations
  add column latitude double precision,
  add column longitude double precision,
  add column country_code text,
  add column city text,
  add column location_source text,
  add constraint organizations_coords check (
    (latitude is null and longitude is null)
    or (latitude between -90 and 90 and longitude between -180 and 180)),
  add constraint organizations_country_code check (country_code is null or country_code ~ '^[A-Z]{2}$');

create table public.organization_location_proposals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  latitude double precision not null,
  longitude double precision not null,
  country_code text,
  city text,
  source text not null,
  source_url text,
  matched_name text,
  status text not null default 'proposed',
  proposed_by_user_id uuid references auth.users (id) on delete set null,
  decided_by_user_id uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  constraint olp_coords check (latitude between -90 and 90 and longitude between -180 and 180),
  constraint olp_status check (status in ('proposed', 'accepted', 'rejected')),
  constraint olp_source check (source in ('ror', 'manual'))
);

create unique index olp_one_open on public.organization_location_proposals (organization_id, source, latitude, longitude)
  where status = 'proposed';

alter table public.organization_location_proposals enable row level security;

-- Steward sets a location directly (manual entry), audited.
create function public.steward_set_organization_location(
  p_organization_id uuid, p_latitude double precision, p_longitude double precision,
  p_country_code text default null, p_city text default null, p_source text default 'Entered by a steward')
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
begin
  if auth.uid() is null or not public.can_steward_org(auth.uid(), p_organization_id) then
    raise exception 'steward_set_organization_location: steward required' using errcode = '42501';
  end if;
  update public.organizations
     set latitude = p_latitude, longitude = p_longitude,
         country_code = upper(nullif(btrim(coalesce(p_country_code, '')), '')),
         city = nullif(btrim(coalesce(p_city, '')), ''),
         location_source = left(coalesce(nullif(btrim(p_source), ''), 'Entered by a steward'), 300)
   where id = p_organization_id
  returning name into v_name;
  if not found then
    raise exception 'steward_set_organization_location: not found' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'organization_location', p_organization_id, v_name,
          jsonb_build_object('latitude', p_latitude, 'longitude', p_longitude, 'country', p_country_code));
end;
$$;

revoke all on function public.steward_set_organization_location(uuid, double precision, double precision, text, text, text) from public, anon;
grant execute on function public.steward_set_organization_location(uuid, double precision, double precision, text, text, text) to authenticated;

-- Institutions still without a location (for the "find locations" batch).
create function public.steward_organizations_without_location(p_limit integer default 25)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_any_steward(auth.uid()) then
    raise exception 'steward_organizations_without_location: steward required' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'shortName', o.short_name,
                   'ror', (select e.identifier_value from public.organization_external_identifiers e
                            where e.organization_id = o.id and e.scheme = 'ror' limit 1)) order by o.name), '[]'::jsonb)
            from (select * from public.organizations o
                   where o.latitude is null and public.can_steward_org(auth.uid(), o.id)
                     and not exists (select 1 from public.organization_location_proposals p
                                      where p.organization_id = o.id and p.status = 'proposed')
                   order by o.name limit least(greatest(coalesce(p_limit, 25), 1), 50)) o);
end;
$$;

revoke all on function public.steward_organizations_without_location(integer) from public, anon;
grant execute on function public.steward_organizations_without_location(integer) to authenticated;

-- Record a found location as a proposal.
create function public.steward_propose_organization_location(p_organization_id uuid, p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.can_steward_org(auth.uid(), p_organization_id) then
    raise exception 'steward_propose_organization_location: steward required' using errcode = '42501';
  end if;
  insert into public.organization_location_proposals
    (organization_id, latitude, longitude, country_code, city, source, source_url, matched_name, proposed_by_user_id)
  values (p_organization_id, (p ->> 'latitude')::double precision, (p ->> 'longitude')::double precision,
          upper(nullif(btrim(coalesce(p ->> 'countryCode', '')), '')), nullif(btrim(coalesce(p ->> 'city', '')), ''),
          coalesce(p ->> 'source', 'ror'), nullif(p ->> 'sourceUrl', ''), left(nullif(p ->> 'matchedName', ''), 300), auth.uid())
  on conflict do nothing
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.steward_propose_organization_location(uuid, jsonb) from public, anon;
grant execute on function public.steward_propose_organization_location(uuid, jsonb) to authenticated;

create function public.steward_list_location_proposals()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_any_steward(auth.uid()) then
    raise exception 'steward_list_location_proposals: steward required' using errcode = '42501';
  end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
             'id', p.id, 'organizationId', p.organization_id, 'organizationName', o.name,
             'latitude', p.latitude, 'longitude', p.longitude, 'countryCode', p.country_code, 'city', p.city,
             'source', p.source, 'sourceUrl', p.source_url, 'matchedName', p.matched_name) order by o.name, p.created_at), '[]'::jsonb)
            from public.organization_location_proposals p
            join public.organizations o on o.id = p.organization_id
           where p.status = 'proposed' and public.can_steward_org(auth.uid(), p.organization_id));
end;
$$;

revoke all on function public.steward_list_location_proposals() from public, anon;
grant execute on function public.steward_list_location_proposals() to authenticated;

create function public.steward_decide_location_proposal(p_id uuid, p_accept boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_p public.organization_location_proposals%rowtype;
begin
  select * into v_p from public.organization_location_proposals where id = p_id for update;
  if not found or auth.uid() is null or not public.can_steward_org(auth.uid(), v_p.organization_id) then
    raise exception 'steward_decide_location_proposal: steward required' using errcode = '42501';
  end if;
  if v_p.status <> 'proposed' then
    raise exception 'steward_decide_location_proposal: already decided' using errcode = '22023';
  end if;
  update public.organization_location_proposals
     set status = case when p_accept then 'accepted' else 'rejected' end, decided_by_user_id = auth.uid(), decided_at = now()
   where id = p_id;
  if p_accept then
    update public.organizations
       set latitude = v_p.latitude, longitude = v_p.longitude, country_code = coalesce(v_p.country_code, country_code),
           city = coalesce(v_p.city, city),
           location_source = left(coalesce(v_p.source_url, upper(v_p.source)), 300)
     where id = v_p.organization_id;
    -- other open proposals for the same institution are superseded
    update public.organization_location_proposals
       set status = 'rejected', decided_by_user_id = auth.uid(), decided_at = now()
     where organization_id = v_p.organization_id and status = 'proposed' and id <> p_id;
  end if;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), case when p_accept then 'approve' else 'reject' end, 'organization_location', v_p.organization_id,
          coalesce(v_p.matched_name, 'location'), jsonb_build_object('proposal', p_id, 'source', v_p.source));
end;
$$;

revoke all on function public.steward_decide_location_proposal(uuid, boolean) from public, anon;
grant execute on function public.steward_decide_location_proposal(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- map_places(year?): every institution with a location and how many people
-- the record places there -- in that year, or now (ongoing) when no year.
-- Plus history items with coordinates. Members only. Counts, not rankings.
-- ---------------------------------------------------------------------------
create function public.map_places(p_year integer default null)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with present as (
    select pa.organization_id, count(distinct pa.person_id) as people
      from public.participations pa
      join public.people pe on pe.id = pa.person_id and pe.verification_status <> 'merged'
     where auth.uid() is not null
       and pa.start_date is not null
       and case
             when p_year is null then pa.is_ongoing
             else extract(year from pa.start_date) <= p_year
                  and (pa.is_ongoing
                       or (pa.end_date is not null and extract(year from pa.end_date) >= p_year)
                       or (pa.end_date is null and extract(year from pa.start_date) = p_year))
           end
     group by pa.organization_id
  ),
  ever as (
    select organization_id, count(distinct person_id) as people from public.participations group by organization_id
  )
  select jsonb_build_object(
    'year', p_year,
    'places', coalesce((select jsonb_agg(jsonb_build_object(
        'id', o.id, 'name', o.name, 'shortName', o.short_name, 'latitude', o.latitude, 'longitude', o.longitude,
        'countryCode', o.country_code, 'city', o.city, 'status', o.status,
        'people', coalesce(pr.people, 0), 'everPeople', coalesce(ev.people, 0)) order by o.name)
       from public.organizations o
       left join present pr on pr.organization_id = o.id
       left join ever ev on ev.organization_id = o.id
      where auth.uid() is not null and o.latitude is not null), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'title', i.title, 'kind', i.kind,
        'latitude', i.latitude, 'longitude', i.longitude, 'startYear', i.start_year) order by i.title)
       from public.heritage_items i
      where i.latitude is not null and i.review_status = 'accepted' and public.can_see_heritage_item(auth.uid(), i)
        and (p_year is null or i.start_year is null or (i.start_year <= p_year and coalesce(i.end_year, i.start_year) >= p_year)
             or (i.is_ongoing and i.start_year <= p_year))), '[]'::jsonb),
    'withoutLocation', (select count(*) from public.organizations o where o.latitude is null and auth.uid() is not null),
    'years', (select jsonb_build_object('min', min(extract(year from start_date))::int, 'max', max(extract(year from coalesce(end_date, start_date)))::int)
                from public.participations where start_date is not null)
  );
$$;

revoke all on function public.map_places(integer) from public, anon;
grant execute on function public.map_places(integer) to authenticated;

-- Where people went today: latest confirmed destination by country, plus
-- people whose current (ongoing) participation is at a located institution.
create function public.map_today()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'byCountry', coalesce((select jsonb_agg(jsonb_build_object('countryCode', c, 'people', n) order by c)
       from (select upper(d.country_code) as c, count(distinct d.person_id) as n
               from (select distinct on (person_id) * from public.person_destinations
                      order by person_id, as_of_year desc nulls last, confirmed_at desc) d
              where d.country_code is not null and auth.uid() is not null
              group by 1) s), '[]'::jsonb)
  );
$$;

revoke all on function public.map_today() from public, anon;
grant execute on function public.map_today() to authenticated;

-- Movements: consecutive periods of the same person at two located
-- institutions (A then B), counted per pair. A career seen as a path.
create function public.map_movements(p_from_year integer default null, p_to_year integer default null)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with seq as (
    select pa.person_id, pa.organization_id, extract(year from pa.start_date)::int as y,
           lead(pa.organization_id) over (partition by pa.person_id order by pa.start_date, pa.id) as next_org,
           lead(extract(year from pa.start_date)::int) over (partition by pa.person_id order by pa.start_date, pa.id) as next_y
      from public.participations pa
      join public.organizations o on o.id = pa.organization_id and o.latitude is not null
     where pa.start_date is not null and auth.uid() is not null
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'fromId', a.id, 'fromName', a.name, 'fromLatitude', a.latitude, 'fromLongitude', a.longitude,
           'toId', b.id, 'toName', b.name, 'toLatitude', b.latitude, 'toLongitude', b.longitude,
           'people', s.n, 'firstYear', s.y0, 'lastYear', s.y1) order by a.name, b.name), '[]'::jsonb)
    from (select organization_id, next_org, count(distinct person_id) as n, min(next_y) as y0, max(next_y) as y1
            from seq
           where next_org is not null and next_org <> organization_id
             and (p_from_year is null or next_y >= p_from_year)
             and (p_to_year is null or next_y <= p_to_year)
           group by organization_id, next_org) s
    join public.organizations a on a.id = s.organization_id
    join public.organizations b on b.id = s.next_org;
$$;

revoke all on function public.map_movements(integer, integer) from public, anon;
grant execute on function public.map_movements(integer, integer) to authenticated;

create function public.get_organization_location(p_organization_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object('latitude', o.latitude, 'longitude', o.longitude, 'countryCode', o.country_code,
                            'city', o.city, 'source', o.location_source,
                            'canEdit', public.can_steward_org(auth.uid(), o.id))
    from public.organizations o where o.id = p_organization_id and auth.uid() is not null;
$$;

revoke all on function public.get_organization_location(uuid) from public, anon;
grant execute on function public.get_organization_location(uuid) to authenticated;
