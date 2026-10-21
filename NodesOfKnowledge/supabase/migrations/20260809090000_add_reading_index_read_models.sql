-- Reading indexes: bounded list read models for discovery
--
-- Exposes the already-complete People, Institution, and Contribution
-- engines through browsable directory pages (/people, /institutions,
-- /contributions) so a first-time reader can discover records by name
-- rather than by UUID. This adds NO new tables, columns, or engine
-- behavior and changes no existing read model, RLS policy, grant, or
-- SECURITY DEFINER boundary. It only adds three read-only list functions
-- that follow the exact pattern already used by the get_* read models
-- (docs/decisions/0011..0016): SECURITY DEFINER with search_path pinned,
-- authentication enforced in the body (auth.uid()), EXECUTE granted to
-- `authenticated` only (revoked from PUBLIC, so anon has no access), and
-- reading the canonical tables as the function owner rather than via any
-- client table grant.
--
-- Each returns a compact row set (identity + the few fields a directory
-- listing shows honestly, including verification/provenance), ordered
-- deterministically, and capped defensively. Detail remains the province
-- of the existing single-record read models the pages already use.
--
-- `merged` people are excluded (their detail read models return null, so a
-- listing must not link to a page that 404s), mirroring the existing
-- get_person_* / search_claimable_people behavior. Institutions and
-- contributions are listed in full, including historical/closed and
-- disputed/provisional records, because honest historical breadth is the
-- point of the reading experience.

-- ---------------------------------------------------------------------
-- list_people()
-- ---------------------------------------------------------------------
create function public.list_people()
returns table (
  id uuid,
  display_name text,
  verification_status text,
  is_deceased boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'list_people: authentication required';
  end if;

  return query
    select p.id, p.display_name, p.verification_status, p.is_deceased
    from public.people p
    where p.verification_status <> 'merged'
    order by p.display_name asc
    limit 500;
end;
$$;

comment on function public.list_people() is
  'Directory listing of non-merged people (id, display_name, '
  'verification_status, is_deceased) for the /people reading index. '
  'SECURITY DEFINER; authentication enforced in-body; never granted to '
  'anon. No detail beyond what a listing shows -- detail stays in '
  'get_person_biography and the other per-person read models.';

revoke all on function public.list_people() from public;
grant execute on function public.list_people() to authenticated;

-- ---------------------------------------------------------------------
-- list_organizations()
-- ---------------------------------------------------------------------
create function public.list_organizations()
returns table (
  id uuid,
  name text,
  short_name text,
  organization_type text,
  organization_type_label text,
  status text,
  verification_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'list_organizations: authentication required';
  end if;

  return query
    select o.id, o.name, o.short_name, o.organization_type, ot.label,
           o.status, o.verification_status
    from public.organizations o
    left join public.organization_types ot on ot.key = o.organization_type
    order by o.name asc
    limit 500;
end;
$$;

comment on function public.list_organizations() is
  'Directory listing of institutions (identity + type label + status + '
  'verification) for the /institutions reading index, including '
  'historical/closed records. SECURITY DEFINER; authentication enforced '
  'in-body; never granted to anon.';

revoke all on function public.list_organizations() from public;
grant execute on function public.list_organizations() to authenticated;

-- ---------------------------------------------------------------------
-- list_contributions()
-- ---------------------------------------------------------------------
create function public.list_contributions()
returns table (
  id uuid,
  title text,
  contribution_kind text,
  contribution_kind_label text,
  verification_status text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'list_contributions: authentication required';
  end if;

  return query
    select c.id, c.title, c.contribution_kind, ck.label, c.verification_status
    from public.contributions c
    left join public.contribution_kinds ck on ck.key = c.contribution_kind
    order by c.start_date desc nulls last, c.title asc
    limit 500;
end;
$$;

comment on function public.list_contributions() is
  'Directory listing of contributions (title + kind label + verification) '
  'for the /contributions reading index, most-recent first. SECURITY '
  'DEFINER; authentication enforced in-body; never granted to anon.';

revoke all on function public.list_contributions() from public;
grant execute on function public.list_contributions() to authenticated;
