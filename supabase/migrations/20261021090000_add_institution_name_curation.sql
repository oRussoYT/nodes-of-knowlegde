-- Institution name history, curated by stewards.
--
-- organization_names (20260807090000) already holds an institution's former,
-- alternative, acronym, Indigenous, local and translated names, and the
-- institution page already reads them. What was missing is a way to add and
-- remove them without touching the database by hand. These functions give
-- that to the institution's own stewards (and platform reviewers), scoped by
-- can_steward_org, every write audited.
--
-- A name entered here is admin_entered and provisional: it states that a
-- steward recorded it, not that it was independently verified.

-- ---------------------------------------------------------------------
-- steward_list_organization_names(org)
-- ---------------------------------------------------------------------
create function public.steward_list_organization_names(p_organization_id uuid)
returns table (
  id uuid,
  name text,
  name_type text,
  language text,
  start_year int,
  end_year int,
  source_type text,
  verification_status text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'steward_list_organization_names: authentication required' using errcode = '42501';
  end if;
  if not public.can_steward_org(auth.uid(), p_organization_id) then
    raise exception 'steward_list_organization_names: reviewer authorization required' using errcode = '42501';
  end if;

  return query
  select n.id, n.name, n.name_type, n.language,
         extract(year from n.start_date)::int, extract(year from n.end_date)::int,
         n.source_type, n.verification_status, n.created_at
    from public.organization_names n
   where n.organization_id = p_organization_id
   order by n.start_date nulls last, n.name;
end;
$$;

revoke all on function public.steward_list_organization_names(uuid) from public;
grant execute on function public.steward_list_organization_names(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- steward_add_organization_name(org, name, type, language, from, to)
-- Years only: an institution's renaming is almost always known to the year.
-- ---------------------------------------------------------------------
create function public.steward_add_organization_name(
  p_organization_id uuid,
  p_name text,
  p_name_type text,
  p_language text default null,
  p_start_year int default null,
  p_end_year int default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_org_name text;
begin
  if auth.uid() is null then
    raise exception 'steward_add_organization_name: authentication required' using errcode = '42501';
  end if;
  if not public.can_steward_org(auth.uid(), p_organization_id) then
    raise exception 'steward_add_organization_name: reviewer authorization required' using errcode = '42501';
  end if;
  select o.name into v_org_name from public.organizations o where o.id = p_organization_id;
  if v_org_name is null then
    raise exception 'steward_add_organization_name: institution not found';
  end if;
  if v_name = '' then
    raise exception 'steward_add_organization_name: a name is required';
  end if;
  if p_name_type is null or p_name_type not in ('former', 'alternative', 'acronym', 'indigenous', 'local', 'translation') then
    raise exception 'steward_add_organization_name: unknown kind of name';
  end if;
  if (p_start_year is not null and (p_start_year < 1500 or p_start_year > 2100))
     or (p_end_year is not null and (p_end_year < 1500 or p_end_year > 2100)) then
    raise exception 'steward_add_organization_name: years must be between 1500 and 2100';
  end if;
  if p_start_year is not null and p_end_year is not null and p_end_year < p_start_year then
    raise exception 'steward_add_organization_name: the end year is before the start year';
  end if;
  if exists (
    select 1 from public.organization_names n
     where n.organization_id = p_organization_id
       and lower(n.name) = lower(v_name) and n.name_type = p_name_type
  ) then
    raise exception 'steward_add_organization_name: this name is already recorded';
  end if;

  insert into public.organization_names (
    organization_id, name, name_type, language,
    start_date, start_precision, end_date, end_precision,
    source_type, verification_status)
  values (
    p_organization_id, v_name, p_name_type, nullif(btrim(coalesce(p_language, '')), ''),
    case when p_start_year is null then null else make_date(p_start_year, 1, 1) end,
    case when p_start_year is null then null else 'year' end,
    case when p_end_year is null then null else make_date(p_end_year, 1, 1) end,
    case when p_end_year is null then null else 'year' end,
    'admin_entered', 'provisional')
  returning id into v_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'create', 'organization_name', v_id, v_name,
          jsonb_build_object('organizationId', p_organization_id, 'organizationName', v_org_name,
                             'nameType', p_name_type, 'startYear', p_start_year, 'endYear', p_end_year));

  return v_id;
end;
$$;

revoke all on function public.steward_add_organization_name(uuid, text, text, text, int, int) from public;
grant execute on function public.steward_add_organization_name(uuid, text, text, text, int, int) to authenticated;

-- ---------------------------------------------------------------------
-- steward_remove_organization_name(name_id)
-- ---------------------------------------------------------------------
create function public.steward_remove_organization_name(p_name_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.organization_names%rowtype;
begin
  if auth.uid() is null then
    raise exception 'steward_remove_organization_name: authentication required' using errcode = '42501';
  end if;
  select * into v_row from public.organization_names n where n.id = p_name_id;
  if v_row.id is null then
    raise exception 'steward_remove_organization_name: name not found';
  end if;
  if not public.can_steward_org(auth.uid(), v_row.organization_id) then
    raise exception 'steward_remove_organization_name: reviewer authorization required' using errcode = '42501';
  end if;

  delete from public.organization_names n where n.id = p_name_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'delete', 'organization_name', p_name_id, v_row.name,
          jsonb_build_object('organizationId', v_row.organization_id, 'nameType', v_row.name_type,
                             'startDate', v_row.start_date, 'endDate', v_row.end_date));
  return true;
end;
$$;

revoke all on function public.steward_remove_organization_name(uuid) from public;
grant execute on function public.steward_remove_organization_name(uuid) to authenticated;
