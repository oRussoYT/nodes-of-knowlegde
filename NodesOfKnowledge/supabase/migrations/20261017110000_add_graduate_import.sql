-- Graduate-list import with human matching (docs/ROTEIRO.md etapa 4, first
-- cut; docs/PRODUTO.md screen 09 "needs a human").
--
-- An institution hands over its own list of graduates. Each row is held in a
-- staging area -- never written straight into the record -- and a steward
-- decides, row by row, what it is:
--   * match  -> this row IS an existing person (the steward picked them),
--   * create -> this row is a person the record does not hold yet,
--   * skip   -> not usable / not now.
-- The system only PROPOSES candidates (same normalized name; same family name
-- and initial), each with the reason it was proposed and whether the record
-- already documents that person at the importing institution. It never
-- decides. That is REGRAS.md rule 4 (proposal is not fact) applied to import.
--
-- On match/create with an importing institution, one documented participation
-- is added (capacity 'student', source 'imported_historical', date unknown, the
-- graduation year and degree kept in the summary) so the graduate appears in
-- the institution's record without inventing a start date.
--
-- Staging tables have RLS on and no client grants; every access goes through
-- the reviewer-gated SECURITY DEFINER functions below. Writes are audited.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.import_batches (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  organization_id uuid references public.organizations (id) on delete set null,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint import_batches_label_not_blank check (btrim(label) <> '')
);

comment on table public.import_batches is
  'One uploaded list (e.g. a graduate list from an institution). Staging only: '
  'nothing in a batch is part of the record until a steward resolves its rows.';

create table public.import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.import_batches (id) on delete cascade,
  row_number integer not null,

  given_name text not null,
  family_name text not null,
  degree text,
  programme text,
  graduation_year integer,
  external_ref text,

  status text not null default 'pending',
  resolved_person_id uuid references public.people (id) on delete set null,
  resolved_by_user_id uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  decision_note text,

  created_at timestamptz not null default now(),

  constraint import_rows_given_not_blank check (btrim(given_name) <> ''),
  constraint import_rows_family_not_blank check (btrim(family_name) <> ''),
  constraint import_rows_year_plausible check (graduation_year is null or graduation_year between 1800 and 2100),
  constraint import_rows_status_valid check (status in ('pending', 'matched', 'created', 'skipped')),
  constraint import_rows_resolution_consistent check (
    (status = 'pending' and resolved_at is null and resolved_person_id is null)
    or (status = 'skipped' and resolved_at is not null and resolved_person_id is null)
    or (status in ('matched', 'created') and resolved_at is not null)
  ),
  constraint import_rows_unique_row unique (batch_id, row_number)
);

comment on table public.import_rows is
  'One line of an uploaded list, awaiting a human decision. Personal data '
  'kept to the minimum needed to match (names, degree, programme, year).';

create index import_rows_batch_status_idx on public.import_rows (batch_id, status);

alter table public.import_batches enable row level security;
alter table public.import_rows enable row level security;
-- No policies and no grants: clients reach these only through the functions below.


-- ---------------------------------------------------------------------------
-- Internal helper: normalized name key (case and whitespace insensitive).
-- Same normalization as steward_attention()'s duplicate detection.
-- ---------------------------------------------------------------------------
create function public.import_name_key(p_name text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select lower(regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g'));
$$;

revoke all on function public.import_name_key(text) from public;


-- ---------------------------------------------------------------------------
-- steward_create_import_batch(label, organization_id, rows)
-- rows: jsonb array of {givenName, familyName, degree?, programme?,
--       graduationYear?, externalRef?}. All-or-nothing: one invalid row
--       rejects the whole upload with the row number in the message.
-- ---------------------------------------------------------------------------
create function public.steward_create_import_batch(
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
  if not public.is_active_reviewer(auth.uid()) then
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

comment on function public.steward_create_import_batch(text, uuid, jsonb) is
  'Uploads a list into staging. All-or-nothing validation. Reviewer-gated; audited.';

revoke all on function public.steward_create_import_batch(text, uuid, jsonb) from public;
revoke all on function public.steward_create_import_batch(text, uuid, jsonb) from anon;
grant execute on function public.steward_create_import_batch(text, uuid, jsonb) to authenticated;


-- ---------------------------------------------------------------------------
-- steward_list_import_batches()
-- ---------------------------------------------------------------------------
create function public.steward_list_import_batches()
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
  if not public.is_active_reviewer(auth.uid()) then
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
     group by b.id, o.name
     order by b.created_at desc, b.id;
end;
$$;

revoke all on function public.steward_list_import_batches() from public;
revoke all on function public.steward_list_import_batches() from anon;
grant execute on function public.steward_list_import_batches() to authenticated;


-- ---------------------------------------------------------------------------
-- steward_import_candidates(batch_id)
-- Pending rows with the people the record already holds that might be them.
-- Candidates are ordered by the kind of match (same full name before same
-- family name + initial), then alphabetically -- an explanation order, not a
-- score. At most 10 candidates per row.
-- ---------------------------------------------------------------------------
create function public.steward_import_candidates(p_batch_id uuid)
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
  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_import_candidates: reviewer authorization required';
  end if;

  select b.organization_id into v_org from public.import_batches b where b.id = p_batch_id;
  if not found then
    return null;
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

comment on function public.steward_import_candidates(uuid) is
  'Pending import rows with proposed existing people and the reason each was '
  'proposed. Proposals only; nothing is decided here. Reviewer-gated.';

revoke all on function public.steward_import_candidates(uuid) from public;
revoke all on function public.steward_import_candidates(uuid) from anon;
grant execute on function public.steward_import_candidates(uuid) to authenticated;


-- ---------------------------------------------------------------------------
-- steward_resolve_import_row(row_id, action, person_id, note)
-- The human decision. Returns the person the row now points at (null on skip).
-- ---------------------------------------------------------------------------
create function public.steward_resolve_import_row(
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
  if not public.is_active_reviewer(auth.uid()) then
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

comment on function public.steward_resolve_import_row(uuid, text, uuid, text) is
  'The human decision on one import row: match to an existing person, create '
  'a new person, or skip. Adds a documented student participation at the '
  'importing institution (date unknown; year and degree in the summary). '
  'Reviewer-gated; audited.';

revoke all on function public.steward_resolve_import_row(uuid, text, uuid, text) from public;
revoke all on function public.steward_resolve_import_row(uuid, text, uuid, text) from anon;
grant execute on function public.steward_resolve_import_row(uuid, text, uuid, text) to authenticated;
