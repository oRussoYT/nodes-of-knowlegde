-- Knowledge Nodes (ROTEIRO fase 2, etapa B).
--
-- Nodes of Knowledge is one platform; each institution or project that uses
-- it is a Node with its own identity, people and history, inside the same
-- record. One account per person across every Node (Pessoa != conta still
-- holds: people are in the record with or without an account).
--
-- 1. nodes                -- identity (name, tagline, colours, cover), plan
--                            ('pro_bono' | 'paid'), status.
-- 2. node_organizations   -- the institutions a Node gathers (the project
--                            itself, its host, partners). A person belongs to
--                            a Node's history through participations there.
-- 3. node_members         -- accounts that joined a Node ("Join PDBFF").
--                            Joining is the account's own act; it says nothing
--                            about the person record.
-- 4. get_node / list_nodes -- public, counts only (no names, no personal data).
-- 5. join_node / leave_node / my_nodes -- signed-in members.
-- 6. steward_set_node_plan -- platform reviewers only, with a reason, audited.
--
-- Seeds the first Node: PDBFF / BDFFP (pro bono), with the project itself
-- as an institution of type research_programme.

create table public.nodes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  short_name text,
  tagline text,
  description text,
  accent_color text,
  cover_photo text,
  plan text not null default 'pro_bono',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint nodes_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 40),
  constraint nodes_name_not_blank check (btrim(name) <> ''),
  constraint nodes_plan_valid check (plan in ('pro_bono', 'paid')),
  constraint nodes_status_valid check (status in ('active', 'paused')),
  constraint nodes_accent_format check (accent_color is null or accent_color ~ '^#[0-9a-fA-F]{6}$'),
  constraint nodes_cover_format check (cover_photo is null or cover_photo ~ '^/photos/[a-z0-9-]+$')
);

comment on table public.nodes is
  'A Knowledge Node: one institution or project using the platform, with its own identity and plan.';

create trigger nodes_set_updated_at before update on public.nodes
  for each row execute function public.set_updated_at();

create table public.node_organizations (
  node_id uuid not null references public.nodes (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null default 'core',
  created_at timestamptz not null default now(),
  primary key (node_id, organization_id),
  constraint node_organizations_role_valid check (role in ('core', 'host', 'partner'))
);

create table public.node_members (
  node_id uuid not null references public.nodes (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (node_id, user_id)
);

alter table public.nodes enable row level security;
alter table public.node_organizations enable row level security;
alter table public.node_members enable row level security;

-- Node identity and its institutions are public information.
create policy nodes_select_all on public.nodes for select to anon, authenticated using (true);
create policy node_organizations_select_all on public.node_organizations for select to anon, authenticated using (true);
-- A member sees only their own memberships.
create policy node_members_select_own on public.node_members for select to authenticated using (user_id = auth.uid());

grant select on public.nodes, public.node_organizations to anon, authenticated;
grant select on public.node_members to authenticated;

-- ---------------------------------------------------------------------
-- Counts for a Node: people with a participation at one of its
-- institutions, the institutions themselves, and those people's works.
-- ---------------------------------------------------------------------
create function public.node_counts(p_node_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with orgs as (
    select organization_id from public.node_organizations where node_id = p_node_id
  ), people as (
    select distinct pa.person_id
      from public.participations pa
      join public.people pe on pe.id = pa.person_id and pe.verification_status <> 'merged'
     where pa.organization_id in (select organization_id from orgs)
  )
  select jsonb_build_object(
    'people', (select count(*) from people),
    'institutions', (select count(*) from orgs),
    'works', (select count(distinct pc.contribution_id) from public.person_contributions pc where pc.person_id in (select person_id from people)),
    'members', (select count(*) from public.node_members where node_id = p_node_id),
    'firstYear', (select min(extract(year from pa.start_date))::int from public.participations pa
                   where pa.organization_id in (select organization_id from orgs))
  );
$$;

revoke all on function public.node_counts(uuid) from public, anon, authenticated;

create function public.get_node(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_node public.nodes%rowtype;
begin
  select * into v_node from public.nodes where slug = lower(btrim(p_slug));
  if v_node.id is null then
    return null;
  end if;
  return jsonb_build_object(
    'id', v_node.id,
    'slug', v_node.slug,
    'name', v_node.name,
    'shortName', v_node.short_name,
    'tagline', v_node.tagline,
    'description', v_node.description,
    'accentColor', v_node.accent_color,
    'coverPhoto', v_node.cover_photo,
    'plan', v_node.plan,
    'status', v_node.status,
    'counts', public.node_counts(v_node.id),
    'institutions', coalesce((
      select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'shortName', o.short_name, 'role', no.role, 'status', o.status)
                       order by case no.role when 'core' then 0 when 'host' then 1 else 2 end, o.name)
        from public.node_organizations no
        join public.organizations o on o.id = no.organization_id
       where no.node_id = v_node.id), '[]'::jsonb),
    'isMember', auth.uid() is not null and exists (
      select 1 from public.node_members m where m.node_id = v_node.id and m.user_id = auth.uid())
  );
end;
$$;

grant execute on function public.get_node(text) to anon, authenticated;

create function public.list_nodes()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'slug', n.slug, 'name', n.name, 'shortName', n.short_name, 'tagline', n.tagline,
           'accentColor', n.accent_color, 'coverPhoto', n.cover_photo, 'plan', n.plan,
           'counts', public.node_counts(n.id))
         order by n.name), '[]'::jsonb)
    from public.nodes n
   where n.status = 'active';
