-- Milestone M8.5: Revelation Engine -- documented recurrence (C4).
--
-- M8.1/M8.2 revealed CO-PRESENCE; M8.3 revealed LINEAGE; M8.4 revealed
-- CONTINUITY & RUPTURE. M8.5 reveals a fifth pattern family: DOCUMENTED
-- RECURRENCE -- that the historical record itself documents the SAME phenomenon
-- occurring multiple independent times for one focal entity (M8 Specification
-- Sec.3.5 recurrence counting; Sec.4 count-not-metric). Recurrence is NOT
-- similarity: nothing is compared, clustered, embedded, mined, or inferred. Only
-- distinct EXPLICIT assertions of the same structural kind generate a recurrence,
-- and only when there are at least TWO of them. Two lenses, read INLINE:
--
--   * reveal_person_recurrence(uuid) -- for one person, the phenomena documented
--     to have recurred: the same participation ROLE at the same institution
--     (participations grouped by organization + capacity), documented EVENTS of
--     the same kind (person_events -> events grouped by event_kind), and
--     documented CONTRIBUTIONS of the same kind (person_contributions ->
--     contributions grouped by contribution_kind). Each group is shown only when
--     it holds >= 2 distinct documented occurrences.
--
--   * reveal_organization_recurrence(uuid) -- for one institution, the phenomena
--     documented to have recurred: documented EVENTS of the same kind
--     (organization_events -> events) and documented CONTRIBUTIONS of the same
--     kind (organization_contributions -> contributions). Participations are
--     DELIBERATELY EXCLUDED here: per-capacity coverage over time at an
--     institution is M8.4's continuity lens, and reading it a second time as a
--     recurrence count would be a duplicative reading. (Scope clarification,
--     reported not silent.)
--
-- SCOPE DECISION (ratified with the product owner). Spec Sec.3.5 names C4's
-- "recurrence counting" DYADICALLY (the count of distinct contexts in which the
-- same *pair* co-appears). The M8.5 mission defines recurrence as SINGLE-ENTITY
-- repetition ("the same phenomenon occurred multiple independent times"). The
-- product owner ratified the single-entity reading for this milestone; the
-- dyadic co-appearance count remains available as a deferred sibling. Both obey
-- the SAME constitutional discipline (count of distinct explicit assertions,
-- never a metric).
--
-- Constitutional invariants (M8 Specification Sec.9.1), enforced here:
--   * READ-ONLY: two read functions and NOTHING ELSE -- no table, no column, no
--     RLS change, no write path. M8 creates no Assertion.
--   * DETERMINISTIC + BOUNDED: a pure function of the explicit assertions; each
--     recurrence is a GROUP BY over canonical rows with a COUNT. No AI, no
--     similarity, no clustering, no pattern mining, no prediction, no embedding.
--   * COUNT, NEVER METRIC (Spec Sec.4): the count is literally the number of
--     distinct explicit assertions of that structural kind. Groups are ordered
--     NEUTRALLY (category, then label, then a stable key) -- NEVER by count; the
--     count never orders, ranks, weights, or reads as importance or activity.
--   * RECURRENCE REQUIRES >= 2: a single documented occurrence is not a
--     recurrence and yields no group (honest -- "once" is not "repeatedly").
--   * DECOMPOSABLE: every occurrence carries its exact canonical row (its
--     `source`), its own temporal, and its own provenance; a role group carries
--     the institution as a ProjectedNode anchor; an event/contribution
--     occurrence carries the event/contribution as a ProjectedNode. A reader can
--     decompose a count into its individual documented occurrences.
--   * TEMPORALLY HONEST: each occurrence shows its OWN stored dates; nothing is
--     inferred or back-filled. An UNDATED occurrence still counts (the record
--     documents that it happened, only its date is unknown) and is shown last,
--     marked unknown -- unknown periods remain unknown.
--   * FAIL-CLOSED SECURITY: SECURITY DEFINER, search_path pinned, auth.uid()
--     required in-body, revoked from PUBLIC, granted to authenticated only.
--     Merged focal person -> null; nonexistent focal -> null.
--   * INCOMPLETENESS: what is shown is the DOCUMENTED recurrence, never the true
--     one -- the reading surface states this plainly.
--
-- Deferred (NOT built here): bounded pathway (C6, M8.6); comparison (C5, enabled,
-- not assigned); dyadic co-appearance recurrence (Spec Sec.3.5 literal reading).

