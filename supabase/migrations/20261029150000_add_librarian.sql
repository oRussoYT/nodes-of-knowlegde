-- The AI librarian (docs/ROTEIRO.md fase 2, etapa K): questions answered
-- only from the record, with numbered sources; summaries and comparisons;
-- help for archivists (what is missing) and for teaching.
--
-- This migration is the retrieval half: given the words of a question, the
-- record's matching people, institutions, works and history items, each as a
-- short factual line with its link. The AI may only cite these. Without AI,
-- the sources themselves are the answer. Members only; same visibility as
-- the pages they come from. Grouped by kind, alphabetical -- never a ranking.

create function public.librarian_sources(p_words text[])
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with w as (
    select distinct public.fold_text(x) as w from unnest(coalesce(p_words, '{}')) x
     where char_length(btrim(x)) >= 3 limit 12
  ),
  ppl as (
    select p.id, p.display_name,
           (select count(*) from w where public.fold_text(p.display_name) like '%' || w.w || '%') as hits
      from public.people p
     where p.verification_status <> 'merged' and auth.uid() is not null
       and not exists (select 1 from public.suggestion_opt_outs o where o.person_id = p.id)
  ),
  orgs as (
    select o.*, (select count(*) from w where public.fold_text(o.name || ' ' || coalesce(o.short_name, '') || ' ' ||
                   coalesce((select string_agg(n.name, ' ') from public.organization_names n where n.organization_id = o.id), ''))
                   like '%' || w.w || '%') as hits
      from public.organizations o where auth.uid() is not null
  ),
  works as (
    select c.*, (select count(*) from w where public.fold_text(c.title || ' ' || coalesce(c.description, '')) like '%' || w.w || '%') as hits
      from public.contributions c where auth.uid() is not null
  ),
  items as (
    select i.*, (select count(*) from w where public.fold_text(i.title || ' ' || coalesce(i.summary, '') || ' ' ||
                   coalesce(i.scientific_name, '') || ' ' || coalesce(i.place, '')) like '%' || w.w || '%') as hits
      from public.heritage_items i
     where i.review_status = 'accepted' and public.can_see_heritage_item(auth.uid(), i)
  ),
  people_lines as (
    select jsonb_build_object('type', 'person', 'id', p.id, 'title', p.display_name, 'url', '/people/' || p.id,
      'text', p.display_name || '. ' || coalesce((
        select string_agg(coalesce(cap.label, pa.capacity) || ' at ' || o.name ||
                 coalesce(' (' || extract(year from pa.start_date)::int ||
                   case when pa.is_ongoing then '–present' when pa.end_date is not null then '–' || extract(year from pa.end_date)::int else '' end || ')', ''),
                 '; ' order by pa.start_date nulls last)
          from (select * from public.participations x where x.person_id = p.id order by x.start_date nulls last limit 8) pa
          join public.organizations o on o.id = pa.organization_id
          left join public.participation_capacities cap on cap.key = pa.capacity), 'No dated periods recorded.')
        || coalesce(' Works: ' || (select string_agg(c.title, '; ') from (select c.title from public.person_contributions pc
                     join public.contributions c on c.id = pc.contribution_id where pc.person_id = p.id limit 5) c), '')
        || coalesce(' Works on: ' || (select string_agg(t.label, ', ') from public.person_topics t where t.person_id = p.id and t.status = 'confirmed'), '')) as j
      from ppl p where p.hits > 0 order by p.display_name limit 10
  ),
  org_lines as (
    select jsonb_build_object('type', 'institution', 'id', o.id, 'title', o.name, 'url', '/institutions/' || o.id,
      'text', o.name || coalesce(' (' || o.short_name || ')', '') || '. ' || coalesce(t.label, o.organization_type) ||
        coalesce('; founded ' || extract(year from o.founding_date)::int, '') || '; status: ' || o.status ||
        coalesce('; ' || o.city, '') || coalesce(', ' || o.country_code, '') ||
        '; people in the record: ' || (select count(distinct pa.person_id) from public.participations pa where pa.organization_id = o.id) ||
        coalesce('; other names: ' || (select string_agg(n.name, ', ') from public.organization_names n where n.organization_id = o.id), '')) as j
      from orgs o left join public.organization_types t on t.key = o.organization_type
     where o.hits > 0 order by o.name limit 10
  ),
  work_lines as (
    select jsonb_build_object('type', 'work', 'id', c.id, 'title', c.title, 'url', '/contributions/' || c.id,
      'text', c.title || '. ' || coalesce(k.label, c.contribution_kind) || coalesce(', ' || extract(year from c.start_date)::int, '') ||
        coalesce('. ' || left(c.description, 300), '') ||
        coalesce('. People: ' || (select string_agg(p.display_name, ', ') from (select p.display_name from public.person_contributions pc
                   join public.people p on p.id = pc.person_id where pc.contribution_id = c.id limit 6) p), '')) as j
      from works c left join public.contribution_kinds k on k.key = c.contribution_kind
     where c.hits > 0 order by c.title limit 10
  ),
  item_lines as (
    select jsonb_build_object('type', 'history', 'id', i.id, 'title', i.title, 'url', '/history/' || i.id,
      'text', i.title || '. ' || k.label || coalesce(' (' || i.scientific_name || ')', '') ||
        coalesce(', ' || i.start_year, '') || coalesce(', ' || i.place, '') || coalesce('. ' || left(i.summary, 300), '') ||
        '. Source: ' || i.source_note) as j
      from items i join public.heritage_kinds k on k.key = i.kind
     where i.hits > 0 order by i.title limit 10
  )
  select coalesce((select jsonb_agg(j) from (select j from people_lines union all select j from org_lines
                                              union all select j from work_lines union all select j from item_lines) x), '[]'::jsonb);
$$;

revoke all on function public.librarian_sources(text[]) from public, anon;
grant execute on function public.librarian_sources(text[]) to authenticated;

-- What an archivist could look for next about one person: gaps in the
-- record, stated plainly (no inference about the person).
create function public.librarian_gaps(p_person_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when auth.uid() is null then null else jsonb_build_object(
    'undatedPeriods', (select count(*) from public.participations where person_id = p_person_id and start_date is null),
    'periods', (select count(*) from public.participations where person_id = p_person_id),
    'works', (select count(*) from public.person_contributions where person_id = p_person_id),
    'bonds', (select count(*) from public.relationships where p_person_id in (source_person_id, target_person_id)),
    'hasOrcid', exists (select 1 from public.person_external_ids where person_id = p_person_id and source = 'orcid'),
    'historyItems', (select count(*) from public.heritage_links where person_id = p_person_id),
    'topics', (select count(*) from public.person_topics where person_id = p_person_id and status = 'confirmed')) end;
$$;

revoke all on function public.librarian_gaps(uuid) from public, anon;
grant execute on function public.librarian_gaps(uuid) to authenticated;
