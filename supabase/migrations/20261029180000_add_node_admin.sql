-- Second Node and comparisons (docs/ROTEIRO.md fase 2, etapa N): the same
-- engine serves any number of Nodes. Platform reviewers create a Node and
-- choose its institutions here (audited) -- no code change, no new deploy.
-- Comparing two Nodes uses each one's public Observatory (counts only).

create function public.steward_create_node(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_create_node: platform reviewer required' using errcode = '42501';
  end if;
  insert into public.nodes (slug, name, short_name, tagline, description, plan, cover_photo, accent_color)
  values (lower(btrim(p ->> 'slug')), btrim(p ->> 'name'), nullif(btrim(coalesce(p ->> 'shortName', '')), ''),
          nullif(btrim(coalesce(p ->> 'tagline', '')), ''), nullif(btrim(coalesce(p ->> 'description', '')), ''),
          coalesce(nullif(p ->> 'plan', ''), 'pro_bono'), nullif(p ->> 'coverPhoto', ''), nullif(p ->> 'accentColor', ''))
  returning id into v_id;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'create', 'node', v_id, btrim(p ->> 'name'), jsonb_build_object('slug', p ->> 'slug', 'plan', p ->> 'plan'));
  return v_id;
end;
$$;

revoke all on function public.steward_create_node(jsonb) from public, anon;
grant execute on function public.steward_create_node(jsonb) to authenticated;

create function public.steward_update_node(p_slug text, p jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_update_node: platform reviewer required' using errcode = '42501';
  end if;
  update public.nodes
     set name = coalesce(nullif(btrim(p ->> 'name'), ''), name),
         short_name = case when p ? 'shortName' then nullif(btrim(coalesce(p ->> 'shortName', '')), '') else short_name end,
         tagline = case when p ? 'tagline' then nullif(btrim(coalesce(p ->> 'tagline', '')), '') else tagline end,
         description = case when p ? 'description' then nullif(btrim(coalesce(p ->> 'description', '')), '') else description end,
         status = coalesce(nullif(p ->> 'status', ''), status),
         updated_at = now()
   where slug = p_slug
  returning id into v_id;
  if v_id is null then
    raise exception 'steward_update_node: not found' using errcode = 'P0002';
  end if;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'node', v_id, p_slug, p);
end;
$$;

revoke all on function public.steward_update_node(text, jsonb) from public, anon;
grant execute on function public.steward_update_node(text, jsonb) to authenticated;

create function public.steward_set_node_organization(p_slug text, p_organization_id uuid, p_role text, p_include boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_node uuid;
begin
  if auth.uid() is null or not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_set_node_organization: platform reviewer required' using errcode = '42501';
  end if;
  select id into v_node from public.nodes where slug = p_slug;
  if v_node is null then
    raise exception 'steward_set_node_organization: not found' using errcode = 'P0002';
  end if;
  if p_include then
    insert into public.node_organizations (node_id, organization_id, role) values (v_node, p_organization_id, coalesce(p_role, 'core'))
    on conflict (node_id, organization_id) do update set role = excluded.role;
  else
    delete from public.node_organizations where node_id = v_node and organization_id = p_organization_id;
  end if;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), case when p_include then 'update' else 'delete' end, 'node_organization', v_node, p_slug,
          jsonb_build_object('organizationId', p_organization_id, 'role', p_role));
end;
$$;

revoke all on function public.steward_set_node_organization(text, uuid, text, boolean) from public, anon;
grant execute on function public.steward_set_node_organization(text, uuid, text, boolean) to authenticated;
