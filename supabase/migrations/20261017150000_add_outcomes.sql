-- The outcomes panel -- what an institution buys (docs/ROTEIRO.md etapa 5;
-- docs/PRODUTO.md screen 09 "reports, from the record").
--
-- For one institution: its graduates on record (import rows a steward
-- resolved to a person), and for each one whether the record already knows
-- where they went:
--   found         -- a steward confirmed a destination (person_destinations),
--   probable      -- proposals from an open source wait for a steward,
--   needs_person  -- nothing yet: a human has to look.
-- Plus the time this saved, cuts by graduation year / programme / degree,
-- destination sector and country, and a row-level export with provenance.
--
-- Descriptive only. Counts of records; institutions and countries are listed
-- alphabetically, never as a league table. Every exported line carries where
-- its destination came from and who confirmed it.
--
-- Time saved uses one published benchmark, stated in the output so nobody
-- mistakes it for a measurement: UCSF's retroactive alumni study reported
-- about 10 minutes of manual searching per person.

alter table public.import_row_external_matches add column last_known_type text;
alter table public.person_destinations add column institution_type text;

comment on column public.person_destinations.institution_type is
  'Sector of the destination as the source classifies it (OpenAlex: education, '
  'company, government, nonprofit, facility, healthcare, archive, other).';

-- Recording proposals now keeps the destination sector too.
create or replace function public.steward_record_external_matches(p_row_id uuid, p_source text, p_matches jsonb)
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_m jsonb;
  v_n integer := 0;
begin
  if auth.uid() is null then
    raise exception 'steward_record_external_matches: authentication required';
  end if;
  if not public.can_steward_import_row(auth.uid(), p_row_id) then
    raise exception 'steward_record_external_matches: reviewer authorization required';
  end if;
  if p_source not in ('openalex') then
    raise exception 'steward_record_external_matches: unknown source';
  end if;
  if p_matches is null or jsonb_typeof(p_matches) <> 'array' then
    raise exception 'steward_record_external_matches: matches must be a list';
  end if;
  if jsonb_array_length(p_matches) > 10 then
    raise exception 'steward_record_external_matches: at most 10 proposals per row';
  end if;

  delete from public.import_row_external_matches
   where row_id = p_row_id and source = p_source and status = 'proposed';

  for v_m in select value from jsonb_array_elements(p_matches)
  loop
    if nullif(btrim(coalesce(v_m ->> 'externalId', '')), '') is null
       or nullif(btrim(coalesce(v_m ->> 'displayName', '')), '') is null then
      continue;
    end if;
    insert into public.import_row_external_matches
      (row_id, source, external_id, display_name, orcid, last_known_institution, last_known_country,
       last_known_type, affiliations, works_count, reasons)
    values (
      p_row_id, p_source, btrim(v_m ->> 'externalId'), btrim(v_m ->> 'displayName'),
      nullif(btrim(coalesce(v_m ->> 'orcid', '')), ''),
      nullif(btrim(coalesce(v_m ->> 'lastKnownInstitution', '')), ''),
      nullif(btrim(coalesce(v_m ->> 'lastKnownCountry', '')), ''),
      nullif(btrim(coalesce(v_m ->> 'lastKnownType', '')), ''),
      case when jsonb_typeof(v_m -> 'affiliations') = 'array' then v_m -> 'affiliations' else '[]'::jsonb end,
      case when (v_m ->> 'worksCount') ~ '^\d+$' then (v_m ->> 'worksCount')::integer end,
      case when jsonb_typeof(v_m -> 'reasons') = 'array' then v_m -> 'reasons' else '[]'::jsonb end
    )
    on conflict (row_id, source, external_id) do nothing;
    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

-- Accepting a proposal now also keeps the destination sector.
create or replace function public.steward_decide_external_match(p_match_id uuid, p_accept boolean)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_m public.import_row_external_matches%rowtype;
  v_person uuid;
  v_year integer;
