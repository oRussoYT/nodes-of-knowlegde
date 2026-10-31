-- The remaining features of the original list (31 Oct 2026):
--   1. a person's record as a CV (printable) and their trajectory on a map;
--   2. "find an advisor": what happened to each mentor's advisees -- never a
--      ranking, alphabetical, with the documented facts;
--   3. each Node's own vocabulary: its names for roles and its fields of
--      study, on top of the common base;
--   4. the Observatory gains time (how long people stayed, by decade), its
--      themes, and the shape of the community (people who bridge Nodes).

-- 1. CV ------------------------------------------------------------------
create function public.person_cv(p_person_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'id', p.id, 'name', p.display_name, 'verificationStatus', p.verification_status,
    'orcid', (select e.external_id from public.person_external_ids e where e.person_id = p.id and e.source = 'orcid' limit 1),
    'topics', coalesce((select jsonb_agg(t.label order by t.label) from public.person_topics t where t.person_id = p.id and t.status = 'confirmed'), '[]'::jsonb),
    'periods', coalesce((select jsonb_agg(jsonb_build_object(
        'organizationId', o.id, 'organization', o.name, 'role', coalesce(c.label, pa.capacity),
        'startYear', extract(year from pa.start_date)::int, 'endYear', extract(year from pa.end_date)::int,
        'ongoing', pa.is_ongoing, 'status', pa.verification_status, 'note', pa.summary,
        'latitude', o.latitude, 'longitude', o.longitude, 'country', o.country_code)
        order by pa.start_date nulls last, o.name)
        from public.participations pa join public.organizations o on o.id = pa.organization_id
        left join public.participation_capacities c on c.key = pa.capacity
       where pa.person_id = p.id), '[]'::jsonb),
    'works', coalesce((select jsonb_agg(jsonb_build_object(
        'id', w.id, 'title', w.title, 'year', extract(year from w.start_date)::int, 'kind', k.label,
        'url', (select s.url from public.external_record_sources s where s.subject_type = 'contribution' and s.subject_id = w.id limit 1))
        order by w.start_date nulls last, w.title)
        from (select distinct c2.* from public.person_contributions pc join public.contributions c2 on c2.id = pc.contribution_id where pc.person_id = p.id) w
        left join public.contribution_kinds k on k.key = w.contribution_kind), '[]'::jsonb),
    'bonds', coalesce((select jsonb_agg(jsonb_build_object('personId', q.id, 'name', q.display_name, 'kind', rk.label) order by q.display_name)
        from public.relationships r
        join public.people q on q.id = case when r.source_person_id = p.id then r.target_person_id else r.source_person_id end
        left join public.relationship_kinds rk on rk.key = r.kind
       where p.id in (r.source_person_id, r.target_person_id)
         and not exists (select 1 from public.relationship_hides h where h.relationship_id = r.id)), '[]'::jsonb)
  ) end
  from public.people p where p.id = p_person_id and p.verification_status <> 'merged';
$$;

revoke all on function public.person_cv(uuid) from public, anon;
grant execute on function public.person_cv(uuid) to authenticated;

