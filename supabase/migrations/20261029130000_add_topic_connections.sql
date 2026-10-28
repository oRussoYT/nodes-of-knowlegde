-- Connections (docs/ROTEIRO.md fase 2, etapa I): people with the same
-- themes, methods, organisms and places -- inside and outside one's own
-- institutions -- always with the reason, never ranked.
--
-- A person's topics come from the person (self-stated, confirmed at once) or
-- are SUGGESTED (by AI from their works, or by OpenAlex/a steward) and wait
-- for the person -- or a steward -- to confirm. Only confirmed topics connect
-- people. People who opted out of suggestions are never offered.

create table public.person_topics (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  kind text not null,
  label text not null,
  topic_key text not null,
  source text not null,
  status text not null default 'proposed',
  reason text,
  created_by_user_id uuid references auth.users (id) on delete set null,
  decided_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint person_topics_kind check (kind in ('theme', 'method', 'organism', 'place')),
  constraint person_topics_source check (source in ('person', 'ai', 'openalex', 'steward')),
  constraint person_topics_status check (status in ('proposed', 'confirmed', 'rejected')),
  constraint person_topics_label_len check (char_length(btrim(label)) between 2 and 120)
);

create unique index person_topics_unique on public.person_topics (person_id, kind, topic_key);
create index person_topics_key_idx on public.person_topics (kind, topic_key) where status = 'confirmed';

alter table public.person_topics enable row level security;

create function public.topic_key(p_label text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select regexp_replace(public.fold_text(btrim(p_label)), '[^a-z0-9]+', ' ', 'g');
$$;

create function public.my_linked_person()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select l.person_id from public.user_person_links l where l.user_id = auth.uid() and l.status = 'active' limit 1;
$$;

revoke all on function public.my_linked_person() from public, anon;
grant execute on function public.my_linked_person() to authenticated;

-- Add topics. The person's own -> confirmed; a steward's or AI's -> proposed.
create function public.add_person_topics(p_person_id uuid, p_topics jsonb, p_source text default 'person')
returns integer
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_self boolean := p_person_id = public.my_linked_person();
  v_t jsonb;
  v_n integer := 0;
  v_kind text;
  v_label text;
begin
  if auth.uid() is null then
    raise exception 'add_person_topics: sign in first' using errcode = '42501';
  end if;
  if not (v_self or public.is_any_steward(auth.uid())) then
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

revoke all on function public.add_person_topics(uuid, jsonb, text) from public, anon;
grant execute on function public.add_person_topics(uuid, jsonb, text) to authenticated;

create function public.decide_person_topic(p_topic_id uuid, p_confirm boolean)
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
     or not (v_t.person_id = public.my_linked_person() or public.is_any_steward(auth.uid())) then
    raise exception 'decide_person_topic: only the person or a steward' using errcode = '42501';
  end if;
  update public.person_topics
     set status = case when p_confirm then 'confirmed' else 'rejected' end, decided_by_user_id = auth.uid()
   where id = p_topic_id;
end;
$$;

revoke all on function public.decide_person_topic(uuid, boolean) from public, anon;
grant execute on function public.decide_person_topic(uuid, boolean) to authenticated;

create function public.remove_person_topic(p_topic_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.person_topics t
   where t.id = p_topic_id
     and (t.person_id = public.my_linked_person() or public.is_any_steward(auth.uid()));
  if not found then
    raise exception 'remove_person_topic: not allowed' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.remove_person_topic(uuid) from public, anon;
grant execute on function public.remove_person_topic(uuid) to authenticated;

create function public.person_topics_json(p_person_id uuid)
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
          or ((t.person_id = public.my_linked_person() or public.is_any_steward(auth.uid())) and t.status = 'proposed'));
$$;

revoke all on function public.person_topics_json(uuid) from public, anon;
grant execute on function public.person_topics_json(uuid) to authenticated;

-- What the AI may read to suggest topics: titles and kinds of the person's
-- works, their institutions, history items linked to them.
create function public.person_topic_material(p_person_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when p_person_id = public.my_linked_person() or public.is_any_steward(auth.uid()) then jsonb_build_object(
    'name', (select display_name from public.people where id = p_person_id),
    'works', coalesce((select jsonb_agg(c.title || coalesce(' — ' || left(c.description, 200), '') order by c.start_date nulls last)
                         from public.person_contributions pc join public.contributions c on c.id = pc.contribution_id
                        where pc.person_id = p_person_id), '[]'::jsonb),
    'institutions', coalesce((select jsonb_agg(distinct o.name) from public.participations pa join public.organizations o on o.id = pa.organization_id
                               where pa.person_id = p_person_id), '[]'::jsonb),
    'history', coalesce((select jsonb_agg(distinct i.title || coalesce(' (' || i.scientific_name || ')', ''))
                          from public.heritage_links l join public.heritage_items i on i.id = l.item_id
                         where l.person_id = p_person_id and i.review_status = 'accepted'), '[]'::jsonb)) end;
$$;

revoke all on function public.person_topic_material(uuid) from public, anon;
grant execute on function public.person_topic_material(uuid) to authenticated;

-- Connections for the signed-in member: by shared confirmed topic, split
-- into people who share an institution with them ("inside") and people who
-- do not ("outside"). Each with the reason. Alphabetical; never a score.
create function public.my_topic_connections()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_me uuid := public.my_linked_person();
begin
  if auth.uid() is null then
    raise exception 'my_topic_connections: sign in first' using errcode = '42501';
  end if;
  if v_me is null then
    return jsonb_build_object('personId', null, 'topics', '[]'::jsonb, 'connections', '[]'::jsonb);
  end if;
  return jsonb_build_object(
    'personId', v_me,
    'topics', public.person_topics_json(v_me),
    'connections', coalesce((
      with mine as (
        select kind, topic_key, label from public.person_topics where person_id = v_me and status = 'confirmed'
      ),
      my_orgs as (select distinct organization_id from public.participations where person_id = v_me),
      matches as (
        select t.person_id, m.kind, m.label
          from public.person_topics t
          join mine m on m.kind = t.kind and m.topic_key = t.topic_key
          join public.people p on p.id = t.person_id and p.verification_status <> 'merged'
         where t.status = 'confirmed' and t.person_id <> v_me
           and not exists (select 1 from public.suggestion_opt_outs o where o.person_id = t.person_id)
           and not exists (select 1 from public.suggestion_dismissals d where d.user_id = auth.uid() and d.person_id = t.person_id)
      ),
      grouped as (
        select m.person_id,
               jsonb_agg(jsonb_build_object('kind', m.kind, 'label', m.label) order by m.kind, m.label) as shared,
               exists (select 1 from public.participations pa where pa.person_id = m.person_id
                        and pa.organization_id in (select organization_id from my_orgs)) as inside
          from matches m group by m.person_id
      )
      select jsonb_agg(jsonb_build_object('personId', p.id, 'displayName', p.display_name, 'shared', g.shared, 'inside', g.inside)
                       order by g.inside desc, p.display_name, p.id)
        from grouped g join public.people p on p.id = g.person_id), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.my_topic_connections() from public, anon;
grant execute on function public.my_topic_connections() to authenticated;