begin
  if auth.uid() is null then
    raise exception 'steward_decide_external_match: authentication required';
  end if;
  select * into v_m from public.import_row_external_matches where id = p_match_id for update;
  if not found then
    raise exception 'steward_decide_external_match: proposal not found';
  end if;
  if not public.can_steward_import_row(auth.uid(), v_m.row_id) then
    raise exception 'steward_decide_external_match: reviewer authorization required';
  end if;
  if v_m.status <> 'proposed' then
    raise exception 'steward_decide_external_match: already decided';
  end if;
  if p_accept is null then
    raise exception 'steward_decide_external_match: choose accept or reject';
  end if;

  if not p_accept then
    update public.import_row_external_matches
       set status = 'rejected', decided_at = now(), decided_by_user_id = auth.uid()
     where id = p_match_id;
    return 'rejected';
  end if;

  select resolved_person_id into v_person from public.import_rows where id = v_m.row_id;
  if v_person is null then
    raise exception 'steward_decide_external_match: decide who this row is first';
  end if;

  update public.import_row_external_matches
     set status = 'accepted', decided_at = now(), decided_by_user_id = auth.uid()
   where id = p_match_id;
  update public.import_row_external_matches
     set status = 'rejected', decided_at = now(), decided_by_user_id = auth.uid()
   where row_id = v_m.row_id and source = v_m.source and status = 'proposed';

  insert into public.person_external_ids (person_id, source, external_id, confirmed_by_user_id)
  values (v_person, 'openalex', v_m.external_id, auth.uid())
  on conflict (person_id, source, external_id) do nothing;
  if v_m.orcid is not null then
    insert into public.person_external_ids (person_id, source, external_id, confirmed_by_user_id)
    values (v_person, 'orcid', v_m.orcid, auth.uid())
    on conflict (person_id, source, external_id) do nothing;
  end if;

  if v_m.last_known_institution is not null then
    select max((y)::integer) into v_year
      from jsonb_array_elements(v_m.affiliations) a,
           jsonb_array_elements_text(coalesce(a -> 'years', '[]'::jsonb)) y
     where a ->> 'institution' = v_m.last_known_institution and y ~ '^\d{4}$';
    insert into public.person_destinations
      (person_id, institution_name, institution_type, country_code, as_of_year, source, evidence, confirmed_by_user_id)
    values (v_person, v_m.last_known_institution, v_m.last_known_type, v_m.last_known_country, v_year, 'openalex',
            jsonb_build_object('externalId', v_m.external_id, 'orcid', v_m.orcid, 'reasons', v_m.reasons, 'fetchedAt', v_m.fetched_at),
            auth.uid());
  end if;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'approve', 'external_match', p_match_id, v_m.display_name,
          jsonb_build_object('personId', v_person, 'source', v_m.source, 'externalId', v_m.external_id, 'orcid', v_m.orcid));

  return 'accepted';
end;
$$;