$$;

grant execute on function public.list_nodes() to anon, authenticated;

create function public.join_node(p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_node uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;
  select id into v_node from public.nodes where slug = lower(btrim(p_slug)) and status = 'active';
  if v_node is null then
    raise exception 'node not found' using errcode = 'P0002';
  end if;
  insert into public.node_members (node_id, user_id) values (v_node, auth.uid())
  on conflict do nothing;
  return v_node;
end;
$$;

revoke all on function public.join_node(text) from public, anon;
grant execute on function public.join_node(text) to authenticated;

create function public.leave_node(p_slug text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.node_members m
   using public.nodes n
   where n.id = m.node_id and n.slug = lower(btrim(p_slug)) and m.user_id = auth.uid();
$$;

revoke all on function public.leave_node(text) from public, anon;
grant execute on function public.leave_node(text) to authenticated;

create function public.my_nodes()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', n.slug, 'name', n.name, 'shortName', n.short_name,
                                               'accentColor', n.accent_color, 'joinedAt', m.joined_at)
                            order by m.joined_at), '[]'::jsonb)
    from public.node_members m
    join public.nodes n on n.id = m.node_id
   where m.user_id = auth.uid();
$$;

revoke all on function public.my_nodes() from public, anon;
grant execute on function public.my_nodes() to authenticated;

create function public.steward_set_node_plan(p_slug text, p_plan text, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_node public.nodes%rowtype;
begin
  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'reviewer authorization required' using errcode = '42501';
  end if;
  if p_plan not in ('pro_bono', 'paid') then
    raise exception 'plan must be pro_bono or paid' using errcode = '22023';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'a reason is required' using errcode = '22023';
  end if;
  select * into v_node from public.nodes where slug = lower(btrim(p_slug));
  if v_node.id is null then
    raise exception 'node not found' using errcode = 'P0002';
  end if;
  update public.nodes set plan = p_plan where id = v_node.id;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'node', v_node.id, v_node.name,
          jsonb_build_object('plan', jsonb_build_object('from', v_node.plan, 'to', p_plan), 'reason', btrim(p_reason)));
end;
$$;

revoke all on function public.steward_set_node_plan(text, text, text) from public, anon;
grant execute on function public.steward_set_node_plan(text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- The first Node: PDBFF / BDFFP.
-- ---------------------------------------------------------------------
insert into public.organizations (name, short_name, organization_type, status, location, founding_date, founding_precision,
                                  source_type, verification_status)
select 'Biological Dynamics of Forest Fragments Project', 'BDFFP', 'research_programme', 'active',
       'North of Manaus, Amazonas, Brazil', '1979-01-01', 'year', 'admin_entered', 'provisional'
 where not exists (select 1 from public.organizations o where not o.is_demo and o.short_name = 'BDFFP');

insert into public.organization_names (organization_id, name, name_type, language, source_type, verification_status)
select o.id, n.name, n.name_type, n.language, 'admin_entered', 'provisional'
  from public.organizations o
  cross join (values
    ('Projeto Dinâmica Biológica de Fragmentos Florestais', 'translation', 'pt'),
    ('PDBFF', 'acronym', 'pt'),
    ('Minimum Critical Size of Ecosystems Project', 'former', 'en')
  ) as n(name, name_type, language)
 where o.short_name = 'BDFFP' and not o.is_demo
   and not exists (select 1 from public.organization_names x where x.organization_id = o.id and x.name = n.name);

insert into public.nodes (slug, name, short_name, tagline, description, accent_color, cover_photo, plan)
values ('pdbff', 'Biological Dynamics of Forest Fragments Project', 'PDBFF',
        'The people behind the longest-running experiment on Amazon forest fragmentation.',
        'Since 1979, north of Manaus, the BDFFP has followed what happens when a forest is cut into pieces. '
        || 'This Node keeps the record of the people who made that science — researchers, students, field assistants, boat pilots, '
        || 'cooks and the institutions they worked through.',
        '#d2ff00', '/photos/aerial', 'pro_bono')
on conflict (slug) do nothing;

insert into public.node_organizations (node_id, organization_id, role)
select n.id, o.id, x.role
  from public.nodes n
  join (values ('BDFFP', 'core'), ('INPA', 'host'), ('STRI', 'partner')) as x(short_name, role) on true
  join public.organizations o on o.short_name = x.short_name and not o.is_demo
 where n.slug = 'pdbff'
on conflict do nothing;
