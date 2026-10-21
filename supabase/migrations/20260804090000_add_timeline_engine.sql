-- Milestone M6.2: Timeline Engine -- the historical spine.
--
-- The first production temporal model for Nodes of Knowledge. Events are
-- standalone historical assertions; person_events projects them onto a
-- person's timeline. This preserves the constitutional Many-Clocks principle:
-- the SAME event can later be projected onto an institution's, project's, or
-- expedition's timeline via sibling association tables (institution_events,
-- project_events, ...) WITHOUT duplication -- events are never owned by one
-- entity. See docs/decisions/0012-timeline-engine.md and
-- docs/m6.2-timeline-engine.md.
--
-- Adds:
--   1. public.event_kinds -- a data-backed controlled vocabulary of GENERIC
--      event kinds (per docs/controlled-vocabularies.md: "vocabularies are
--      data, not code"). Node-specific language (mateiro, camp names, local
--      programmes) belongs in event data (title/summary/place), never in this
--      generic machine vocabulary.
--   2. public.events -- the standalone historical event, with a durable
--      temporal model that keeps FOUR distinct, non-conflated concepts:
--      precision (imprecision), approximation (circa), uncertainty
--      (unconfirmed date), and missing (undated) -- plus intervals and
--      open-ended periods; carries its own provenance + verification.
--   3. public.person_events -- association projecting an event onto a
--      person's timeline (the M6.2 clock). CC1: this is NOT Participation.
--   4. public.get_person_timeline(uuid) -- SECURITY DEFINER read model,
--      separate from get_person_biography (composed at the page), same
--      authorization + conservative-visibility pattern (ADR-0008/0009/0011).
--
-- Deferred (reserved, not built): institution/project/expedition timelines
-- and their association tables; Participation/Relationship/Contribution
-- engines; client event-editing; inference. person_events reserves the
-- extension point for those without building them.

-- ---------------------------------------------------------------------
-- event_kinds -- generic controlled vocabulary (data, not code)
-- ---------------------------------------------------------------------

create table public.event_kinds (
  key text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  constraint event_kinds_key_not_blank check (btrim(key) <> ''),
  constraint event_kinds_label_not_blank check (btrim(label) <> '')
);

comment on table public.event_kinds is
  'Generic, discipline-independent controlled vocabulary of event kinds '
  '(docs/controlled-vocabularies.md). Node-neutral: PDBFF-specific language '
  'lives in event data, never here. Deny-by-default like every other table; '
  'labels are surfaced only through get_person_timeline (no client GRANT).';

alter table public.event_kinds enable row level security;
grant select, insert, update, delete on public.event_kinds to service_role;

-- The founding generic vocabulary. Extensible as data (add rows) without a
-- code change, exactly as controlled-vocabularies.md intends.
insert into public.event_kinds (key, label, description, sort_order) values
  ('appointment',           'Appointment',            'A formal appointment or posting.',                         10),
  ('arrival',               'Arrival',                'An arrival at an institution, station, or place.',         20),
  ('departure',             'Departure',              'A departure from an institution, station, or place.',      30),
  ('fieldwork',             'Fieldwork',              'A period of field research.',                              40),
  ('expedition',            'Expedition',             'An expedition.',                                          50),
  ('project_start',         'Project began',          'The beginning of a research project or programme.',        60),
  ('project_end',           'Project ended',          'The conclusion of a research project or programme.',       70),
  ('publication',           'Publication',            'A published work.',                                       80),
  ('contribution',          'Scientific contribution','A recorded scientific contribution.',                      90),
  ('institutional_milestone','Institutional milestone','A milestone in an institution''s history.',              100),
  ('site_established',      'Site established',       'The establishment of a research site or station.',        110),
  ('interview',             'Interview',              'A recorded interview or oral history.',                   120),
  ('award',                 'Award',                  'An award or honour.',                                     130),
  ('retirement',            'Retirement',             'A retirement from active work.',                          140),
  ('death',                 'Death',                  'A death.',                                                150),
  ('archival_deposit',      'Archival deposit',       'The deposit of materials into an archive.',               160),
  ('observation',           'Historical observation', 'A documented historical observation.',                    170),
  ('other',                 'Event',                  'A curated historical event not covered by another kind.', 900);

