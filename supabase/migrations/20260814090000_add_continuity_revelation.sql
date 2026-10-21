-- Milestone M8.4: Revelation Engine -- continuity & rupture (C3).
--
-- M8.1/M8.2 revealed CO-PRESENCE; M8.3 revealed LINEAGE (a chain of same-kind
-- directional assertions). M8.4 reveals a THIRD pattern family: whether a
-- documented practice at one institution is SUSTAINED or INTERRUPTED across a
-- long span (M8 Specification Sec.3.4 sequence composition, Sec.3.9). One lens,
-- inline on the institution surface:
--
--   * reveal_organization_continuity(uuid) -- for one institution, the
--     documented COVERAGE of each participation capacity over time (the merged
--     intervals of the dated participation records in that capacity), the
--     SILENCES between those intervals, and the institution's own documented
--     terminal STATUS (from the explicit organizations.status vocabulary) and
--     closure date. It composes a time-ordered series of already-preserved,
--     already-dated participation Assertions per capacity into their entailed
--     coverage, decomposable without remainder back to each participation.
--
-- THE CENTRAL DISCIPLINE OF THIS MILESTONE (M8 Specification Sec.3.9; the M8.4
-- governing brief): CONTINUITY requires EXPLICIT continuation evidence; RUPTURE
-- requires EXPLICIT termination evidence. The two are grounded in DIFFERENT
-- explicit assertions and are NEVER conflated with the mere shape of the record:
--
--   * A capacity whose latest documented interval is OPEN-ENDED (a participation
--     with no end date / is_ongoing) carries explicit CONTINUATION evidence:
--     the record itself says the belonging is still current. (per-practice)
--   * The INSTITUTION carrying a terminal status in the explicit vocabulary
--     (closed / absorbed / succeeded / merged) carries explicit TERMINATION
--     evidence: a documented RUPTURE, with its closure date when recorded.
--     (institution-level; from organizations.status, an explicit assertion)
--   * A silence BETWEEN two documented intervals in a capacity is an
--     EVIDENTIARY GAP -- a break in the record, reported as such and NEVER as a
--     demonstrated end (Spec Sec.3.9: "must not present a gap as a demonstrated
--     end"). (per-practice, per gap)
--   * A capacity whose latest documented interval is CLOSED, with no terminal
--     institution status to speak to it, is an UNKNOWN OUTCOME: the available
--     record does not document what followed. It is NOT "the activity ended".
--     (per-practice)
--
-- This function returns the RAW, decomposable structure only (coverage spans,
-- silences, the explicit status/closure). It computes NO continuity/rupture
-- verdict itself and stores none; the four honest states above are read
-- deterministically from this structure at the surface, and are never collapsed
-- into one another. The institution-level terminal status is NEVER propagated to
-- claim that any particular practice ended on the closure date -- that would be
-- inference. Coverage is summarised by YEAR for the overview; every underlying
-- participation carries its full stored temporal for decomposition.
--
-- Constitutional invariants (M8 Specification Sec.9.1), enforced here:
--   * READ-ONLY: one read function and NOTHING ELSE -- no table, no column, no
--     RLS change, no write path. M8 creates no Assertion.
--   * DETERMINISTIC + BOUNDED: a pure function of the explicit, dated
--     participation records and the explicit status; interval-merge is a
--     finite, inspectable window computation. Ordering is neutral (capacity
--     label, then start year); no metric, no ranking, no "longest run".
--   * DECOMPOSABLE: every coverage span carries the exact participation rows it
--     merges (each its canonical `participations` id + person node + temporal +
--     provenance); a reader can decompose a span into its records.
--   * NEVER FILLS A SILENCE: intervals are merged only where the DATES overlap
--     or touch; a gap is reported as a gap, never bridged, never called an end.
--   * TEMPORALLY HONEST: each participation shows its own stored dates; the
--     coverage extent is the earliest documented start to the latest documented
--     end (or open), never inferred or back-filled.
--   * FAIL-CLOSED SECURITY: SECURITY DEFINER, search_path pinned, auth.uid()
--     required in-body, revoked from PUBLIC, granted to authenticated only.
--     Merged people excluded; nonexistent institution -> null.
--   * INCOMPLETENESS: the coverage shown is the DOCUMENTED one, never the true
--     one -- the reading surface states this plainly, and distinguishes a gap in
--     the record from a demonstrated interruption.
--
-- Deferred (NOT built here): recurrence (C4, M8.5), bounded pathway (C6, M8.6),
-- comparison (C5, enabled earlier, not assigned). No inference, similarity,
-- ranking, centrality, recommendation, probabilistic link, or interpretation.

create function public.reveal_organization_continuity(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org public.organizations%rowtype;
  v_practices jsonb;
begin
  if auth.uid() is null then
    raise exception 'reveal_organization_continuity: authentication required';
  end if;

  if p_organization_id is null then
    return null;
  end if;

  select * into v_org from public.organizations o where o.id = p_organization_id;
  if not found then
    return null;
  end if;

  -- Per-capacity coverage via gaps-and-islands over the DATED participation
  -- records (undated participations are excluded -- an unknown period cannot
  -- speak to coverage). Merged people are excluded (their pages 404). The
  -- overview is by YEAR, so islands are merged at year granularity: a later
  -- record joins the current coverage span when its start year is no more than
  -- one year past the running maximum end year of every earlier record in the
  -- capacity (overlapping OR adjacent years merge -- an interval ending 1975 and
  -- one starting 1976 leave no uncovered year, so they are one span). A start
  -- year two or more years past that maximum opens a NEW span, and the fully
  -- uncovered years between are an evidentiary gap. An open-ended record
  -- (end_date null) has an effective end year of +infinity (a large sentinel),
  -- so it absorbs everything after it into one open span -- which is why an open
  -- span is always the LAST in its capacity, and why continuation is only ever
  -- read from the latest span. Coverage is thus conservative about gaps: only a
  -- whole-year silence is ever shown as one.
  with parts as (
    select
      p.id, p.capacity, p.person_id,
      p.start_date, p.end_date,
      extract(year from p.start_date)::int as start_year,
      case when p.end_date is null then null else extract(year from p.end_date)::int end as end_year,
      case when p.end_date is null then 1000000 else extract(year from p.end_date)::int end as eff_end_year,
      p.start_precision, p.end_precision,
      p.is_approximate, p.is_ongoing, p.date_is_unknown, p.date_is_uncertain,
      p.source_type, p.verification_status
    from public.participations p
    join public.people pe on pe.id = p.person_id
    where p.organization_id = v_org.id
      and p.date_is_unknown = false
      and pe.verification_status <> 'merged'
  ),
  marked as (
    select
      parts.*,
      max(eff_end_year) over (
        partition by capacity
        order by start_year, start_date, id
        rows between unbounded preceding and 1 preceding
      ) as prev_max_end_year
    from parts
  ),
  islands as (
    select
      marked.*,
      sum(case when prev_max_end_year is null or start_year > prev_max_end_year + 1 then 1 else 0 end) over (
        partition by capacity
        order by start_year, start_date, id
        rows between unbounded preceding and current row
      ) as island_id
    from marked
  ),
  proj as (
    select
      i.capacity, i.island_id, i.id, i.start_year, i.start_date, i.end_date, i.end_year,
      jsonb_build_object(
        'person', jsonb_build_object(
          'type', 'person', 'id', fp.id, 'label', fp.display_name,
          'secondary_label', null, 'href', '/people/' || fp.id,
          'verification_status', fp.verification_status
        ),
        'temporal', jsonb_build_object(
          'start_date', i.start_date, 'start_precision', i.start_precision,
          'end_date', i.end_date, 'end_precision', i.end_precision,
          'is_approximate', i.is_approximate, 'is_ongoing', i.is_ongoing,
          'date_is_unknown', i.date_is_unknown, 'date_is_uncertain', i.date_is_uncertain
        ),
        'provenance', jsonb_build_object(
          'source_type', i.source_type, 'verification_status', i.verification_status
        ),
        'source', jsonb_build_object('type', 'participations', 'id', i.id)
      ) as participation
    from islands i
    join public.people fp on fp.id = i.person_id
  ),
  spans as (
    select
      capacity, island_id,
      min(start_year) as span_start_year,
      bool_or(end_date is null) as is_open,
      max(end_year) as span_end_year,
      jsonb_agg(participation order by start_year, start_date, id) as participations
    from proj
    group by capacity, island_id
  ),
  gapped as (
    select
      s.capacity, s.island_id, s.span_start_year, s.is_open, s.span_end_year, s.participations,
      lead(s.span_start_year) over (partition by s.capacity order by s.span_start_year, s.island_id) as next_start_year
    from spans s
  ),
  capacity_agg as (
    select
      g.capacity,
      jsonb_agg(
        jsonb_build_object(
          'start_year', g.span_start_year,
          'end_year', case when g.is_open then null else g.span_end_year end,
          'is_open', g.is_open,
          'participations', g.participations
        ) order by g.span_start_year, g.island_id
      ) as spans,
      coalesce(
        jsonb_agg(
          jsonb_build_object('from_year', g.span_end_year, 'to_year', g.next_start_year)
          order by g.span_start_year
        ) filter (where g.next_start_year is not null and g.is_open = false),
        '[]'::jsonb
      ) as gaps
    from gapped g
    group by g.capacity
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'capacity', jsonb_build_object('key', cap.key, 'label', cap.label),
        'spans', ca.spans,
        'gaps', ca.gaps
      ) order by cap.label asc, cap.key asc
    ),
    '[]'::jsonb
  )
  into v_practices
  from capacity_agg ca
  join public.participation_capacities cap on cap.key = ca.capacity;

  return jsonb_build_object(
    'organization_id', v_org.id,
    'organization', jsonb_build_object(
      'type', 'organization', 'id', v_org.id, 'label', v_org.name,
      'secondary_label', v_org.short_name, 'href', '/institutions/' || v_org.id,
      'verification_status', v_org.verification_status
    ),
    -- The institution's OWN documented status, mapped to a neutral category the
    -- surface reads honestly. 'ended' is the only category that carries explicit
    -- termination evidence (a documented rupture); it is never inferred from the
    -- shape of the participation record, and is never propagated to claim a
    -- particular practice ceased.
    'status', jsonb_build_object(
      'key', v_org.status,
      'status_category', case v_org.status
        when 'active' then 'active'
        when 'historical' then 'historical'
        when 'closed' then 'ended'
        when 'absorbed' then 'ended'
        when 'succeeded' then 'ended'
        when 'merged' then 'ended'
        when 'dormant' then 'paused'
        else 'unknown'  -- provisional, status_unknown
      end
    ),
    -- The documented closure moment (date + precision), when the record carries
    -- one. A point in time, not an interval; null when no closure is recorded.
    'closure', case when v_org.closure_date is null then null else jsonb_build_object(
      'date', v_org.closure_date,
      'precision', v_org.closure_precision
    ) end,
    'practices', v_practices
  );
end;
$$;

comment on function public.reveal_organization_continuity(uuid) is
  'M8.4 Revelation Engine -- continuity & rupture. Returns an authenticated '
  'reader, for one institution, the DOCUMENTED coverage of each participation '
  'capacity over time (merged intervals of the dated participation records, with '
  'the silences between them) and the institution''s own explicit terminal status '
  'and closure date. Deterministic, decomposable, read-only: every coverage span '
  'decomposes to its exact participation rows. Continuity is read only from an '
  'explicit open-ended interval; rupture only from the explicit status vocabulary; '
  'a silence is reported as an evidentiary gap, never as a demonstrated end; a '
  'record that merely stops is an unknown outcome, never an ending. No inference, '
  'no metric, no ranking. Null for a nonexistent institution. SECURITY DEFINER. '
  'Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.reveal_organization_continuity(uuid) from public;
grant execute on function public.reveal_organization_continuity(uuid) to authenticated;
