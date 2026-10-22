-- Register an institution from the site (platform reviewers only).
--
-- Until now an institution could only enter the database by hand, so a real
-- university (needed before importing its graduate list) could not be added
-- from the app. Platform reviewers can now register one; it enters as
-- admin_entered / provisional, never as demonstration data, and the creation
-- is audited. Duplicate names (case-insensitive) are refused.

create function public.steward_create_organization(
  p_name text,
  p_organization_type text default 'university',
  p_short_name text default null,
  p_location text default null,
  p_website text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if auth.uid() is null then
    raise exception 'steward_create_organization: authentication required' using errcode = '42501';
  end if;
  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_create_organization: reviewer authorization required' using errcode = '42501';
  end if;
  if v_name = '' then
    raise exception 'steward_create_organization: a name is required';
  end if;
  if not exists (select 1 from public.organization_types t where t.key = p_organization_type) then
    raise exception 'steward_create_organization: unknown kind of institution';
  end if;
  if exists (select 1 from public.organizations o where lower(o.name) = lower(v_name)) then
    raise exception 'steward_create_organization: an institution with this name already exists';
  end if;
  if p_website is not null and btrim(p_website) <> '' and p_website !~* '^https?://' then
    raise exception 'steward_create_organization: the website must start with http:// or https://';
  end if;

  insert into public.organizations (
    name, short_name, organization_type, status, location, website, source_type, verification_status)
  values (
    v_name,
    nullif(btrim(coalesce(p_short_name, '')), ''),
    p_organization_type,
    'active',
    nullif(btrim(coalesce(p_location, '')), ''),
    nullif(btrim(coalesce(p_website, '')), ''),
    'admin_entered',
    'provisional')
  returning id into v_id;

  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'create', 'organization', v_id, v_name,
          jsonb_build_object('organizationType', p_organization_type));
  return v_id;
end;
$$;

revoke all on function public.steward_create_organization(text, text, text, text, text) from public;
grant execute on function public.steward_create_organization(text, text, text, text, text) to authenticated;
