-- A person's history brought in from public sources (OpenAlex, with ROR for
-- institutions): the institutions they were affiliated with over the years
-- (including closed or renamed ones), and their theses, articles and datasets.
--
-- Everything enters as PROVISIONAL, source 'imported_historical', with the
-- public link it came from (external_record_sources) -- "o sabido e o suposto
-- nunca se misturam": a person confirms later. Only a platform reviewer or a
-- steward of one of the person's institutions may run it, and only for a
-- person whose OpenAlex identity a steward already accepted
-- (person_external_ids). Each run leaves one audit_logs row.
--
-- Running it twice adds nothing new: every imported row is keyed by its
-- public identifier.

create table public.external_record_sources (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null,
  subject_id uuid not null,
  source text not null,
  external_id text not null,
  url text,
  retrieved_at timestamptz not null default now(),
  retrieved_by_user_id uuid references auth.users (id) on delete set null,

  constraint external_record_sources_subject_type_valid check (subject_type in ('organization', 'participation', 'contribution')),
  constraint external_record_sources_source_valid check (source in ('openalex', 'ror')),
  constraint external_record_sources_url_format check (url is null or url ~* '^https?://'),
  constraint external_record_sources_unique unique (subject_type, source, external_id)
);

comment on table public.external_record_sources is
  'Where an imported record came from: the public identifier and link (OpenAlex, ROR). One row per imported record.';

create index external_record_sources_subject_idx on public.external_record_sources (subject_type, subject_id);

alter table public.external_record_sources enable row level security;

-- Signed-in readers may see where a record came from (the link is public).
create policy external_record_sources_select_authenticated on public.external_record_sources
  for select to authenticated using (true);

grant select on public.external_record_sources to authenticated;
revoke all on public.external_record_sources from anon;

