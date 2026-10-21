-- Milestone M8.2: Revelation Engine -- institution-surface co-presence
-- ("documented co-presence at an institution"; the blueprint's C1 "institution
-- generations", named neutrally here per the M8 Specification's structural-naming
-- rule -- Spec Sec.2 flags calling a documented cohort "a generation" as
-- INTERPRETATION, which M8 refuses; so the reader-facing surface says
-- "documented co-presence", never "generation").
--
-- M8.1 revealed, from one PERSON's vantage, the documented cohorts that person
-- belonged to. M8.2 reveals the SAME co-presence relation from the INSTITUTION's
-- vantage: for a focal institution, which of its documented participants the
-- record places there at the same time as which others. It is the exact
-- institution-mirror of reveal_person_cohorts -- the intersection lens (Spec
-- Sec.7.1, the Camp 41 cohort): the restatement of several participation
-- Assertions arranged so their coincidence in place and time becomes visible.
--
-- Constitutional invariants (M8 Specification Sec.9.1), enforced here -- identical
-- to reveal_person_cohorts:
--   * READ-ONLY: adds ONE read function and NOTHING ELSE -- no table, no column,
--     no RLS change, no write path. M8 creates no Assertion.
--   * DETERMINISTIC: a pure function of the participations Assertions; same
--     record -> same result, for every reader; ordering is neutral and historical
--     (participant display_name, then id), never a metric.
--   * NO CLUSTERING / NO WINDOWS: co-presence is the PAIRWISE interval overlap of
--     two participations at the shared institution -- exactly the M8.1 rule. It
--     does NOT compute overlap "windows", maximal cliques, or generational
--     groupings (that would be clustering, which M8 forbids); it reveals, for
--     each participant, the others whose documented period overlaps theirs.
--   * DECOMPOSABLE: every co-present person carries the exact canonical
--     `participations` row establishing the overlap (its `source`), plus temporal
--     and provenance; every anchor carries ALL of their own participations here,
--     so both sides of every overlap are reachable as evidence.
--   * ENTAILED, NOT INFERRED: shown as a DOCUMENTED co-presence, never promoted to
--     a relationship, collaboration, community, school, or influence. Overlap is a
--     truth-functional comparison of explicit dates, not a guess.
--   * TEMPORALLY HONEST: overlap uses stored dates (open end -> 'infinity'); each
--     person is shown WITH THEIR OWN period; undated participations
--     (date_is_unknown) cannot establish temporal co-presence and are excluded (an
--     honest limit, not a claim no co-presence exists).
--   * FAIL-CLOSED SECURITY: SECURITY DEFINER, search_path pinned, auth.uid()
--     required in-body, revoked from PUBLIC, granted to authenticated only.
--     Merged participants omitted (their pages 404), exactly as M7/M8.1. A focal
--     institution that does not exist -> null. (Organizations have no 'merged'
--     verification state -- see the M6.5 organizations check constraint -- so
--     there is no merged-institution case to handle.)
--   * INCOMPLETENESS: the co-presence shown is the DOCUMENTED co-presence, never
--     the true one -- the reading surface states this plainly
--     (src/features/revelation/copy.ts).
--
-- Deferred (NOT built here): event company (C1 on events -- events have no reading
-- surface, and M8 creates no new destination) and comparison (C5 -- its ratified
-- host, the M8.3 lineage juxtaposition, does not yet exist). See the M8.2 engine
-- doc and ADR-0018. No inference, similarity, ranking, centrality, recommendation,
-- clustering, or interpretation anywhere.

-- ---------------------------------------------------------------------
-- reveal_organization_generations -- institution-surface co-presence
-- ---------------------------------------------------------------------