-- 2. Find an advisor --------------------------------------------------------
create function public.find_advisors(p_query text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with q as (select public.fold_text(btrim(left(coalesce(p_query, ''), 100))) as q),
  mentors as (
    select r.source_person_id as mentor_id, r.target_person_id as advisee_id,
           extract(year from r.start_date)::int as y
      from public.relationships r
     where r.kind in ('mentorship', 'advising') and r.verification_status <> 'disputed'
       and not exists (select 1 from public.relationship_hides h where h.relationship_id = r.id)
  ),
  candidates as (
    select distinct m.mentor_id from mentors m join public.people p on p.id = m.mentor_id, q
     where auth.uid() is not null and char_length(q.q) >= 2
       and not exists (select 1 from public.suggestion_opt_outs o where o.person_id = m.mentor_id)
       and (public.fold_text(p.display_name) like '%' || q.q || '%'
            or exists (select 1 from public.person_topics t where t.person_id = m.mentor_id and t.status = 'confirmed'
                         and public.fold_text(t.label) like '%' || q.q || '%')
            or exists (select 1 from public.participations pa join public.organizations o on o.id = pa.organization_id
                        where pa.person_id = m.mentor_id
                          and public.fold_text(o.name || ' ' || coalesce(o.short_name, '')) like '%' || q.q || '%'))
     limit 60
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'personId', p.id, 'name', p.display_name,
      'advisees', (select count(distinct m.advisee_id) from mentors m where m.mentor_id = c.mentor_id),
      'years', (select jsonb_build_array(min(m.y), max(m.y)) from mentors m where m.mentor_id = c.mentor_id),
      'topics', coalesce((select jsonb_agg(t.label order by t.label) from public.person_topics t where t.person_id = c.mentor_id and t.status = 'confirmed'), '[]'::jsonb),
      'whereAdviseesWent', coalesce((select jsonb_agg(x.name order by x.name) from (
            select distinct o.name from mentors m
              join public.participations pa on pa.person_id = m.advisee_id
              join public.organizations o on o.id = pa.organization_id
             where m.mentor_id = c.mentor_id
               and (m.y is null or pa.start_date is null or extract(year from pa.start_date) >= m.y)
             limit 12) x), '[]'::jsonb),
      'adviseesWithLaterPeriods', (select count(distinct m.advisee_id) from mentors m
            join public.participations pa on pa.person_id = m.advisee_id
           where m.mentor_id = c.mentor_id and m.y is not null and pa.start_date is not null and extract(year from pa.start_date) > m.y))
      order by p.display_name), '[]'::jsonb)
    from candidates c join public.people p on p.id = c.mentor_id;
$$;

revoke all on function public.find_advisors(text) from public, anon;
grant execute on function public.find_advisors(text) to authenticated;

-- 3. Each Node's vocabulary -----------------------------------------------
create table public.node_vocabulary (
  id uuid primary key default gen_random_uuid(),
  node_id uuid not null references public.nodes (id) on delete cascade,
  kind text not null,
  label text not null,
  base_key text,
  description text,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  constraint node_vocabulary_kind check (kind in ('role', 'field')),
  constraint node_vocabulary_label check (char_length(btrim(label)) between 2 and 120),
  constraint node_vocabulary_role_base check (kind <> 'role' or base_key is not null)
);
create unique index node_vocabulary_unique on public.node_vocabulary (node_id, kind, lower(label));
alter table public.node_vocabulary enable row level security;

create function public.node_vocabulary_for(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', v.id, 'kind', v.kind, 'label', v.label, 'baseKey', v.base_key,
           'baseLabel', c.label, 'description', v.description) order by v.kind, v.sort_order, v.label), '[]'::jsonb)
    from public.node_vocabulary v
    join public.nodes n on n.id = v.node_id and n.slug = p_slug
    left join public.participation_capacities c on c.key = v.base_key;
$$;
revoke all on function public.node_vocabulary_for(text) from public;
grant execute on function public.node_vocabulary_for(text) to anon, authenticated;

create function public.steward_set_node_vocabulary(p_slug text, p jsonb, p_remove uuid default null)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_node uuid;
begin
  select id into v_node from public.nodes where slug = p_slug;
  if v_node is null or auth.uid() is null or not (public.is_active_reviewer(auth.uid()) or exists (
       select 1 from public.node_organizations no where no.node_id = v_node and public.is_community_steward(auth.uid(), no.organization_id))) then
    raise exception 'steward_set_node_vocabulary: steward of the Node required' using errcode = '42501';
  end if;
  if p_remove is not null then
    delete from public.node_vocabulary where id = p_remove and node_id = v_node;
  else
    if p ->> 'kind' = 'role' and not exists (select 1 from public.participation_capacities where key = p ->> 'baseKey') then
      raise exception 'steward_set_node_vocabulary: choose the common role it corresponds to' using errcode = '23514';
    end if;
    insert into public.node_vocabulary (node_id, kind, label, base_key, description)
    values (v_node, p ->> 'kind', btrim(p ->> 'label'), nullif(p ->> 'baseKey', ''), nullif(btrim(coalesce(p ->> 'description', '')), ''))
    on conflict do nothing;
  end if;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), case when p_remove is null then 'create' else 'delete' end, 'node_vocabulary', v_node, p_slug, coalesce(p, '{}'::jsonb));