-- -----------------------------------------------------------------------
-- steward_openalex_author_for_person(): the accepted OpenAlex author id.
-- -----------------------------------------------------------------------
create function public.steward_openalex_author_for_person(p_person_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.can_steward_person(auth.uid(), p_person_id) then
    raise exception 'reviewer or steward authorization required' using errcode = '42501';
  end if;
  return (
    select e.external_id
      from public.person_external_ids e
     where e.person_id = p_person_id and e.source = 'openalex'
     order by e.confirmed_at desc
     limit 1
  );
end;
$$;

revoke all on function public.steward_openalex_author_for_person(uuid) from public, anon;
grant execute on function public.steward_openalex_author_for_person(uuid) to authenticated;

-- -----------------------------------------------------------------------
-- steward_record_openalex_history(person, payload)
--
-- payload = {
--   "authorId": "https://openalex.org/A...",
--   "affiliations": [{ "openalexId", "name", "ror", "type", "country",
--                      "years": [int], "rorStatus", "established",
--                      "names": [{ "name", "kind", "language" }] }],
--   "works": [{ "openalexId", "title", "year", "type", "venue", "doi" }]
-- }
-- Returns counts: institutionsCreated, institutionsLinked, affiliations,
-- works, skipped.
-- -----------------------------------------------------------------------
create function public.steward_record_openalex_history(p_person_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := auth.uid();
  v_author text := p_payload ->> 'authorId';
  v_aff jsonb;
  v_work jsonb;
  v_name jsonb;
  v_org uuid;
  v_inst text;
  v_inst_name text;
  v_ror text;
  v_years int[];
  v_first int;
  v_last int;
  v_key text;
  v_part uuid;
  v_contrib uuid;
  v_title text;
  v_year int;
  v_kind text;
  v_url text;
  v_type text;
  v_status text;
  v_established int;
  v_name_type text;
  v_created int := 0;
  v_linked int := 0;
  v_affs int := 0;
  v_works int := 0;
  v_skipped int := 0;
  v_person_name text;
begin
  if not public.can_steward_person(v_user, p_person_id) then
    raise exception 'reviewer or steward authorization required' using errcode = '42501';
  end if;

  select display_name into v_person_name from public.people where id = p_person_id;
  if v_person_name is null then
    raise exception 'person not found' using errcode = 'P0002';
  end if;

  if v_author is null or not exists (
    select 1 from public.person_external_ids e
     where e.person_id = p_person_id and e.source = 'openalex' and e.external_id = v_author
  ) then
    raise exception 'this OpenAlex author was not accepted for this person' using errcode = '22023';
  end if;

  if jsonb_typeof(coalesce(p_payload -> 'affiliations', '[]'::jsonb)) <> 'array'
     or jsonb_typeof(coalesce(p_payload -> 'works', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_payload -> 'affiliations', '[]'::jsonb)) > 200
     or jsonb_array_length(coalesce(p_payload -> 'works', '[]'::jsonb)) > 500 then
    raise exception 'payload too large or malformed' using errcode = '22023';
  end if;

  -- Institutions and affiliation periods.
  for v_aff in select * from jsonb_array_elements(coalesce(p_payload -> 'affiliations', '[]'::jsonb)) loop
    v_inst := nullif(btrim(v_aff ->> 'openalexId'), '');
    v_inst_name := nullif(btrim(v_aff ->> 'name'), '');
    v_ror := nullif(btrim(v_aff ->> 'ror'), '');
    select array_agg(y::int order by y::int) into v_years
      from jsonb_array_elements_text(coalesce(v_aff -> 'years', '[]'::jsonb)) y
     where y ~ '^\d{4}$' and y::int between 1800 and 2100;

    if v_inst is null or v_inst_name is null or char_length(v_inst_name) > 300 or v_years is null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_org := null;
    select subject_id into v_org from public.external_record_sources
     where subject_type = 'organization' and source = 'openalex' and external_id = v_inst;
    if v_org is null and v_ror is not null then
      select organization_id into v_org from public.organization_external_identifiers
       where scheme = 'ror' and identifier_value = v_ror limit 1;
    end if;
    if v_org is null then
      select id into v_org from public.organizations
       where not is_demo and lower(btrim(name)) = lower(v_inst_name)
       order by created_at limit 1;
    end if;

    if v_org is null then
      v_type := case v_aff ->> 'type'
        when 'education' then 'university'
        when 'government' then 'government_agency'
        when 'facility' then 'research_institute'
        when 'archive' then 'archive'
        when 'funder' then 'funding_organization'
        when 'nonprofit' then 'other'
        else 'other' end;
      v_status := case v_aff ->> 'rorStatus'
        when 'active' then 'active'
        when 'inactive' then 'closed'
        when 'withdrawn' then 'status_unknown'
        else 'active' end;
      v_established := case when (v_aff ->> 'established') ~ '^\d{4}$' then (v_aff ->> 'established')::int end;

      insert into public.organizations
        (name, organization_type, status, location, founding_date, founding_precision,
         source_type, verification_status)
      values
        (v_inst_name, v_type, v_status, nullif(btrim(v_aff ->> 'country'), ''),
         case when v_established between 1000 and 2100 then make_date(v_established, 1, 1) end,
         case when v_established between 1000 and 2100 then 'year' end,
         'imported_historical', 'provisional')
      returning id into v_org;
      v_created := v_created + 1;

      if v_ror is not null then
        insert into public.organization_external_identifiers
          (organization_id, scheme, identifier_value, url, source_type, verification_status)
        values (v_org, 'ror', v_ror, 'https://ror.org/' || v_ror, 'imported_historical', 'provisional')
        on conflict (scheme, identifier_value) do nothing;
      end if;

      -- Other names the institution is or was known by (ROR).
      for v_name in select * from jsonb_array_elements(coalesce(v_aff -> 'names', '[]'::jsonb)) loop
        v_name_type := case v_name ->> 'kind'
          when 'acronym' then 'acronym'
          when 'label' then 'translation'
          when 'alias' then 'alternative'
          when 'former' then 'former'
          else null end;
        if v_name_type is not null
           and nullif(btrim(v_name ->> 'name'), '') is not null
           and char_length(v_name ->> 'name') <= 300
           and lower(btrim(v_name ->> 'name')) <> lower(v_inst_name)
           and not exists (select 1 from public.organization_names n
                            where n.organization_id = v_org and lower(n.name) = lower(btrim(v_name ->> 'name'))) then
          insert into public.organization_names (organization_id, name, name_type, language, source_type, verification_status)
          values (v_org, btrim(v_name ->> 'name'), v_name_type, nullif(btrim(v_name ->> 'language'), ''),
                  'imported_historical', 'provisional');
        end if;
      end loop;
    else
      v_linked := v_linked + 1;
    end if;

    insert into public.external_record_sources (subject_type, subject_id, source, external_id, url, retrieved_by_user_id)
    values ('organization', v_org, 'openalex', v_inst, v_inst, v_user)
    on conflict (subject_type, source, external_id) do nothing;

    v_key := v_author || '|' || v_inst;
    if not exists (select 1 from public.external_record_sources
                    where subject_type = 'participation' and source = 'openalex' and external_id = v_key) then
      v_first := v_years[1];
      v_last := v_years[array_length(v_years, 1)];
      insert into public.participations
        (person_id, organization_id, capacity, summary, start_date, start_precision, end_date, end_precision,
         source_type, verification_status)
      values
        (p_person_id, v_org, 'researcher',
         'Affiliation shown on publications indexed by OpenAlex ('
           || case when v_first = v_last then v_first::text else v_first || '–' || v_last end || ').',
         make_date(v_first, 1, 1), 'year',
         case when v_last > v_first then make_date(v_last, 1, 1) end,
         case when v_last > v_first then 'year' end,
         'imported_historical', 'provisional')
      returning id into v_part;
      insert into public.external_record_sources (subject_type, subject_id, source, external_id, url, retrieved_by_user_id)
      values ('participation', v_part, 'openalex', v_key, v_author, v_user);
      v_affs := v_affs + 1;
    end if;
  end loop;

  -- Theses, articles, datasets.
  for v_work in select * from jsonb_array_elements(coalesce(p_payload -> 'works', '[]'::jsonb)) loop
    v_key := nullif(btrim(v_work ->> 'openalexId'), '');
    v_title := nullif(btrim(v_work ->> 'title'), '');
    if v_key is null or v_title is null or char_length(v_title) > 1000 or v_key !~* '^https://openalex\.org/W\d+$' then
      v_skipped := v_skipped + 1;
      continue;
    end if;
    v_year := case when (v_work ->> 'year') ~ '^\d{4}$' and (v_work ->> 'year')::int between 1800 and 2100
                   then (v_work ->> 'year')::int end;
    v_kind := case when v_work ->> 'type' = 'dataset' then 'referenced_dataset' else 'publication_or_report' end;
    v_url := case when (v_work ->> 'doi') ~* '^https://doi\.org/' then v_work ->> 'doi' else v_key end;

    select subject_id into v_contrib from public.external_record_sources
     where subject_type = 'contribution' and source = 'openalex' and external_id = v_key;

    if v_contrib is null then
      insert into public.contributions
        (title, contribution_kind, description, start_date, start_precision, date_is_unknown,
         source_type, verification_status)
      values
        (v_title, v_kind,
         nullif(concat_ws(' · ',
           case v_work ->> 'type' when 'dissertation' then 'Thesis' when 'article' then 'Article'
             when 'book' then 'Book' when 'book-chapter' then 'Book chapter' when 'dataset' then 'Dataset'
             when 'preprint' then 'Preprint' when 'review' then 'Review' else null end,
           nullif(btrim(left(v_work ->> 'venue', 300)), '')), ''),
         case when v_year is not null then make_date(v_year, 1, 1) end,
         case when v_year is not null then 'year' end,
         v_year is null,
         'imported_historical', 'provisional')
      returning id into v_contrib;
      insert into public.external_record_sources (subject_type, subject_id, source, external_id, url, retrieved_by_user_id)
      values ('contribution', v_contrib, 'openalex', v_key, v_url, v_user);
    end if;

    if not exists (select 1 from public.person_contributions
                    where contribution_id = v_contrib and person_id = p_person_id and capacity = 'documentation') then
      insert into public.person_contributions
        (contribution_id, person_id, capacity, attribution_note, source_type, verification_status)
      values (v_contrib, p_person_id, 'documentation', 'Listed as an author (OpenAlex).', 'imported_historical', 'provisional');
      v_works := v_works + 1;
    end if;
  end loop;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (v_user, 'create', 'person', p_person_id, v_person_name,
          jsonb_build_object('import', 'openalex_history', 'authorId', v_author, 'institutionsCreated', v_created, 'institutionsLinked', v_linked,
                             'affiliations', v_affs, 'works', v_works, 'skipped', v_skipped));

  return jsonb_build_object('institutionsCreated', v_created, 'institutionsLinked', v_linked,
                            'affiliations', v_affs, 'works', v_works, 'skipped', v_skipped);
end;
$$;

revoke all on function public.steward_record_openalex_history(uuid, jsonb) from public, anon;
grant execute on function public.steward_record_openalex_history(uuid, jsonb) to authenticated;