-- ---------------------------------------------------------------------
-- reveal_person_recurrence -- a person's documented repeated phenomena
-- ---------------------------------------------------------------------

create function public.reveal_person_recurrence(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_groups jsonb;
begin
  if auth.uid() is null then
    raise exception 'reveal_person_recurrence: authentication required';
  end if;

  if p_person_id is null then
    return null;
  end if;

  select * into v_person from public.people p where p.id = p_person_id;
  if not found or v_person.verification_status = 'merged' then
    return null;
  end if;

  with
  -- ROLE recurrence: the SAME capacity at the SAME institution, documented by
  -- >= 2 distinct participation records. Each participation row is one distinct
  -- documented occurrence (sequential or concurrent appointments are first-class).
  role_groups as (
    select
      1 as crank,
      cap.label as sort_label,
      o.name || '|' || o.id::text as sort_key2,
      jsonb_build_object(
        'category', 'role',
        'label', cap.label,
        'anchor', jsonb_build_object(
          'type', 'organization', 'id', o.id, 'label', o.name,
          'secondary_label', o.short_name, 'href', '/institutions/' || o.id,
          'verification_status', o.verification_status
        ),
        'count', count(*),
        'occurrences', jsonb_agg(
          jsonb_build_object(
            'source', jsonb_build_object('type', 'participations', 'id', p.id),
            'node', null,
            'temporal', jsonb_build_object(
              'start_date', p.start_date, 'start_precision', p.start_precision,
              'end_date', p.end_date, 'end_precision', p.end_precision,
              'is_approximate', p.is_approximate, 'is_ongoing', p.is_ongoing,
              'date_is_unknown', p.date_is_unknown, 'date_is_uncertain', p.date_is_uncertain
            ),
            'provenance', jsonb_build_object('source_type', p.source_type, 'verification_status', p.verification_status)
          )
          order by (p.start_date is null), p.start_date asc, p.id asc
        )
      ) as grp
    from public.participations p
    join public.organizations o on o.id = p.organization_id
    join public.participation_capacities cap on cap.key = p.capacity
    where p.person_id = v_person.id
    group by o.id, o.name, o.short_name, o.verification_status, p.capacity, cap.label
    having count(*) >= 2
  ),
  -- EVENT recurrence: documented events of the SAME kind, >= 2 distinct events.
  person_event_rows as (
    select distinct
      e.id, e.event_kind, e.title,
      e.start_date, e.start_precision, e.end_date, e.end_precision,
      e.is_approximate, e.is_ongoing, e.date_is_unknown, e.date_is_uncertain,
      e.source_type, e.verification_status
    from public.person_events pe
    join public.events e on e.id = pe.event_id
    where pe.person_id = v_person.id
  ),
  event_groups as (
    select
      2 as crank,
      ek.label as sort_label,
      r.event_kind as sort_key2,
      jsonb_build_object(
        'category', 'event',
        'label', ek.label,
        'anchor', null,
        'count', count(*),
        'occurrences', jsonb_agg(
          jsonb_build_object(
            'source', jsonb_build_object('type', 'events', 'id', r.id),
            'node', jsonb_build_object(
              'type', 'event', 'id', r.id, 'label', r.title,
              'secondary_label', null, 'href', null,
              'verification_status', r.verification_status
            ),
            'temporal', jsonb_build_object(
              'start_date', r.start_date, 'start_precision', r.start_precision,
              'end_date', r.end_date, 'end_precision', r.end_precision,
              'is_approximate', r.is_approximate, 'is_ongoing', r.is_ongoing,
              'date_is_unknown', r.date_is_unknown, 'date_is_uncertain', r.date_is_uncertain
            ),
            'provenance', jsonb_build_object('source_type', r.source_type, 'verification_status', r.verification_status)
          )
          order by (r.start_date is null), r.start_date asc, r.id asc
        )
      ) as grp
    from person_event_rows r
    join public.event_kinds ek on ek.key = r.event_kind
    group by r.event_kind, ek.label
    having count(*) >= 2
  ),
  -- CONTRIBUTION recurrence: documented contributions of the SAME kind, >= 2.
  person_contrib_rows as (
    select distinct
      c.id, c.contribution_kind, c.title,
      c.start_date, c.start_precision, c.end_date, c.end_precision,
      c.is_approximate, c.is_ongoing, c.date_is_unknown, c.date_is_uncertain,
      c.source_type, c.verification_status
    from public.person_contributions pc
    join public.contributions c on c.id = pc.contribution_id
    where pc.person_id = v_person.id
  ),
  contribution_groups as (
    select
      3 as crank,
      ck.label as sort_label,
      r.contribution_kind as sort_key2,
      jsonb_build_object(
        'category', 'contribution',
        'label', ck.label,
        'anchor', null,
        'count', count(*),
        'occurrences', jsonb_agg(
          jsonb_build_object(
            'source', jsonb_build_object('type', 'contributions', 'id', r.id),
            'node', jsonb_build_object(
              'type', 'contribution', 'id', r.id, 'label', r.title,
              'secondary_label', null, 'href', '/contributions/' || r.id,
              'verification_status', r.verification_status
            ),
            'temporal', jsonb_build_object(
              'start_date', r.start_date, 'start_precision', r.start_precision,
              'end_date', r.end_date, 'end_precision', r.end_precision,
              'is_approximate', r.is_approximate, 'is_ongoing', r.is_ongoing,
              'date_is_unknown', r.date_is_unknown, 'date_is_uncertain', r.date_is_uncertain
            ),
            'provenance', jsonb_build_object('source_type', r.source_type, 'verification_status', r.verification_status)
          )
          order by (r.start_date is null), r.start_date asc, r.id asc
        )
      ) as grp
    from person_contrib_rows r
    join public.contribution_kinds ck on ck.key = r.contribution_kind
    group by r.contribution_kind, ck.label
    having count(*) >= 2
  ),
  all_groups as (
    select crank, sort_label, sort_key2, grp from role_groups
    union all
    select crank, sort_label, sort_key2, grp from event_groups
    union all
    select crank, sort_label, sort_key2, grp from contribution_groups
  )
  select coalesce(
    jsonb_agg(grp order by crank asc, sort_label asc, sort_key2 asc),
    '[]'::jsonb
  )
  into v_groups
  from all_groups;

  return jsonb_build_object(
    'person_id', v_person.id,
    'person', jsonb_build_object(
      'type', 'person', 'id', v_person.id, 'label', v_person.display_name,
      'secondary_label', null, 'href', '/people/' || v_person.id,
      'verification_status', v_person.verification_status
    ),
    'groups', v_groups
  );
end;
$$;

comment on function public.reveal_person_recurrence(uuid) is
  'M8.5 Revelation Engine -- documented recurrence of one person. Returns an '
  'authenticated reader the phenomena the record documents to have RECURRED for '
  'this person: the same role at the same institution, documented events of the '
  'same kind, and documented contributions of the same kind -- each shown only '
  'when >= 2 distinct documented occurrences exist, with a plain count and the '
  'occurrences in time order (undated last). Deterministic, decomposable, '
  'read-only; the count is a count of explicit assertions, never a metric, never '
  'a rank; no similarity, clustering, inference, or prediction. Null for a '
  'merged/nonexistent person. SECURITY DEFINER. Never grant EXECUTE to anon or '
  'PUBLIC.';

revoke all on function public.reveal_person_recurrence(uuid) from public;
grant execute on function public.reveal_person_recurrence(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- reveal_organization_recurrence -- an institution's documented repeated phenomena
-- ---------------------------------------------------------------------

create function public.reveal_organization_recurrence(p_organization_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_org public.organizations%rowtype;
  v_groups jsonb;
begin
  if auth.uid() is null then
    raise exception 'reveal_organization_recurrence: authentication required';
  end if;

  if p_organization_id is null then
    return null;
  end if;

  select * into v_org from public.organizations o where o.id = p_organization_id;
  if not found then
    return null;
  end if;

  with
  -- EVENT recurrence: documented events of the SAME kind, >= 2 distinct events.
  org_event_rows as (
    select distinct
      e.id, e.event_kind, e.title,
      e.start_date, e.start_precision, e.end_date, e.end_precision,
      e.is_approximate, e.is_ongoing, e.date_is_unknown, e.date_is_uncertain,
      e.source_type, e.verification_status
    from public.organization_events oe
    join public.events e on e.id = oe.event_id
    where oe.organization_id = v_org.id
  ),
  event_groups as (
    select
      1 as crank,
      ek.label as sort_label,
      r.event_kind as sort_key2,
      jsonb_build_object(
        'category', 'event',
        'label', ek.label,
        'anchor', null,
        'count', count(*),
        'occurrences', jsonb_agg(
          jsonb_build_object(
            'source', jsonb_build_object('type', 'events', 'id', r.id),
            'node', jsonb_build_object(
              'type', 'event', 'id', r.id, 'label', r.title,
              'secondary_label', null, 'href', null,
              'verification_status', r.verification_status
            ),
            'temporal', jsonb_build_object(
              'start_date', r.start_date, 'start_precision', r.start_precision,
              'end_date', r.end_date, 'end_precision', r.end_precision,
              'is_approximate', r.is_approximate, 'is_ongoing', r.is_ongoing,
              'date_is_unknown', r.date_is_unknown, 'date_is_uncertain', r.date_is_uncertain
            ),
            'provenance', jsonb_build_object('source_type', r.source_type, 'verification_status', r.verification_status)
          )
          order by (r.start_date is null), r.start_date asc, r.id asc
        )
      ) as grp
    from org_event_rows r
    join public.event_kinds ek on ek.key = r.event_kind
    group by r.event_kind, ek.label
    having count(*) >= 2
  ),
  -- CONTRIBUTION recurrence: documented contributions of the SAME kind, >= 2.
  org_contrib_rows as (
    select distinct
      c.id, c.contribution_kind, c.title,
      c.start_date, c.start_precision, c.end_date, c.end_precision,
      c.is_approximate, c.is_ongoing, c.date_is_unknown, c.date_is_uncertain,
      c.source_type, c.verification_status
    from public.organization_contributions oc
    join public.contributions c on c.id = oc.contribution_id
    where oc.organization_id = v_org.id
  ),
  contribution_groups as (
    select
      2 as crank,
      ck.label as sort_label,
      r.contribution_kind as sort_key2,
      jsonb_build_object(
        'category', 'contribution',
        'label', ck.label,
        'anchor', null,
        'count', count(*),
        'occurrences', jsonb_agg(
          jsonb_build_object(
            'source', jsonb_build_object('type', 'contributions', 'id', r.id),
            'node', jsonb_build_object(
              'type', 'contribution', 'id', r.id, 'label', r.title,
              'secondary_label', null, 'href', '/contributions/' || r.id,
              'verification_status', r.verification_status
            ),
            'temporal', jsonb_build_object(
              'start_date', r.start_date, 'start_precision', r.start_precision,
              'end_date', r.end_date, 'end_precision', r.end_precision,
              'is_approximate', r.is_approximate, 'is_ongoing', r.is_ongoing,
              'date_is_unknown', r.date_is_unknown, 'date_is_uncertain', r.date_is_uncertain
            ),
            'provenance', jsonb_build_object('source_type', r.source_type, 'verification_status', r.verification_status)
          )
          order by (r.start_date is null), r.start_date asc, r.id asc
        )
      ) as grp
    from org_contrib_rows r
    join public.contribution_kinds ck on ck.key = r.contribution_kind
    group by r.contribution_kind, ck.label
    having count(*) >= 2
  ),
  all_groups as (
    select crank, sort_label, sort_key2, grp from event_groups
    union all
    select crank, sort_label, sort_key2, grp from contribution_groups
  )
  select coalesce(
    jsonb_agg(grp order by crank asc, sort_label asc, sort_key2 asc),
    '[]'::jsonb
  )
  into v_groups
  from all_groups;

  return jsonb_build_object(
    'organization_id', v_org.id,
    'organization', jsonb_build_object(
      'type', 'organization', 'id', v_org.id, 'label', v_org.name,
      'secondary_label', v_org.short_name, 'href', '/institutions/' || v_org.id,
      'verification_status', v_org.verification_status
    ),
    'groups', v_groups
  );
end;
$$;

comment on function public.reveal_organization_recurrence(uuid) is
  'M8.5 Revelation Engine -- documented recurrence of one institution. Returns an '
  'authenticated reader the phenomena the record documents to have RECURRED for '
  'this institution: documented events of the same kind and documented '
  'contributions of the same kind -- each shown only when >= 2 distinct '
  'documented occurrences exist, with a plain count and the occurrences in time '
  'order (undated last). Participations are excluded (M8.4 continuity reads '
  'per-capacity coverage). Deterministic, decomposable, read-only; the count is a '
  'count of explicit assertions, never a metric, never a rank; no similarity, '
  'clustering, inference, or prediction. Null for a nonexistent institution. '
  'SECURITY DEFINER. Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.reveal_organization_recurrence(uuid) from public;
grant execute on function public.reveal_organization_recurrence(uuid) to authenticated;
