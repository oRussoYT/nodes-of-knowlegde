-- Calls and grants (docs/ROTEIRO.md fase 2, etapa J): national and
-- international funding calls matched with a person's or a Node's history.
--
-- Calls are entered by stewards, imported from public sources (Grants.gov)
-- or read from a call's page by AI -- each says where it came from. A match
-- is a SUGGESTION with its reasons (shared themes, eligible country, career
-- stage); it never ranks people and decides nothing.

create table public.funding_calls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  funder text not null,
  url text not null,
  summary text,
  opens_on date,
  closes_on date,
  amount_text text,
  themes text[] not null default '{}',
  theme_keys text[] not null default '{}',
  eligible_countries text[] not null default '{}',
  career_stages text[] not null default '{}',
  scope text not null default 'international',
  source text not null default 'manual',
  external_id text,
  status text not null default 'open',
  added_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint funding_calls_title_len check (char_length(btrim(title)) between 3 and 400),
  constraint funding_calls_funder_len check (char_length(btrim(funder)) between 2 and 200),
  constraint funding_calls_url check (url ~ '^https?://'),
  constraint funding_calls_dates check (closes_on is null or opens_on is null or closes_on >= opens_on),
  constraint funding_calls_scope check (scope in ('national', 'international')),
  constraint funding_calls_source check (source in ('manual', 'grants_gov', 'ai_page')),
  constraint funding_calls_status check (status in ('open', 'closed', 'withdrawn')),
  constraint funding_calls_stages check (career_stages <@ array['student', 'early_career', 'established', 'any']::text[]),
  constraint funding_calls_countries check (cardinality(eligible_countries) <= 250)
);

create unique index funding_calls_external on public.funding_calls (source, external_id) where external_id is not null;

alter table public.funding_calls enable row level security;

create function public.funding_keys(p_themes text[])
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(distinct public.topic_key(t)) filter (where char_length(btrim(t)) >= 2), '{}')
    from unnest(coalesce(p_themes, '{}')) t;
$$;

create function public.save_funding_call(p jsonb)
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
  returning id into v_id;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'create', 'funding_call', v_id, left(btrim(p ->> 'title'), 200), jsonb_build_object('source', p ->> 'source'));
  return v_id;
end;
$$;

revoke all on function public.save_funding_call(jsonb) from public, anon;
grant execute on function public.save_funding_call(jsonb) to authenticated;

create function public.steward_set_funding_call_status(p_id uuid, p_status text)
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
  update public.funding_calls set status = p_status where id = p_id;
  insert into public.audit_logs (actor_user_id, action, subject_type, subject_id, subject_label, metadata)
  values (auth.uid(), 'update', 'funding_call', p_id, 'status', jsonb_build_object('status', p_status));
end;
$$;

revoke all on function public.steward_set_funding_call_status(uuid, text) from public, anon;
grant execute on function public.steward_set_funding_call_status(uuid, text) to authenticated;

create function public.funding_call_json(c public.funding_calls)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object('id', c.id, 'title', c.title, 'funder', c.funder, 'url', c.url, 'summary', c.summary,
    'opensOn', c.opens_on, 'closesOn', c.closes_on, 'amount', c.amount_text, 'themes', to_jsonb(c.themes),
    'eligibleCountries', to_jsonb(c.eligible_countries), 'careerStages', to_jsonb(c.career_stages),
    'scope', c.scope, 'source', c.source, 'status', c.status);
$$;

-- Open calls, soonest deadline first (a calendar, not a ranking).
create function public.list_funding_calls(p_query text default null)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(public.funding_call_json(c) order by c.closes_on nulls last, c.title), '[]'::jsonb)
    from public.funding_calls c
   where auth.uid() is not null and c.status = 'open' and (c.closes_on is null or c.closes_on >= current_date)
     and (p_query is null or btrim(p_query) = ''
          or public.fold_text(c.title || ' ' || c.funder || ' ' || array_to_string(c.themes, ' ')) like '%' || public.fold_text(btrim(p_query)) || '%');
$$;

revoke all on function public.list_funding_calls(text) from public, anon;
grant execute on function public.list_funding_calls(text) to authenticated;

-- Matching for one person: shared themes (with the person's confirmed
-- topics), eligible country (of their latest located institution) and
-- career stage (from their record). Each with the reasons.
create function public.funding_matches_for(p_person_id uuid)
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
     and (p_person_id = public.my_linked_person() or public.is_any_steward(auth.uid()))
     and m.shared is not null
     and (cardinality(m.eligible_countries) = 0 or m.my_country is null or m.my_country = any (m.eligible_countries));
$$;

revoke all on function public.funding_matches_for(uuid) from public, anon;
grant execute on function public.funding_matches_for(uuid) to authenticated;

-- For a Node's stewards: calls that match the confirmed topics of the
-- people of the Node, with how many people share each theme (no names).
create function public.node_funding_matches(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_node uuid;
begin
  if auth.uid() is null or not public.is_any_steward(auth.uid()) then
    raise exception 'node_funding_matches: steward required' using errcode = '42501';
  end if;
  select id into v_node from public.nodes where slug = p_slug;
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

revoke all on function public.node_funding_matches(text) from public, anon;
grant execute on function public.node_funding_matches(text) to authenticated;
