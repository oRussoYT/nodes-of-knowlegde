-- Security review fixes (28 out 2026), from an independent review of the
-- phase-2 migrations:
--   * evidence files: a steward reads only files of proposals they may decide;
--   * topics: stewards act only on people in their scope, never confirm their
--     own suggestion, and every decision is audited;
--   * AI material for topics never includes items the caller cannot see;
--   * links on history items: proposer only while proposed, audited;
--   * "limit revelations" honoured inside the database, not only on the page;
--   * calls and grants: scoped to the person, the Node or who added the call.

create function public.evidence_file_visible(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and (
    split_part(p_name, '/', 1) = auth.uid()::text
    or exists (select 1 from public.record_candidates c
                where p_name = any (c.evidence_paths)
                  and (public.can_steward_person(auth.uid(), c.about_person_id) or public.is_active_reviewer(auth.uid()))));
$$;
revoke all on function public.evidence_file_visible(text) from public, anon;
grant execute on function public.evidence_file_visible(text) to authenticated;

drop policy evidence_read_own_or_steward on storage.objects;
create policy evidence_read_own_or_steward on storage.objects
  for select to authenticated
  using (bucket_id = 'evidence' and public.evidence_file_visible(name));

create or replace function public.add_person_topics(p_person_id uuid, p_topics jsonb, p_source text default 'person')
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_self boolean := p_person_id is not distinct from public.my_linked_person();
  v_t jsonb;
  v_n integer := 0;
  v_kind text;
  v_label text;
begin
  if auth.uid() is null then
    raise exception 'add_person_topics: sign in first' using errcode = '42501';
  end if;
  if not (v_self or public.can_steward_person(auth.uid(), p_person_id)) then
    raise exception 'add_person_topics: only the person or a steward' using errcode = '42501';
  end if;
  if p_source not in ('person', 'ai', 'openalex', 'steward') or (p_source = 'person' and not v_self) then
    raise exception 'add_person_topics: unknown source' using errcode = '22023';
  end if;
  if jsonb_typeof(p_topics) <> 'array' or jsonb_array_length(p_topics) > 40 then
    raise exception 'add_person_topics: at most 40 topics at once' using errcode = '23514';
  end if;
  for v_t in select value from jsonb_array_elements(p_topics) loop
    v_kind := coalesce(v_t ->> 'kind', 'theme');
    v_label := btrim(coalesce(v_t ->> 'label', ''));
    if char_length(v_label) < 2 or v_kind not in ('theme', 'method', 'organism', 'place') then
      continue;
    end if;
    insert into public.person_topics (person_id, kind, label, topic_key, source, status, reason, created_by_user_id, decided_by_user_id)
    values (p_person_id, v_kind, left(v_label, 120), public.topic_key(v_label), p_source,
            case when p_source = 'person' then 'confirmed' else 'proposed' end,
            left(nullif(btrim(coalesce(v_t ->> 'reason', '')), ''), 300), auth.uid(),
            case when p_source = 'person' then auth.uid() end)
    on conflict (person_id, kind, topic_key) do update
      set status = case when excluded.status = 'confirmed' then 'confirmed' else public.person_topics.status end,
          decided_by_user_id = coalesce(excluded.decided_by_user_id, public.person_topics.decided_by_user_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;

create or replace function public.decide_person_topic(p_topic_id uuid, p_confirm boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_t public.person_topics%rowtype;
begin
  select * into v_t from public.person_topics where id = p_topic_id for update;
  if not found or auth.uid() is null
     or not (v_t.person_id is not distinct from public.my_linked_person() or public.can_steward_person(auth.uid(), v_t.person_id)) then
    raise exception 'decide_person_topic: only the person or a steward' using errcode = '42501';
  end if;
  if v_t.person_id is distinct from public.my_linked_person() and v_t.created_by_user_id = auth.uid() then
    raise exception 'decide_person_topic: someone else decides your own suggestion' using errcode = '42501';
  end if;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), case when p_confirm then 'approve' else 'reject' end, 'person_topic', v_t.person_id, left(v_t.label, 200),
          jsonb_build_object('topic', p_topic_id));
  update public.person_topics
     set status = case when p_confirm then 'confirmed' else 'rejected' end, decided_by_user_id = auth.uid()
   where id = p_topic_id;
end;
$$;

create or replace function public.remove_person_topic(p_topic_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.person_topics t
   where t.id = p_topic_id
     and (t.person_id is not distinct from public.my_linked_person() or (public.can_steward_person(auth.uid(), t.person_id) and t.source <> 'person'));
  if not found then
    raise exception 'remove_person_topic: not allowed' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.person_topics_json(p_person_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'kind', t.kind, 'label', t.label, 'source', t.source,
           'status', t.status, 'reason', t.reason) order by t.kind, t.label), '[]'::jsonb)
    from public.person_topics t
   where t.person_id = p_person_id and auth.uid() is not null
     and (t.status = 'confirmed'
          or ((t.person_id is not distinct from public.my_linked_person() or public.can_steward_person(auth.uid(), t.person_id)) and t.status = 'proposed'))
     and (not public.limits_revelations(p_person_id) or p_person_id is not distinct from public.my_linked_person() or public.is_any_steward(auth.uid()));
