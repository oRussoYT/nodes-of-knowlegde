-- Steward console, backend (docs/ROTEIRO.md, etapa 0 rebuild + base for
-- etapa 5; docs/PRODUTO.md screen 09).
--
-- Rebuilds, in a single migration, the observatory work that existed only on
-- the founder's Mac in August 2026 (counts, distributions, corpus timeline)
-- and adds the "needs a human" lists the console screen calls for.
--
-- Three read-only functions, all with the same boundary as the review queue
-- (list_claims_for_review): SECURITY DEFINER, auth.uid() required, active
-- reviewer required, EXECUTE revoked from PUBLIC and granted to
-- `authenticated` only (anon has no access at all).
--
--   steward_overview()          -- what the record holds, by family and status
--   steward_attention()         -- what needs a human: unattached people,
--                                  undated participations, possible duplicates
--   steward_corpus_timeline()   -- documented participation starts per decade
--
-- Rules honoured (docs/REGRAS.md):
--   * Descriptive only. Counts of records, never scores of people; nothing is
--     ranked -- lists are alphabetical, the timeline is chronological.
--   * Proposed is never confirmed: "possible duplicates" are listed for a
--     human to look at; nothing is merged, changed, or flagged in the data.
--   * No writes. No table grant changes. No RLS change.

-- ---------------------------------------------------------------------------
-- steward_overview()
-- ---------------------------------------------------------------------------
create function public.steward_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'steward_overview: authentication required';
  end if;

  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_overview: reviewer authorization required';
  end if;

  select jsonb_build_object(
    'people', jsonb_build_object(
      'total',    (select count(*) from public.people p where p.verification_status <> 'merged'),
      'merged',   (select count(*) from public.people p where p.verification_status = 'merged'),
      'claimed',  (select count(distinct l.person_id)
                     from public.user_person_links l
                     join public.people p on p.id = l.person_id
                    where l.status = 'active' and p.verification_status <> 'merged'),
      'deceased', (select count(*) from public.people p
                    where p.is_deceased and p.verification_status <> 'merged'),
      'byVerification', coalesce((
        select jsonb_object_agg(s.verification_status, s.n)
          from (select p.verification_status, count(*) as n
                  from public.people p
                 where p.verification_status <> 'merged'
                 group by p.verification_status) s
      ), '{}'::jsonb),
      'bySource', coalesce((
        select jsonb_object_agg(s.source_type, s.n)
          from (select p.source_type, count(*) as n
                  from public.people p
                 where p.verification_status <> 'merged'
                 group by p.source_type) s
      ), '{}'::jsonb)
    ),
    'organizations', jsonb_build_object(
      'total', (select count(*) from public.organizations),
      'byVerification', coalesce((
        select jsonb_object_agg(s.verification_status, s.n)
          from (select o.verification_status, count(*) as n
                  from public.organizations o
                 group by o.verification_status) s
      ), '{}'::jsonb)
    ),
    'participations', jsonb_build_object(
      'total',       (select count(*) from public.participations),
      'undated',     (select count(*) from public.participations x where x.date_is_unknown),
      'approximate', (select count(*) from public.participations x where x.is_approximate),
      'unconfirmed', (select count(*) from public.participations x where x.date_is_uncertain),
      'ongoing',     (select count(*) from public.participations x where x.is_ongoing)
    ),
    'relationships',  jsonb_build_object('total', (select count(*) from public.relationships)),
    'contributions',  jsonb_build_object('total', (select count(*) from public.contributions)),
    'claimsAwaitingReview', (
      select count(*) from public.profile_claims c
       where c.status in ('submitted', 'under_review')
    )
  )
  into result;

  return result;
end;
$$;

comment on function public.steward_overview() is
  'Steward console: what the record holds, by family, verification status '
  'and source. Counts of records only -- never a score of a person. '
  'Reviewer-gated SECURITY DEFINER; never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.steward_overview() from public;
revoke all on function public.steward_overview() from anon;
grant execute on function public.steward_overview() to authenticated;


