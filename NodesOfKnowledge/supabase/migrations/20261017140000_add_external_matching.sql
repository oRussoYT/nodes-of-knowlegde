-- Where they went: proposals from open scholarly sources for imported
-- graduates (docs/ROTEIRO.md etapa 4, second half).
--
-- After a list is imported, the app looks each graduate up in OpenAlex (an
-- open index of authors, institutions and works; ORCID ids come with it). What
-- comes back is stored as a PROPOSAL attached to the import row, with the
-- evidence that made it a candidate (same name, an alternative name, an
-- affiliation with the importing institution around the graduation year). A
-- steward accepts or rejects each proposal. Accepting records, for the person
-- the row resolved to:
--   * their external identifiers (OpenAlex author id, ORCID) -- person_external_ids
--   * their latest known institution as a dated, sourced destination -- person_destinations
-- Nothing external is ever written into the record without a human decision
-- (REGRAS.md rule 4), and every decision is audited.
--
-- The lookup itself happens in the application server (it needs the
-- internet); the database only stores and gates.

create table public.import_row_external_matches (
  id uuid primary key default gen_random_uuid(),
  row_id uuid not null references public.import_rows (id) on delete cascade,
  source text not null,
  external_id text not null,
  display_name text not null,
  orcid text,
  last_known_institution text,
  last_known_country text,
  affiliations jsonb not null default '[]'::jsonb,
  works_count integer,
  reasons jsonb not null default '[]'::jsonb,
  status text not null default 'proposed',
  decided_by_user_id uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  fetched_at timestamptz not null default now(),
  constraint external_matches_source_valid check (source in ('openalex')),
  constraint external_matches_status_valid check (status in ('proposed', 'accepted', 'rejected')),
  constraint external_matches_decision_consistent check ((status = 'proposed') = (decided_at is null)),
  constraint external_matches_unique unique (row_id, source, external_id)
);

create index external_matches_row_idx on public.import_row_external_matches (row_id);

create table public.person_external_ids (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  source text not null,
  external_id text not null,
  confirmed_by_user_id uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz not null default now(),
  constraint person_external_ids_source_valid check (source in ('openalex', 'orcid')),
  constraint person_external_ids_unique unique (person_id, source, external_id)
);

create table public.person_destinations (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  institution_name text not null,
  country_code text,
  as_of_year integer,
  source text not null,
  evidence jsonb not null default '{}'::jsonb,
  confirmed_by_user_id uuid references auth.users (id) on delete set null,
  confirmed_at timestamptz not null default now(),
  constraint person_destinations_source_valid check (source in ('openalex')),
  constraint person_destinations_year_plausible check (as_of_year is null or as_of_year between 1800 and 2100)
);

create index person_destinations_person_idx on public.person_destinations (person_id);

comment on table public.person_destinations is
  'Where a person was last documented, from an external open source, confirmed '
  'by a steward. Dated (as_of_year) and sourced -- the raw material of a '
  '"where our graduates went" report. Never inferred without a human.';

alter table public.import_row_external_matches enable row level security;
alter table public.person_external_ids enable row level security;
alter table public.person_destinations enable row level security;