create function public.reveal_organization_generations(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org public.organizations%rowtype;
  v_anchors jsonb;
begin
  if auth.uid() is null then
    raise exception 'reveal_organization_generations: authentication required';
  end if;

  if p_organization_id is null then
    return null;
  end if;

  select * into v_org from public.organizations o where o.id = p_organization_id;

  if not found then
    return null;
  end if;

  with
  -- Dated participations at the focal institution by non-merged people. Each is
  -- an explicit Assertion this revelation composes.
  part as (
    select
      pa.id, pa.person_id, pa.capacity,
      pa.start_date, pa.start_precision, pa.end_date, pa.end_precision,
      pa.is_approximate, pa.is_ongoing, pa.date_is_unknown, pa.date_is_uncertain,
      pa.source_type, pa.verification_status,
      pe.display_name as person_display_name,
      pe.verification_status as person_verification_status
    from public.participations pa
    join public.people pe on pe.id = pa.person_id
    where pa.organization_id = v_org.id
      and pa.date_is_unknown = false
      and pe.verification_status <> 'merged'
  ),
  -- Ordered pairs of DISTINCT people whose periods here overlap. Overlap is the
  -- standard interval test on stored dates, an unrecorded/open end treated as
  -- open-ended (coalesce to 'infinity'). One representative co-present
  -- participation is chosen per (anchor person, co-present person) deterministically
  -- (earliest overlapping start, then id) so a person with several overlapping
  -- stints is shown once, linking onward for the rest.
  pair as (
    select
      a.person_id as anchor_id,
      b.person_id as member_id,
      b.id as member_participation_id,
      b.capacity as member_capacity,
      b.start_date, b.start_precision, b.end_date, b.end_precision,
      b.is_approximate, b.is_ongoing, b.date_is_unknown, b.date_is_uncertain,
      b.source_type, b.verification_status,
      b.person_display_name as member_display_name,
      b.person_verification_status as member_verification_status,
      row_number() over (
        partition by a.person_id, b.person_id
        order by b.start_date asc nulls last, b.id asc
      ) as rn
    from part a
    join part b
      on b.person_id <> a.person_id
     and a.start_date <= coalesce(b.end_date, 'infinity'::date)
     and b.start_date <= coalesce(a.end_date, 'infinity'::date)
  ),
  member_rep as (
    select * from pair where rn = 1
  )
  select coalesce(
    jsonb_agg(
      anchor.anchor_obj
      order by anchor.person_display_name asc, anchor.person_id asc
    ),
    '[]'::jsonb
  )
  into v_anchors
  from (
    select
      ap.person_id,
      ap.person_display_name,
      jsonb_build_object(
        'person', jsonb_build_object(
          'type', 'person',
          'id', ap.person_id,
          'label', ap.person_display_name,
          'secondary_label', null,
          'href', '/people/' || ap.person_id,
          'verification_status', ap.person_verification_status
        ),
        -- ALL of the anchor's own participations here, so both sides of every
        -- overlap are decomposable to evidence.
        'participations', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', p2.id,
                'capacity', jsonb_build_object('key', c2.key, 'label', c2.label),
                'temporal', jsonb_build_object(
                  'start_date', p2.start_date, 'start_precision', p2.start_precision,
                  'end_date', p2.end_date, 'end_precision', p2.end_precision,
                  'is_approximate', p2.is_approximate, 'is_ongoing', p2.is_ongoing,
                  'date_is_unknown', p2.date_is_unknown, 'date_is_uncertain', p2.date_is_uncertain
                ),
                'provenance', jsonb_build_object(
                  'source_type', p2.source_type, 'verification_status', p2.verification_status
                )
              )
              order by p2.start_date asc nulls last, p2.id asc
            ),
            '[]'::jsonb
          )
          from part p2
          join public.participation_capacities c2 on c2.key = p2.capacity
          where p2.person_id = ap.person_id
        ),
        'co_present', (
          select jsonb_agg(
            jsonb_build_object(
              'person', jsonb_build_object(
                'type', 'person',
                'id', mr.member_id,
                'label', mr.member_display_name,
                'secondary_label', null,
                'href', '/people/' || mr.member_id,
                'verification_status', mr.member_verification_status
              ),
              'capacity', jsonb_build_object('key', mcap.key, 'label', mcap.label),
              'temporal', jsonb_build_object(
                'start_date', mr.start_date, 'start_precision', mr.start_precision,
                'end_date', mr.end_date, 'end_precision', mr.end_precision,
                'is_approximate', mr.is_approximate, 'is_ongoing', mr.is_ongoing,
                'date_is_unknown', mr.date_is_unknown, 'date_is_uncertain', mr.date_is_uncertain
              ),
              'provenance', jsonb_build_object(
                'source_type', mr.source_type, 'verification_status', mr.verification_status
              ),
              'source', jsonb_build_object('type', 'participations', 'id', mr.member_participation_id)
            )
            order by mr.member_display_name asc, mr.member_id asc
          )
          from member_rep mr
          join public.participation_capacities mcap on mcap.key = mr.member_capacity
          where mr.anchor_id = ap.person_id
        )
      ) as anchor_obj
    from (select distinct person_id, person_display_name, person_verification_status from part) ap
    where exists (select 1 from member_rep mr where mr.anchor_id = ap.person_id)
  ) anchor;

  return jsonb_build_object(
    'organization_id', v_org.id,
    'organization', jsonb_build_object(
      'type', 'organization',
      'id', v_org.id,
      'label', v_org.name,
      'secondary_label', v_org.short_name,
      'href', '/institutions/' || v_org.id,
      'verification_status', v_org.verification_status
    ),
    'anchors', v_anchors
  );
end;
$$;

comment on function public.reveal_organization_generations(uuid) is
  'M8.2 Revelation Engine -- institution-surface co-presence. Returns an '
  'authenticated reader the DOCUMENTED co-presence within one institution: for '
  'each documented participant, the other (non-merged) people whose participation '
  'there overlaps theirs, each carrying its canonical participations source row, '
  'temporal, and provenance; each anchor carries all of their own participations '
  'here. Deterministic, decomposable, read-only; pairwise overlap only (no '
  'clustering/windows); no inference, no metric, no ranking; co-presence is never '
  'promoted to a relationship. Null for a nonexistent institution. SECURITY '
  'DEFINER -- see the migration header and docs/decisions/0018-revelation-engine.md. '
  'Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.reveal_organization_generations(uuid) from public;
grant execute on function public.reveal_organization_generations(uuid) to authenticated;