-- ---------------------------------------------------------------------------
-- steward_attention()
-- ---------------------------------------------------------------------------
-- Each section returns its full count plus up to 50 items, alphabetical, so
-- the console can say "96 possible duplicates" and show the first page
-- without a ranking of any kind.
create function public.steward_attention()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'steward_attention: authentication required';
  end if;

  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_attention: reviewer authorization required';
  end if;

  with
  unattached as (
    select p.id, p.display_name
      from public.people p
     where p.verification_status <> 'merged'
       and not exists (select 1 from public.participations x where x.person_id = p.id)
  ),
  undated as (
    select x.id, x.person_id, p.display_name as person_display_name,
           x.organization_id, o.name as organization_name, x.capacity
      from public.participations x
      join public.people p        on p.id = x.person_id
      join public.organizations o on o.id = x.organization_id
     where x.date_is_unknown
       and p.verification_status <> 'merged'
  ),
  name_keys as (
    select p.id, p.display_name,
           lower(regexp_replace(btrim(p.display_name), '\s+', ' ', 'g')) as name_key
      from public.people p
     where p.verification_status <> 'merged'
  ),
  duplicate_groups as (
    select n.name_key,
           jsonb_agg(jsonb_build_object('id', n.id, 'displayName', n.display_name)
                     order by n.display_name, n.id) as people
      from name_keys n
     group by n.name_key
    having count(*) > 1
  )
  select jsonb_build_object(
    'peopleWithoutParticipation', jsonb_build_object(
      'total', (select count(*) from unattached),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('id', u.id, 'displayName', u.display_name)
                         order by u.display_name, u.id)
          from (select * from unattached order by display_name, id limit 50) u
      ), '[]'::jsonb)
    ),
    'undatedParticipations', jsonb_build_object(
      'total', (select count(*) from undated),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', d.id,
                 'personId', d.person_id,
                 'personDisplayName', d.person_display_name,
                 'organizationId', d.organization_id,
                 'organizationName', d.organization_name,
                 'capacity', d.capacity)
               order by d.person_display_name, d.organization_name, d.id)
          from (select * from undated order by person_display_name, organization_name, id limit 50) d
      ), '[]'::jsonb)
    ),
    'possibleDuplicates', jsonb_build_object(
      'total', (select count(*) from duplicate_groups),
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('nameKey', g.name_key, 'people', g.people)
                         order by g.name_key)
          from (select * from duplicate_groups order by name_key limit 50) g
      ), '[]'::jsonb)
    )
  )
  into result;

  return result;
end;
$$;

comment on function public.steward_attention() is
  'Steward console: records that need a human -- people with no documented '
  'participation, participations with no usable date, and possible duplicate '
  'people (same normalized display name). Lists only; nothing is merged or '
  'changed. Alphabetical, never ranked. Reviewer-gated SECURITY DEFINER; '
  'never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.steward_attention() from public;
revoke all on function public.steward_attention() from anon;
grant execute on function public.steward_attention() to authenticated;


-- ---------------------------------------------------------------------------
-- steward_corpus_timeline()
-- ---------------------------------------------------------------------------
-- How the documented record spreads through time: per decade, how many
-- participations begin in it and how many distinct people have a documented
-- participation beginning in it. Undated participations are not placed in
-- any decade (they are counted in steward_overview().participations.undated).
create function public.steward_corpus_timeline()
returns table (
  decade integer,
  participations_starting bigint,
  people_starting bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'steward_corpus_timeline: authentication required';
  end if;

  if not public.is_active_reviewer(auth.uid()) then
    raise exception 'steward_corpus_timeline: reviewer authorization required';
  end if;

  return query
    select
      (floor(extract(year from x.start_date) / 10) * 10)::integer as decade,
      count(*)::bigint                                             as participations_starting,
      count(distinct x.person_id)::bigint                          as people_starting
    from public.participations x
    join public.people p on p.id = x.person_id
    where x.start_date is not null
      and p.verification_status <> 'merged'
    group by 1
    order by 1;
end;
$$;

comment on function public.steward_corpus_timeline() is
  'Steward console: documented participation starts per decade (and distinct '
  'people starting in it). Chronological, descriptive only. Reviewer-gated '
  'SECURITY DEFINER; never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.steward_corpus_timeline() from public;
revoke all on function public.steward_corpus_timeline() from anon;
grant execute on function public.steward_corpus_timeline() to authenticated;