-- ---------------------------------------------------------------------
-- events -- standalone historical event + durable temporal model
-- ---------------------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),

  event_kind text not null references public.event_kinds (key),

  title text not null,
  summary text,   -- concise historical context ("why it matters")
  place text,     -- where, when relevant (free text in M6.2; NOT a place entity)

  -- Temporal model. FOUR non-conflated concepts:
  --   * precision  -> start_precision/end_precision (imprecision)
  --   * approximation -> is_approximate ("circa")
  --   * uncertainty   -> date_is_uncertain (proposed date not confirmed)
  --   * missing       -> date_is_unknown (event known, date entirely unknown)
  -- plus intervals (end_date) and open-ended periods (is_ongoing).
  -- A date stored at year precision is 'YYYY-01-01'; at month, 'YYYY-MM-01';
  -- at decade, the decade's first year -- the precision column says how much
  -- of the stored date is meaningful, so imprecision is never lost.
  start_date date,
  start_precision text,
  end_date date,
  end_precision text,
  is_approximate boolean not null default false,
  is_ongoing boolean not null default false,
  date_is_unknown boolean not null default false,
  date_is_uncertain boolean not null default false,

  source_type text not null,
  verification_status text not null default 'provisional',
  created_by_user_id uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint events_title_not_blank check (btrim(title) <> ''),
  constraint events_start_precision_valid check (
    start_precision is null or start_precision in ('day', 'month', 'year', 'decade')
  ),
  constraint events_end_precision_valid check (
    end_precision is null or end_precision in ('day', 'month', 'year', 'decade')
  ),
  -- precision present iff the corresponding date is present.
  constraint events_start_precision_matches_date check (
    (start_date is null) = (start_precision is null)
  ),
  constraint events_end_precision_matches_date check (
    (end_date is null) = (end_precision is null)
  ),
  -- An event either has a start date or is explicitly undated -- never
  -- silently dateless. This is what keeps "missing" a first-class state.
  constraint events_unknown_iff_no_start check (
    (start_date is null) = date_is_unknown
  ),
  -- An end requires a start, and cannot precede it.
  constraint events_end_requires_start check (
    end_date is null or start_date is not null
  ),
  constraint events_end_after_start check (
    end_date is null or end_date >= start_date
  ),
  -- Open-ended requires a start and no end (the end is open because ongoing).
  constraint events_ongoing_requires_open_start check (
    not is_ongoing or (start_date is not null and end_date is null)
  ),
  -- "Undated" is its own state: an undated event is not also approximate,
  -- uncertain, or ongoing (there is no date for those to qualify).
  constraint events_unknown_excludes_qualifiers check (
    not date_is_unknown or (not is_approximate and not is_ongoing and not date_is_uncertain)
  ),
  constraint events_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  ),
  constraint events_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  )
);

comment on table public.events is
  'A standalone historical event -- content that exists because it helps '
  'understand history, never an activity-log/feed entry. Owned by no single '
  'entity: person_events (and future institution_events/project_events) '
  'project the same event onto multiple timelines without duplication '
  '(Many-Clocks). Every event carries provenance + verification; an event '
  'row never implies truth. Deny-by-default; read via get_person_timeline.';
comment on column public.events.start_precision is
  'How much of start_date is meaningful: day | month | year | decade. Keeps '
  'imprecision distinct from approximation, uncertainty, and missing.';
comment on column public.events.is_approximate is
  '"circa" -- the dating is approximate. Distinct from date_is_uncertain.';
comment on column public.events.date_is_uncertain is
  'The proposed date is not confirmed. Distinct from is_approximate (circa) '
  'and from date_is_unknown (no date at all).';
comment on column public.events.date_is_unknown is
  'The event is known but its date is entirely unknown (undated). start_date '
  'is null exactly when this is true.';

create index events_event_kind_idx on public.events (event_kind);
create index events_start_date_idx on public.events (start_date);
create index events_verification_status_idx on public.events (verification_status);