-- ---------------------------------------------------------------------------
-- Internal: one line per graduate of an institution, with their status.
-- A person on several lists of the same institution counts once (earliest
-- graduation year, first programme/degree seen).
-- ---------------------------------------------------------------------------
create function public.outcome_graduates(p_organization_id uuid)
returns table (
  person_id uuid,
  display_name text,
  graduation_year integer,
  programme text,
  degree text,
  status text,
  destination_institution text,
  destination_type text,
  destination_country text,
  destination_year integer,
  destination_source text,
  confirmed_at timestamptz,
  orcid text,
  is_demo boolean
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with grads as (
    select r.resolved_person_id as person_id,
           min(r.graduation_year) as graduation_year,
           (array_agg(r.programme order by r.graduation_year nulls last, r.row_number) filter (where r.programme is not null))[1] as programme,
           (array_agg(r.degree order by r.graduation_year nulls last, r.row_number) filter (where r.degree is not null))[1] as degree,
           array_agg(r.id) as row_ids
      from public.import_rows r
      join public.import_batches b on b.id = r.batch_id
     where b.organization_id = p_organization_id
       and r.status in ('matched', 'created')
       and r.resolved_person_id is not null
     group by r.resolved_person_id
  ),
  latest as (
    select distinct on (d.person_id) d.*
      from public.person_destinations d
      join grads g on g.person_id = d.person_id
     order by d.person_id, d.as_of_year desc nulls last, d.confirmed_at desc
  )
  select g.person_id,
         p.display_name,
         g.graduation_year,
         g.programme,
         g.degree,
         case
           when l.person_id is not null then 'found'
           when exists (select 1 from public.import_row_external_matches m
                         where m.row_id = any (g.row_ids) and m.status = 'proposed') then 'probable'
           else 'needs_person'
         end,
         l.institution_name,
         l.institution_type,
         l.country_code,
         l.as_of_year,
         l.source,
         l.confirmed_at,
         (select e.external_id from public.person_external_ids e
           where e.person_id = g.person_id and e.source = 'orcid' order by e.confirmed_at limit 1),
         p.is_demo
    from grads g
    join public.people p on p.id = g.person_id
    left join latest l on l.person_id = g.person_id
   where p.verification_status <> 'merged';
$$;

revoke all on function public.outcome_graduates(uuid) from public;
revoke all on function public.outcome_graduates(uuid) from anon, authenticated;


-- ---------------------------------------------------------------------------
-- steward_outcomes(org, programme?, from_year?, to_year?)
-- ---------------------------------------------------------------------------
create function public.steward_outcomes(
  p_organization_id uuid,
  p_programme text default null,
  p_from_year integer default null,
  p_to_year integer default null
)
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
    raise exception 'steward_outcomes: authentication required';
  end if;
  if p_organization_id is null or not public.can_steward_org(auth.uid(), p_organization_id) then
    raise exception 'steward_outcomes: reviewer authorization required';
  end if;

  with all_g as (select * from public.outcome_graduates(p_organization_id)),
  g as (
    select * from all_g
     where (p_programme is null or programme = p_programme)
       and (p_from_year is null or graduation_year >= p_from_year)
       and (p_to_year is null or graduation_year <= p_to_year)
  )
  select jsonb_build_object(
    'organizationId', p_organization_id,
    'filters', jsonb_build_object('programme', p_programme, 'fromYear', p_from_year, 'toYear', p_to_year),
    'totals', jsonb_build_object(
      'graduates',   (select count(*) from g),
      'found',       (select count(*) from g where status = 'found'),
      'probable',    (select count(*) from g where status = 'probable'),
      'needsPerson', (select count(*) from g where status = 'needs_person'),
      'demo',        (select count(*) from g where is_demo)
    ),
    'timeSaved', jsonb_build_object(
      'minutesPerPerson', 10,
      'minutes', (select count(*) * 10 from g where status = 'found'),
      'minutesRemaining', (select count(*) * 10 from g where status <> 'found'),
      'basis', 'Benchmark: about 10 minutes of manual searching per person (UCSF retroactive alumni study). An estimate, not a measurement.'
    ),
    'byYear', coalesce((select jsonb_agg(jsonb_build_object('year', y, 'graduates', n, 'found', f) order by y nulls last)
       from (select graduation_year as y, count(*) as n, count(*) filter (where status = 'found') as f
               from g group by graduation_year) s), '[]'::jsonb),
    'byProgramme', coalesce((select jsonb_agg(jsonb_build_object('programme', k, 'graduates', n, 'found', f) order by k nulls last)
       from (select programme as k, count(*) as n, count(*) filter (where status = 'found') as f
               from g group by programme) s), '[]'::jsonb),
    'byDegree', coalesce((select jsonb_agg(jsonb_build_object('degree', k, 'graduates', n, 'found', f) order by k nulls last)
       from (select degree as k, count(*) as n, count(*) filter (where status = 'found') as f
               from g group by degree) s), '[]'::jsonb),
    'bySector', coalesce((select jsonb_agg(jsonb_build_object('sector', k, 'people', n) order by k nulls last)
       from (select coalesce(destination_type, 'unknown') as k, count(*) as n
               from g where status = 'found' group by 1) s), '[]'::jsonb),
    'byCountry', coalesce((select jsonb_agg(jsonb_build_object('country', k, 'people', n) order by k nulls last)
       from (select destination_country as k, count(*) as n
               from g where status = 'found' group by 1) s), '[]'::jsonb),
    'destinations', coalesce((select jsonb_agg(jsonb_build_object('institution', k, 'people', n) order by k)
       from (select destination_institution as k, count(*) as n
               from g where status = 'found' group by 1) s), '[]'::jsonb),
    'programmes', coalesce((select jsonb_agg(distinct programme order by programme)
       from all_g where programme is not null), '[]'::jsonb)
  )
  into result;

  return result;
end;
$$;

comment on function public.steward_outcomes(uuid, text, integer, integer) is
  'The outcomes panel for one institution: graduates on record, found / probable / '
  'needs a person, time saved (stated benchmark), and descriptive cuts. '
  'Alphabetical and chronological, never ranked. Institution stewards and '
  'platform reviewers only.';

revoke all on function public.steward_outcomes(uuid, text, integer, integer) from public;
revoke all on function public.steward_outcomes(uuid, text, integer, integer) from anon;
grant execute on function public.steward_outcomes(uuid, text, integer, integer) to authenticated;


-- ---------------------------------------------------------------------------
-- steward_outcomes_export(org, programme?, from_year?, to_year?)
-- One line per graduate, with provenance, for the institution's own reports.
-- ---------------------------------------------------------------------------
create function public.steward_outcomes_export(
  p_organization_id uuid,
  p_programme text default null,
  p_from_year integer default null,
  p_to_year integer default null
)
returns table (
  person_id uuid,
  display_name text,
  graduation_year integer,
  programme text,
  degree text,
  status text,
  destination_institution text,
  destination_type text,
  destination_country text,
  destination_year integer,
  destination_source text,
  confirmed_at timestamptz,
  orcid text,
  is_demo boolean
)
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'steward_outcomes_export: authentication required';
  end if;
  if p_organization_id is null or not public.can_steward_org(auth.uid(), p_organization_id) then
    raise exception 'steward_outcomes_export: reviewer authorization required';
  end if;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'create', 'outcomes_export', p_organization_id, 'Outcomes export',
          jsonb_build_object('programme', p_programme, 'fromYear', p_from_year, 'toYear', p_to_year));

  return query
    select g.* from public.outcome_graduates(p_organization_id) g
     where (p_programme is null or g.programme = p_programme)
       and (p_from_year is null or g.graduation_year >= p_from_year)
       and (p_to_year is null or g.graduation_year <= p_to_year)
     order by g.graduation_year nulls last, g.display_name, g.person_id;
end;
$$;

comment on function public.steward_outcomes_export(uuid, text, integer, integer) is
  'Row-level export of an institution''s graduates and where they went, with '
  'source and confirmation date per line. Each export is audited.';

revoke all on function public.steward_outcomes_export(uuid, text, integer, integer) from public;
revoke all on function public.steward_outcomes_export(uuid, text, integer, integer) from anon;
grant execute on function public.steward_outcomes_export(uuid, text, integer, integer) to authenticated;
