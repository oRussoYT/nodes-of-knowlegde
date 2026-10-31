-- Real people for the Nodes, from the open scholarly record (OpenAlex), asked
-- for by the founder on 31 Oct 2026. Helpers used only by data migrations:
-- not callable by anyone through the API (no grants). Everything they write
-- is PROVISIONAL and keeps its source; a person who later claims their record
-- confirms or corrects it.

create function public.import_openalex_history_internal(p_person_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user uuid := null;
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

revoke all on function public.import_openalex_history_internal(uuid, jsonb) from public, anon, authenticated;

-- One person: found by their OpenAlex or ORCID iD, or created; then their
-- period at the Node's institution (as the publications document it) and
-- their history (affiliations over time, works).
create function public.import_openalex_person(p_node_org uuid, p_node_note text, p jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_author text := p ->> 'authorId';
  v_orcid text := case when nullif(p ->> 'orcid', '') is not null then 'https://orcid.org/' || (p ->> 'orcid') end;
  v_name text := btrim(regexp_replace(coalesce(p ->> 'displayName', ''), '\s+', ' ', 'g'));
  v_given text;
  v_family text;
  v_person uuid;
  v_y0 int := (p -> 'nodeYears' ->> 0)::int;
  v_y1 int := (p -> 'nodeYears' ->> 1)::int;
  v_key text;
  v_part uuid;
begin
  if v_author is null or v_author !~ '^https://openalex\.org/A\d+$' or char_length(v_name) < 3 or v_name !~ ' ' then
    return null;
  end if;
  select person_id into v_person from public.person_external_ids where source = 'openalex' and external_id = v_author limit 1;
  if v_person is null and v_orcid is not null then
    select person_id into v_person from public.person_external_ids where source = 'orcid' and external_id = v_orcid limit 1;
  end if;
  if v_person is null then
    v_family := regexp_replace(v_name, '^.* ', '');
    v_given := btrim(left(v_name, char_length(v_name) - char_length(v_family)));
    insert into public.people (given_name, family_name, display_name, source_type, verification_status)
    values (v_given, v_family, v_name, 'imported_historical', 'provisional')
    returning id into v_person;
  end if;
  insert into public.person_external_ids (person_id, source, external_id) values (v_person, 'openalex', v_author)
  on conflict (person_id, source, external_id) do nothing;
  if v_orcid is not null then
    insert into public.person_external_ids (person_id, source, external_id) values (v_person, 'orcid', v_orcid)
    on conflict (person_id, source, external_id) do nothing;
  end if;

  -- The period at the Node's institution, from its publications.
  v_key := v_author || '|node|' || p_node_org::text;
  if p_node_org is not null and v_y0 between 1900 and 2100
     and not exists (select 1 from public.external_record_sources where subject_type = 'participation' and source = 'openalex' and external_id = v_key) then
    insert into public.participations
      (person_id, organization_id, capacity, summary, start_date, start_precision, end_date, end_precision, source_type, verification_status)
    values (v_person, p_node_org, 'researcher',
            replace(p_node_note, '{years}', case when v_y1 is null or v_y1 = v_y0 then v_y0::text else v_y0 || '–' || v_y1 end),
            make_date(v_y0, 1, 1), 'year',
            case when v_y1 > v_y0 then make_date(v_y1, 1, 1) end, case when v_y1 > v_y0 then 'year' end,
            'imported_historical', 'provisional')
    returning id into v_part;
    insert into public.external_record_sources (subject_type, subject_id, source, external_id, url)
    values ('participation', v_part, 'openalex', v_key, v_author);
  end if;

  perform public.import_openalex_history_internal(v_person, jsonb_build_object(
    'authorId', v_author, 'affiliations', coalesce(p -> 'affiliations', '[]'::jsonb), 'works', coalesce(p -> 'works', '[]'::jsonb)));
  return v_person;
end;
$$;

revoke all on function public.import_openalex_person(uuid, text, jsonb) from public, anon, authenticated;