$$;

create or replace function public.person_topic_material(p_person_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when p_person_id is not distinct from public.my_linked_person() or public.can_steward_person(auth.uid(), p_person_id) then jsonb_build_object(
    'name', (select display_name from public.people where id = p_person_id),
    'works', coalesce((select jsonb_agg(c.title || coalesce(' — ' || left(c.description, 200), '') order by c.start_date nulls last)
                         from public.person_contributions pc join public.contributions c on c.id = pc.contribution_id
                        where pc.person_id = p_person_id), '[]'::jsonb),
    'institutions', coalesce((select jsonb_agg(distinct o.name) from public.participations pa join public.organizations o on o.id = pa.organization_id
                               where pa.person_id = p_person_id), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(distinct i.title || coalesce(' (' || i.scientific_name || ')', ''))
                          from public.heritage_links l join public.heritage_items i on i.id = l.item_id
                         where l.person_id = p_person_id and i.review_status = 'accepted' and public.can_see_heritage_item(auth.uid(), i)), '[]'::jsonb)) end;
$$;

create or replace function public.link_heritage_item(p_item_id uuid, p jsonb)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_i public.heritage_items%rowtype;
begin
  select * into v_i from public.heritage_items where id = p_item_id;
  if not found or auth.uid() is null
     or not public.can_see_heritage_item(auth.uid(), v_i)
     or not ((v_i.proposed_by_user_id = auth.uid() and v_i.review_status = 'proposed') or public.is_any_steward(auth.uid())) then
    raise exception 'link_heritage_item: not allowed' using errcode = '42501';
  end if;
  insert into public.heritage_links (item_id, person_id, organization_id, other_item_id, role)
  values (p_item_id, nullif(p ->> 'personId', '')::uuid, nullif(p ->> 'organizationId', '')::uuid,
          nullif(p ->> 'itemId', '')::uuid, nullif(btrim(coalesce(p ->> 'role', '')), ''))
  on conflict do nothing;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'heritage_link', p_item_id, left(v_i.title, 200), p);
end;
$$;

create or replace function public.heritage_for(p_person_id uuid default null, p_organization_id uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(x.j || jsonb_build_object('role', x.role) order by x.j ->> 'kind', x.j ->> 'title'), '[]'::jsonb)
    from (select distinct on (i.id) public.heritage_item_json(i, false) as j, l.role
            from public.heritage_items i
            left join public.heritage_links l on l.item_id = i.id
           where i.review_status = 'accepted'
             and public.can_see_heritage_item(auth.uid(), i)
             and (p_person_id is null or not public.limits_revelations(p_person_id)
                  or p_person_id is not distinct from public.my_linked_person() or public.is_any_steward(auth.uid()))
             and ((p_person_id is not null and l.person_id = p_person_id)
                  or (p_organization_id is not null and (l.organization_id = p_organization_id or i.organization_id = p_organization_id)))
           order by i.id) x;
$$;