end;
$$;
revoke all on function public.steward_set_node_vocabulary(text, jsonb, uuid) from public, anon;
grant execute on function public.steward_set_node_vocabulary(text, jsonb, uuid) to authenticated;

-- The PDBFF's own words, as the founder described its people.
insert into public.node_vocabulary (node_id, kind, label, base_key, description, sort_order)
select n.id, x.kind, x.label, x.base, x.descr, x.ord
  from public.nodes n
  join (values
    ('role', 'Mateiro (woodsman)', 'field_assistant', 'Field guide who knew every trail and tree of the reserves.', 10),
    ('role', 'Barqueiro (boat pilot)', 'staff', null, 20),
    ('role', 'Cozinheiro (camp cook)', 'staff', null, 30),
    ('role', 'Field assistant', 'field_assistant', null, 40),
    ('field', 'Forest fragmentation', null, null, 10),
    ('field', 'Understory birds', null, null, 20),
    ('field', 'Bats and mammals', null, null, 30),
    ('field', 'Forest dynamics and pioneer trees', null, null, 40),
    ('field', 'Secondary forest regrowth', null, null, 50)
  ) as x(kind, label, base, descr, ord) on true
 where n.slug = 'pdbff'
on conflict do nothing;

-- 4. Observatory: time, themes, bridges ------------------------------------
create function public.node_observatory_more(p_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with node as (select id from public.nodes where slug = p_slug and status = 'active'),
  orgs as (select organization_id from public.node_organizations where node_id = (select id from node)),
  here as (
    select pa.person_id, extract(year from pa.start_date)::int as y0,
           coalesce(extract(year from pa.end_date)::int, case when pa.is_ongoing then extract(year from now())::int end) as y1
      from public.participations pa
      join public.people pe on pe.id = pa.person_id and pe.verification_status <> 'merged' and not pe.is_demo
     where pa.organization_id in (select organization_id from orgs) and pa.start_date is not null
  ),
  people as (select distinct person_id from here)
  select case when (select id from node) is null then null else jsonb_build_object(
    'stayByDecade', coalesce((select jsonb_agg(jsonb_build_object('decade', d, 'periods', n, 'medianYears', med) order by d) from (
        select (y0 / 10) * 10 as d, count(*) as n,
               percentile_disc(0.5) within group (order by (y1 - y0)) as med
          from here where y1 is not null and y1 >= y0 group by 1) s), '[]'::jsonb),
    'themes', coalesce((select jsonb_agg(jsonb_build_object('label', label, 'people', n) order by label) from (
        select min(t.label) as label, count(distinct t.person_id) as n
          from public.person_topics t join people p on p.person_id = t.person_id
         where t.status = 'confirmed' group by t.topic_key) s), '[]'::jsonb),
    'bridges', coalesce((select jsonb_agg(jsonb_build_object('slug', n2.slug, 'name', coalesce(n2.short_name, n2.name), 'people', x.n) order by n2.name) from (
        select no.node_id, count(distinct pa.person_id) as n
          from public.node_organizations no join public.participations pa on pa.organization_id = no.organization_id
         where no.node_id <> (select id from node) and pa.person_id in (select person_id from people)
         group by no.node_id) x join public.nodes n2 on n2.id = x.node_id), '[]'::jsonb),
    'bondsInside', (select count(*) from public.relationships r
         where r.source_person_id in (select person_id from people) and r.target_person_id in (select person_id from people)),
    'peopleWithBonds', (select count(distinct p.person_id) from people p
         where exists (select 1 from public.relationships r where p.person_id in (r.source_person_id, r.target_person_id))),
    'mentorGenerations', (with recursive g(person_id, depth) as (
            select r.target_person_id, 1 from public.relationships r
             where r.kind in ('mentorship', 'advising') and r.source_person_id in (select person_id from people)
               and r.source_person_id not in (select target_person_id from public.relationships where kind in ('mentorship', 'advising'))
            union
            select r.target_person_id, g.depth + 1 from g join public.relationships r on r.source_person_id = g.person_id
             where r.kind in ('mentorship', 'advising') and g.depth < 10)
          select coalesce(max(depth), 0) from g)
  ) end;
$$;
revoke all on function public.node_observatory_more(text) from public;
grant execute on function public.node_observatory_more(text) to anon, authenticated;
