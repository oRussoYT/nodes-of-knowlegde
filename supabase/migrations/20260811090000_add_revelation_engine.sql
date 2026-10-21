-- Milestone M8.1: Revelation Engine -- co-presence (documented cohorts).
--
-- M1-M6 PRESERVE the record; M7 CONNECTS it (one hop); M8 REVEALS it: it
-- composes several already-preserved, already-connected explicit Assertions into
-- the deterministic patterns their JOINT truth ENTAILS, each decomposable
-- without remainder back to those Assertions. See the M8 Definitive
-- Specification and docs/decisions/0018-revelation-engine.md.
--
-- This first slice implements ONE lens -- co-presence -- on the person: the
-- "documented cohort" a person belonged to at an institution. A cohort is the
-- set of OTHER people whose participation at the SAME organization has a
-- documented period that OVERLAPS one of the focal person's documented periods
-- there. It is the intersection lens (the prosopographer's instrument): the
-- restatement of several participation Assertions, arranged so their coincidence
-- in place and time becomes visible.
--
-- Constitutional invariants (M8 Specification Sec.9.1), enforced here:
--   * READ-ONLY: this migration adds ONE read function and NOTHING ELSE -- no
--     table, no column, no RLS change, no write path. M8 creates no Assertion.
--     (Contrast M7, which added the organization_relationships canonical
--     relation; M8 is a pure derived read layer.)
--   * DETERMINISTIC: a pure function of the participations Assertions; same
--     record -> same cohort, for every reader; ordering is neutral and
--     historical (organization name, then member display_name), never a metric.
--   * DECOMPOSABLE: every member carries the exact canonical `participations`
--     row that establishes the overlap (its `source`), plus that row's full
--     temporal payload and provenance; every cohort carries the focal person's
--     own anchoring participation(s). A reader can always ask "why am I shown
--     this?" and reach the evidence. The revelation is never evidence for
--     itself; provenance points at canonical rows.
--   * ENTAILED, NOT INFERRED: co-presence is shown as a DOCUMENTED co-presence,
--     never promoted to a relationship, collaboration, similarity, or influence.
--     Overlap is a truth-functional comparison of explicit dates, not a guess.
--   * TEMPORALLY HONEST: overlap uses the stored date values; a participation
--     with an unrecorded/open end is treated as open-ended (coalesce to
--     'infinity'), and each member is shown WITH ITS OWN period so the reader
--     sees the actual dates rather than a fabricated single overlap window.
--     Undated participations (date_is_unknown) cannot establish temporal
--     co-presence and are excluded from this lens (an honest limit, not a claim
--     no co-presence exists).
--   * FAIL-CLOSED SECURITY: SECURITY DEFINER, search_path pinned, auth.uid()
--     required in-body, revoked from PUBLIC, granted to authenticated only;
--     underlying tables stay deny-by-default (no table grant). Merged focal ->
--     null; merged members omitted (their pages 404), exactly as M7.
--   * INCOMPLETENESS: the cohort is the DOCUMENTED cohort, never the true one --
--     the reading surface states this plainly (src/features/revelation/copy.ts).
--
-- Deferred (NOT built here, per the M8 Engineering Blueprint -- M8.2+):
-- co-presence on the institution and event surfaces, lineage, continuity/
-- rupture, recurrence, comparison, and bounded pathway. No inference,
-- similarity, ranking, centrality, recommendation, or interpretation anywhere.

-- ---------------------------------------------------------------------
-- reveal_person_cohorts -- co-presence cohorts for one person
-- ---------------------------------------------------------------------

create function public.reveal_person_cohorts(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_cohorts jsonb;
begin
  if auth.uid() is null then
    raise exception 'reveal_person_cohorts: authentication required';
  end if;

  if p_person_id is null then
    return null;
  end if;

  select * into v_person from public.people p where p.id = p_person_id;

  if not found or v_person.verification_status = 'merged' then
    return null;
  end if;

  with
  -- The focal person's DATED participations (undated cannot anchor a temporal
  -- cohort). Each is an explicit Assertion this revelation composes.
  focal_part as (
    select pa.*
    from public.participations pa
    where pa.person_id = v_person.id
      and pa.date_is_unknown = false
  ),
  focal_orgs as (
    select distinct organization_id from focal_part
  ),
  -- Other people's DATED participations at a shared organization whose period
  -- overlaps SOME focal participation at that organization. Overlap is the
  -- standard interval test on the stored dates, with an unrecorded/open end
  -- treated as open-ended (coalesce to 'infinity'). One representative
  -- participation is chosen per (organization, member) deterministically
  -- (earliest start, then id) so a member with several overlapping stints is
  -- shown once, linking onward to that person for the rest.
  member_part as (
    select
      op.organization_id,
      op.person_id as member_person_id,
      op.id as participation_id,
      op.capacity,
      op.start_date, op.start_precision, op.end_date, op.end_precision,
      op.is_approximate, op.is_ongoing, op.date_is_unknown, op.date_is_uncertain,
      op.source_type, op.verification_status,
      row_number() over (
        partition by op.organization_id, op.person_id
        order by op.start_date asc nulls last, op.id asc
      ) as rn
    from public.participations op
    where op.person_id <> v_person.id
      and op.date_is_unknown = false
      and op.organization_id in (select organization_id from focal_orgs)
      and exists (
        select 1
        from focal_part fp
        where fp.organization_id = op.organization_id
          and fp.start_date <= coalesce(op.end_date, 'infinity'::date)
          and op.start_date <= coalesce(fp.end_date, 'infinity'::date)
      )
  ),
  member_rep as (
    select
      mp.*,
      mperson.display_name as member_display_name,
      mperson.verification_status as member_verification_status
    from member_part mp
    join public.people mperson on mperson.id = mp.member_person_id
    where mp.rn = 1
      and mperson.verification_status <> 'merged'
  )
  select coalesce(
    jsonb_agg(cohort.cohort_obj order by cohort.org_name asc, cohort.org_id asc),
    '[]'::jsonb
  )
  into v_cohorts
  from (
    select
      org.id as org_id,
      org.name as org_name,
      jsonb_build_object(
        'organization', jsonb_build_object(
          'type', 'organization',
          'id', org.id,
          'label', org.name,
          'secondary_label', org.short_name,
          'href', '/institutions/' || org.id,
          'verification_status', org.verification_status
        ),
        'focal_participations', (
          select coalesce(
            jsonb_agg(
              jsonb_build_object(
                'id', fp.id,
                'capacity', jsonb_build_object('key', fcap.key, 'label', fcap.label),
                'temporal', jsonb_build_object(
                  'start_date', fp.start_date, 'start_precision', fp.start_precision,
                  'end_date', fp.end_date, 'end_precision', fp.end_precision,
                  'is_approximate', fp.is_approximate, 'is_ongoing', fp.is_ongoing,
                  'date_is_unknown', fp.date_is_unknown, 'date_is_uncertain', fp.date_is_uncertain
                ),
                'provenance', jsonb_build_object(
                  'source_type', fp.source_type, 'verification_status', fp.verification_status
                )
              )
              order by fp.start_date asc nulls last, fp.id asc
            ),
            '[]'::jsonb
          )
          from focal_part fp
          join public.participation_capacities fcap on fcap.key = fp.capacity
          where fp.organization_id = org.id
        ),
        'members', (
          select jsonb_agg(
            jsonb_build_object(
              'person', jsonb_build_object(
                'type', 'person',
                'id', mr.member_person_id,
                'label', mr.member_display_name,
                'secondary_label', null,
                'href', '/people/' || mr.member_person_id,
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
              'source', jsonb_build_object('type', 'participations', 'id', mr.participation_id)
            )
            order by mr.member_display_name asc, mr.member_person_id asc
          )
          from member_rep mr
          join public.participation_capacities mcap on mcap.key = mr.capacity
          where mr.organization_id = org.id
        )
      ) as cohort_obj
    from focal_orgs fo
    join public.organizations org on org.id = fo.organization_id
    where exists (select 1 from member_rep mr where mr.organization_id = fo.organization_id)
  ) cohort;

  return jsonb_build_object('person_id', v_person.id, 'cohorts', v_cohorts);
end;
$$;

comment on function public.reveal_person_cohorts(uuid) is
  'M8.1 Revelation Engine -- co-presence. Returns an authenticated reader the '
  'DOCUMENTED cohorts a person belonged to: for each institution the person is '
  'datedly part of, the other (non-merged) people whose participation there '
  'overlaps the person''s, each carrying its canonical participations source '
  'row, temporal, and provenance. Deterministic, decomposable, read-only; no '
  'inference, no metric, no ranking; co-presence is never promoted to a '
  'relationship. Null for a merged/nonexistent person. SECURITY DEFINER -- see '
  'the migration header and docs/decisions/0018-revelation-engine.md. Never '
  'grant EXECUTE to anon or PUBLIC.';

revoke all on function public.reveal_person_cohorts(uuid) from public;
grant execute on function public.reveal_person_cohorts(uuid) to authenticated;