create or replace function public.funding_matches_for(p_person_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with topics as (
    select topic_key, label from public.person_topics where person_id = p_person_id and status = 'confirmed'
  ),
  country as (
    select o.country_code from public.participations pa join public.organizations o on o.id = pa.organization_id
     where pa.person_id = p_person_id and o.country_code is not null
     order by pa.is_ongoing desc, pa.start_date desc nulls last limit 1
  ),
  stage as (
    select case
      when exists (select 1 from public.participations pa where pa.person_id = p_person_id
                    and pa.capacity in ('principal_investigator', 'director', 'coordinator')) then 'established'
      when exists (select 1 from public.participations pa where pa.person_id = p_person_id
                    and pa.capacity in ('researcher', 'visiting_researcher')) then 'early_career'
      else 'student' end as s
  ),
  m as (
    select c as call, c.eligible_countries, c.career_stages, c.closes_on, c.title,
           (select jsonb_agg(t.label order by t.label) from topics t where t.topic_key = any (c.theme_keys)) as shared,
           (select country_code from country) as my_country,
           (select s from stage) as my_stage
      from public.funding_calls c
     where c.status = 'open' and (c.closes_on is null or c.closes_on >= current_date)
  )
  select coalesce(jsonb_agg(public.funding_call_json(m.call) || jsonb_build_object(
           'reasons', jsonb_build_object(
             'sharedThemes', m.shared,
             'country', case when cardinality(m.eligible_countries) = 0 then 'any'
                             when m.my_country = any (m.eligible_countries) then m.my_country
                             else null end,
             'careerStage', case when cardinality(m.career_stages) = 0 or 'any' = any (m.career_stages) then 'any'
                                 when m.my_stage = any (m.career_stages) then m.my_stage else null end))
           order by m.closes_on nulls last, m.title), '[]'::jsonb)
    from m
   where auth.uid() is not null
     and (p_person_id is not distinct from public.my_linked_person() or public.can_steward_person(auth.uid(), p_person_id))
     and m.shared is not null
     and (cardinality(m.eligible_countries) = 0 or m.my_country is null or m.my_country = any (m.eligible_countries));
$$;

create or replace function public.node_funding_matches(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_node uuid;
begin
  select id into v_node from public.nodes where slug = p_slug;
  if auth.uid() is null or not (public.is_active_reviewer(auth.uid()) or exists (
       select 1 from public.node_organizations no where no.node_id = v_node and public.can_steward_org(auth.uid(), no.organization_id))) then
    raise exception 'node_funding_matches: steward of the Node required' using errcode = '42501';
  end if;
  return (
    with people as (
      select distinct pa.person_id from public.participations pa
       where pa.organization_id in (select organization_id from public.node_organizations where node_id = v_node)
    ),
    topics as (
      select t.topic_key, min(t.label) as label, count(distinct t.person_id) as n
        from public.person_topics t join people p on p.person_id = t.person_id
       where t.status = 'confirmed' group by t.topic_key
    )
    select coalesce(jsonb_agg(public.funding_call_json(c) || jsonb_build_object('reasons', jsonb_build_object(
             'sharedThemes', (select jsonb_agg(jsonb_build_object('label', t.label, 'people', t.n) order by t.label) from topics t where t.topic_key = any (c.theme_keys))))
             order by c.closes_on nulls last, c.title), '[]'::jsonb)
      from public.funding_calls c
     where c.status = 'open' and (c.closes_on is null or c.closes_on >= current_date)
       and exists (select 1 from topics t where t.topic_key = any (c.theme_keys))
  );
end;
$$;

create or replace function public.steward_set_funding_call_status(p_id uuid, p_status text)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_any_steward(auth.uid()) then
    raise exception 'steward_set_funding_call_status: steward required' using errcode = '42501';
  end if;
  update public.funding_calls set status = p_status
   where id = p_id and (added_by_user_id = auth.uid() or public.is_active_reviewer(auth.uid()));
  if not found then
    raise exception 'steward_set_funding_call_status: only who added it or a platform reviewer' using errcode = '42501';
  end if;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'funding_call', p_id, 'status', jsonb_build_object('status', p_status));
end;
$$;

create or replace function public.save_funding_call(p jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
  v_themes text[] := coalesce((select array_agg(left(btrim(x), 120)) from jsonb_array_elements_text(coalesce(p -> 'themes', '[]')) x where btrim(x) <> ''), '{}');
  v_countries text[] := coalesce((select array_agg(distinct upper(btrim(x))) from jsonb_array_elements_text(coalesce(p -> 'eligibleCountries', '[]')) x where btrim(x) ~ '^[A-Za-z]{2}$'), '{}');
  v_stages text[] := coalesce((select array_agg(distinct x) from jsonb_array_elements_text(coalesce(p -> 'careerStages', '[]')) x), '{}');
begin
  if auth.uid() is null or not public.is_any_steward(auth.uid()) then
    raise exception 'save_funding_call: steward required' using errcode = '42501';
  end if;
  insert into public.funding_calls
    (title, funder, url, summary, opens_on, closes_on, amount_text, themes, theme_keys, eligible_countries, career_stages,
     scope, source, external_id, added_by_user_id)
  values (btrim(p ->> 'title'), btrim(p ->> 'funder'), btrim(p ->> 'url'), left(nullif(btrim(coalesce(p ->> 'summary', '')), ''), 4000),
          nullif(p ->> 'opensOn', '')::date, nullif(p ->> 'closesOn', '')::date, left(nullif(btrim(coalesce(p ->> 'amount', '')), ''), 200),
          v_themes, public.funding_keys(v_themes), v_countries, v_stages,
          coalesce(nullif(p ->> 'scope', ''), 'international'), coalesce(nullif(p ->> 'source', ''), 'manual'),
          nullif(p ->> 'externalId', ''), auth.uid())
  on conflict (source, external_id) where external_id is not null do update
    set title = excluded.title, summary = excluded.summary, closes_on = excluded.closes_on, url = excluded.url
    where public.funding_calls.added_by_user_id = auth.uid() or public.is_active_reviewer(auth.uid())
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.funding_calls where source = coalesce(nullif(p ->> 'source', ''), 'manual') and external_id = nullif(p ->> 'externalId', '');
    return v_id;
  end if;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'create', 'funding_call', v_id, left(btrim(p ->> 'title'), 200), jsonb_build_object('source', p ->> 'source'));
  return v_id;
end;
$$;