-- ---------------------------------------------------------------------------
-- Internal: may the caller steward this import row?
-- ---------------------------------------------------------------------------
create function public.can_steward_import_row(p_user_id uuid, p_row_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_active_reviewer(p_user_id)
      or exists (
        select 1 from public.import_rows r
        join public.import_batches b on b.id = r.batch_id
        where r.id = p_row_id and b.organization_id is not null
          and public.can_steward_org(p_user_id, b.organization_id));
$$;

revoke all on function public.can_steward_import_row(uuid, uuid) from public;
revoke all on function public.can_steward_import_row(uuid, uuid) from anon, authenticated;


-- ---------------------------------------------------------------------------
-- steward_record_external_matches(row, source, matches)
-- Replaces the still-undecided proposals for (row, source); decided ones stay.
-- matches: [{externalId, displayName, orcid?, lastKnownInstitution?,
--            lastKnownCountry?, affiliations?, worksCount?, reasons?}]
-- ---------------------------------------------------------------------------
create function public.steward_record_external_matches(p_row_id uuid, p_source text, p_matches jsonb)
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
       affiliations, works_count, reasons)
    values (
      p_row_id, p_source, btrim(v_m ->> 'externalId'), btrim(v_m ->> 'displayName'),
      nullif(btrim(coalesce(v_m ->> 'orcid', '')), ''),
      nullif(btrim(coalesce(v_m ->> 'lastKnownInstitution', '')), ''),
      nullif(btrim(coalesce(v_m ->> 'lastKnownCountry', '')), ''),
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

revoke all on function public.steward_record_external_matches(uuid, text, jsonb) from public;
revoke all on function public.steward_record_external_matches(uuid, text, jsonb) from anon;
grant execute on function public.steward_record_external_matches(uuid, text, jsonb) to authenticated;


-- ---------------------------------------------------------------------------
-- steward_import_external(batch): every row of a batch with its proposals.
-- ---------------------------------------------------------------------------
create function public.steward_import_external(p_batch_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
begin
  if auth.uid() is null then
    raise exception 'steward_import_external: authentication required';
  end if;
  select organization_id into v_org from public.import_batches where id = p_batch_id;
  if not found then
    return null;
  end if;
  if not public.is_active_reviewer(auth.uid())
     and (v_org is null or not public.can_steward_org(auth.uid(), v_org)) then
    raise exception 'steward_import_external: reviewer authorization required';
  end if;

  return jsonb_build_object('batchId', p_batch_id, 'rows', coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', r.id,
             'rowNumber', r.row_number,
             'givenName', r.given_name,
             'familyName', r.family_name,
             'graduationYear', r.graduation_year,
             'status', r.status,
             'personId', r.resolved_person_id,
             'matches', coalesce((
               select jsonb_agg(jsonb_build_object(
                        'id', m.id, 'source', m.source, 'externalId', m.external_id,
                        'displayName', m.display_name, 'orcid', m.orcid,
                        'lastKnownInstitution', m.last_known_institution, 'lastKnownCountry', m.last_known_country,
                        'affiliations', m.affiliations, 'worksCount', m.works_count,
                        'reasons', m.reasons, 'status', m.status)
                      order by (m.status = 'accepted') desc, m.display_name, m.id)
                 from public.import_row_external_matches m where m.row_id = r.id), '[]'::jsonb))
           order by r.row_number)
      from public.import_rows r where r.batch_id = p_batch_id), '[]'::jsonb));
end;
$$;

revoke all on function public.steward_import_external(uuid) from public;
revoke all on function public.steward_import_external(uuid) from anon;
grant execute on function public.steward_import_external(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- steward_decide_external_match(match, accept)
-- ---------------------------------------------------------------------------
create function public.steward_decide_external_match(p_match_id uuid, p_accept boolean)
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
  -- One accepted identity per row and source: the others are set aside.
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
    insert into public.person_destinations (person_id, institution_name, country_code, as_of_year, source, evidence, confirmed_by_user_id)
    values (v_person, v_m.last_known_institution, v_m.last_known_country, v_year, 'openalex',
            jsonb_build_object('externalId', v_m.external_id, 'orcid', v_m.orcid, 'reasons', v_m.reasons, 'fetchedAt', v_m.fetched_at),
            auth.uid());
  end if;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'approve', 'external_match', p_match_id, v_m.display_name,
          jsonb_build_object('personId', v_person, 'source', v_m.source, 'externalId', v_m.external_id, 'orcid', v_m.orcid));

  return 'accepted';
end;
$$;

revoke all on function public.steward_decide_external_match(uuid, boolean) from public;
revoke all on function public.steward_decide_external_match(uuid, boolean) from anon;
grant execute on function public.steward_decide_external_match(uuid, boolean) to authenticated;
