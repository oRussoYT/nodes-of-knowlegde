-- The Observatory (docs/ROTEIRO.md fase 2, etapa H): the numbers of a Node
-- and how they changed -- people active and arriving each year, works by
-- decade, the history kept -- and the diffusion of knowledge: where the people
-- who passed through the Node went next (institutions, kinds, countries).
--
-- Public, like the Node page: aggregate counts only, no names of people.
-- Institutions reached are listed alphabetically, never as a league table.

create function public.node_observatory(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_node public.nodes%rowtype;
  result jsonb;
begin
  select * into v_node from public.nodes where slug = p_slug and status = 'active';
  if not found then
    return null;
  end if;

  with orgs as (
    select organization_id from public.node_organizations where node_id = v_node.id
  ),
  here as (
    select pa.person_id, pa.organization_id,
           extract(year from pa.start_date)::int as y0,
           case when pa.is_ongoing then extract(year from now())::int
                else coalesce(extract(year from pa.end_date)::int, extract(year from pa.start_date)::int) end as y1,
           pa.start_date
      from public.participations pa
      join public.people pe on pe.id = pa.person_id and pe.verification_status <> 'merged' and not pe.is_demo
     where pa.organization_id in (select organization_id from orgs)
       and pa.start_date is not null
  ),
  people as (
    select person_id, min(y0) as first_year, max(start_date) as last_start from here group by person_id
  ),
  span as (
    select min(y0) as y_min, greatest(max(y1), min(y0)) as y_max from here
  ),
  years as (
    select generate_series((select y_min from span), (select y_max from span)) as y
  ),
  after as (
    -- periods elsewhere that began after the person's first period here
    select distinct pa.person_id, pa.organization_id
      from public.participations pa
      join people p on p.person_id = pa.person_id
     where pa.organization_id not in (select organization_id from orgs)
       and pa.start_date is not null
       and extract(year from pa.start_date) >= p.first_year
  ),
  destinations as (
    select a.organization_id, count(distinct a.person_id) as n
      from after a group by a.organization_id
  )
  select jsonb_build_object(
    'node', jsonb_build_object('slug', v_node.slug, 'name', v_node.name, 'shortName', v_node.short_name),
    'totals', jsonb_build_object(
      'people', (select count(*) from people),
      'institutions', (select count(*) from orgs),
      'works', (select count(distinct pc.contribution_id) from public.person_contributions pc where pc.person_id in (select person_id from people)),
      'bonds', (select count(*) from public.relationships r
                 where r.source_person_id in (select person_id from people) or r.target_person_id in (select person_id from people)),
      'historyItems', (select count(*) from public.heritage_items i
                        where i.review_status = 'accepted' and i.visibility = 'members'
                          and (i.organization_id in (select organization_id from orgs)
                               or exists (select 1 from public.heritage_links l where l.item_id = i.id and l.organization_id in (select organization_id from orgs)))),
      'firstYear', (select y_min from span),
      'peopleWhoWentOn', (select count(distinct person_id) from after),
      'institutionsReached', (select count(*) from destinations),
      'countriesReached', (select count(distinct o.country_code) from destinations d join public.organizations o on o.id = d.organization_id where o.country_code is not null)
    ),
    'byYear', coalesce((select jsonb_agg(jsonb_build_object(
        'year', ys.y,
        'active', (select count(distinct h.person_id) from here h where h.y0 <= ys.y and h.y1 >= ys.y),
        'arrived', (select count(*) from people p where p.first_year = ys.y)) order by ys.y)
       from years ys), '[]'::jsonb),
    'worksByDecade', coalesce((select jsonb_agg(jsonb_build_object('decade', d, 'works', n) order by d)
       from (select (extract(year from c.start_date)::int / 10) * 10 as d, count(distinct c.id) as n
               from public.contributions c
               join public.person_contributions pc on pc.contribution_id = c.id
              where pc.person_id in (select person_id from people) and c.start_date is not null
              group by 1) s), '[]'::jsonb),
    'diffusionByKind', coalesce((select jsonb_agg(jsonb_build_object('kind', k, 'label', coalesce(t.label, k), 'institutions', n_orgs, 'people', n_people) order by coalesce(t.label, k))
       from (select o.organization_type as k, count(distinct o.id) as n_orgs, count(distinct a.person_id) as n_people
               from after a join public.organizations o on o.id = a.organization_id group by 1) s
       left join public.organization_types t on t.key = s.k), '[]'::jsonb),
    'diffusionByCountry', coalesce((select jsonb_agg(jsonb_build_object('countryCode', c, 'people', n) order by c)
       from (select o.country_code as c, count(distinct a.person_id) as n
               from after a join public.organizations o on o.id = a.organization_id
              where o.country_code is not null group by 1) s), '[]'::jsonb),
    'institutionsReachedList', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'people', d.n) order by o.name)
       from destinations d join public.organizations o on o.id = d.organization_id), '[]'::jsonb),
    'method', jsonb_build_array(
      'People: everyone the record places at one of the Node''s institutions (demonstration records excluded).',
      'Active in a year: a dated period there that covers that year; arrived: the year of their first period there.',
      'Went on: a later period at an institution outside the Node, as the record documents it.',
      'Counts of records only; nobody is ranked, and the record is incomplete by nature.')
  ) into result;

  return result;
end;
$$;

revoke all on function public.node_observatory(text) from public;
grant execute on function public.node_observatory(text) to anon, authenticated;