create trigger events_set_updated_at
  before update on public.events
  for each row
  execute function public.set_updated_at();

alter table public.events enable row level security;
grant select, insert, update, delete on public.events to service_role;

-- ---------------------------------------------------------------------
-- person_events -- projects an event onto a person's timeline (the M6.2 clock)
-- ---------------------------------------------------------------------
--
-- CC1: this is a projection link (this event appears on this person's
-- timeline), NOT Participation (bounded belonging over time). A person
-- "joining an institution" may produce an arrival/appointment EVENT here,
-- while the enduring belonging is Participation in M6.3. A future
-- `relation` column (subject / mentioned / ...) is a reserved extension
-- point, deliberately not built now.

create table public.person_events (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  created_at timestamptz not null default now(),

  constraint person_events_unique unique (person_id, event_id)
);

comment on table public.person_events is
  'Projects an event onto a person''s timeline. CC1: a projection link, not '
  'Participation. The same event may also be projected onto other entities '
  'later (institution_events, ...) without duplication. Deny-by-default; '
  'read via get_person_timeline.';

create index person_events_person_id_idx on public.person_events (person_id);
create index person_events_event_id_idx on public.person_events (event_id);

alter table public.person_events enable row level security;
grant select, insert, update, delete on public.person_events to service_role;

-- ---------------------------------------------------------------------
-- get_person_timeline -- canonical person-timeline read model
-- ---------------------------------------------------------------------
--
-- Separate from get_person_biography (not a monolith): composed at the page,
-- so timelines can grow and evolve independently and future entity timelines
-- (get_institution_timeline, ...) follow the same shape. Same authorization
-- + conservative-visibility discipline as get_person_biography
-- (docs/decisions/0011-...): SECURITY DEFINER, search_path pinned, auth.uid()
-- required, EXECUTE to authenticated only, tables stay locked. Returns
-- events (with full temporal model + provenance) ordered chronologically,
-- undated events last; an empty array for a person with no events; null for
-- a nonexistent or merged person. Event dates are curated historical content
-- (deliberately entered), distinct from the raw person date_of_birth/
-- date_of_death fields M6.1 withholds -- this function reads neither of those.

create function public.get_person_timeline(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_events jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_person_timeline: authentication required';
  end if;

  if p_person_id is null then
    return null;
  end if;

  select * into v_person from public.people p where p.id = p_person_id;

  if not found or v_person.verification_status = 'merged' then
    return null;
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', ev.id,
        'kind', jsonb_build_object('key', ek.key, 'label', ek.label),
        'title', ev.title,
        'summary', ev.summary,
        'place', ev.place,
        'temporal', jsonb_build_object(
          'start_date', ev.start_date,
          'start_precision', ev.start_precision,
          'end_date', ev.end_date,
          'end_precision', ev.end_precision,
          'is_approximate', ev.is_approximate,
          'is_ongoing', ev.is_ongoing,
          'date_is_unknown', ev.date_is_unknown,
          'date_is_uncertain', ev.date_is_uncertain
        ),
        'provenance', jsonb_build_object(
          'source_type', ev.source_type,
          'verification_status', ev.verification_status
        )
      )
      order by ev.start_date asc nulls last, ev.created_at asc
    ),
    '[]'::jsonb
  )
  into v_events
  from public.person_events pe
  join public.events ev on ev.id = pe.event_id
  join public.event_kinds ek on ek.key = ev.event_kind
  where pe.person_id = v_person.id;

  return jsonb_build_object('person_id', v_person.id, 'events', v_events);
end;
$$;

comment on function public.get_person_timeline(uuid) is
  'Canonical person-timeline read model. Returns an authenticated reader a '
  'provenance-bearing, chronologically-ordered timeline (jsonb) for one '
  'person (undated events last, empty array when none); null for a '
  'nonexistent or merged person. SECURITY DEFINER -- see the block comment '
  'above and docs/decisions/0012-timeline-engine.md. Never grant EXECUTE to '
  'anon or PUBLIC.';

revoke all on function public.get_person_timeline(uuid) from public;
grant execute on function public.get_person_timeline(uuid) to authenticated;
