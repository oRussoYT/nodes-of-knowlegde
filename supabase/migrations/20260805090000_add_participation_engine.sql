-- Milestone M6.3: Participation Engine -- bounded belonging through time.
--
-- The second constitutional primitive to become software (after the Timeline,
-- M6.2). Participation answers, for one entity: WHERE did it belong, in WHAT
-- capacity, during WHAT period, under WHAT evidence, with WHAT verification.
-- It preserves institutional MEMORY, not administrative structure. See
-- docs/decisions/0013-participation-engine.md and
-- docs/m6.3-participation-engine.md.
--
-- Constitutional Clarification CC1 (ratified): Participation is NOT authorship,
-- ownership, provenance, causation, or relationship. It is bounded belonging.
-- A person "joining an institution" may also produce an arrival/appointment
-- EVENT on their timeline (M6.2) -- that projection link is not this; the
-- enduring belonging is the participation recorded here.
--
-- Adds:
--   1. public.participation_capacities -- a data-backed controlled vocabulary
--      of GENERIC capacities (per docs/controlled-vocabularies.md:
--      "vocabularies are data, not code"). Node-specific capacities (e.g. a
--      PDBFF "mateiro") are added as DATA by that Node, never hardcoded here.
--   2. public.organizations -- the minimal belonging-TARGET entity (identity
--      only: name, short_name). This is deliberately NOT the Institution
--      Engine (institution timelines, hierarchy, provenance, an institution
--      read experience are all deferred); it is the smallest durable entity a
--      participation can point at, exactly as person_narrative was the
--      smallest durable narrative foundation in M6.1.
--   3. public.participations -- the bounded-belonging assertion: person +
--      organization + capacity + the SHARED Many-Clocks temporal model
--      (identical to events: precision / approximation / uncertainty / missing
--      + intervals + open-ended) + its own provenance and verification. No
--      uniqueness constraint: a person may hold many participations at one
--      organization -- sequential stints and CONCURRENT appointments are
--      first-class (see CLAUDE.md: "never model participation as a single date
--      range or a single role").
--   4. public.get_person_participation(uuid) -- SECURITY DEFINER read model,
--      separate from get_person_biography/get_person_timeline (composed at the
--      page), same authorization + conservative-visibility discipline
--      (ADR-0008/0009/0011/0012).
--
-- Deferred (reserved, not built): the Institution Engine (organization
-- timelines, hierarchy, enrichment, provenance, a read experience); other
-- entities' participations (organization membership rosters, project teams)
-- via sibling read functions; client participation-editing; the Relationship
-- and Contribution engines.

-- ---------------------------------------------------------------------
-- participation_capacities -- generic controlled vocabulary (data, not code)
-- ---------------------------------------------------------------------

create table public.participation_capacities (
  key text primary key,
  label text not null,
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  constraint participation_capacities_key_not_blank check (btrim(key) <> ''),
  constraint participation_capacities_label_not_blank check (btrim(label) <> '')
);

comment on table public.participation_capacities is
  'Generic, discipline-independent controlled vocabulary of participation '
  'capacities (docs/controlled-vocabularies.md). Node-neutral: a Node adds its '
  'own capacities (e.g. a PDBFF "mateiro") as DATA (a row), never as code. '
  'Deny-by-default like every other table; labels are surfaced only through '
  'get_person_participation (no client GRANT).';

alter table public.participation_capacities enable row level security;
grant select, insert, update, delete on public.participation_capacities to service_role;

-- The founding generic vocabulary. Every role listed in the M6.3 brief maps
-- onto one of these OR is added as Node data: researchers -> researcher;
-- directors -> director; technicians -> technician; field assistants and
-- mateiros -> field_assistant (or a Node-added row); students -> student;
-- community collaborators -> collaborator; volunteers -> volunteer; visiting
-- researchers -> visiting_researcher. "Institutional / temporary / historical /
-- concurrent appointments" are not capacities -- they are properties of the
-- temporal model and of holding MULTIPLE participations, handled below.
insert into public.participation_capacities (key, label, description, sort_order) values
  ('researcher',            'Researcher',             'A researcher.',                                              10),
  ('principal_investigator','Principal investigator', 'A lead investigator of a project or programme.',             20),
  ('director',              'Director',               'A director or head.',                                        30),
  ('coordinator',           'Coordinator',            'A coordinator of a programme, team, or activity.',           40),
  ('technician',            'Technician',             'A technical specialist.',                                    50),
  ('field_assistant',       'Field assistant',        'A field assistant supporting research in the field.',        60),
  ('student',               'Student',                'A student (graduate, undergraduate, or trainee).',           70),
  ('collaborator',          'Collaborator',           'A collaborator, including a community collaborator.',        80),
  ('volunteer',             'Volunteer',              'A volunteer.',                                               90),
  ('visiting_researcher',   'Visiting researcher',    'A researcher visiting on a temporary basis.',               100),
  ('staff',                 'Staff',                  'A member of staff.',                                        110),
  ('intern',                'Intern',                 'An intern.',                                                120),
  ('other',                 'Participant',            'A participant in a capacity not covered by another value.', 900);

-- ---------------------------------------------------------------------
-- organizations -- minimal belonging-target entity (NOT the Institution Engine)
-- ---------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  short_name text,   -- optional shorthand / acronym, when one exists
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint organizations_name_not_blank check (btrim(name) <> '')
);

comment on table public.organizations is
  'The minimal belonging-TARGET entity a participation points at: identity '
  'only (name, short_name). Deliberately NOT the Institution Engine -- '
  'organization timelines, hierarchy, provenance, enrichment, and an '
  'institution read experience are deferred. The smallest durable entity that '
  'makes "where did this person belong?" answerable, Node-neutral (any '
  'institution, station, museum, or university). Deny-by-default; surfaced '
  'only through get_person_participation (no client GRANT).';

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row
  execute function public.set_updated_at();

alter table public.organizations enable row level security;
grant select, insert, update, delete on public.organizations to service_role;

-- ---------------------------------------------------------------------
-- participations -- bounded belonging through time (the assertion)
-- ---------------------------------------------------------------------

create table public.participations (
  id uuid primary key default gen_random_uuid(),

  person_id uuid not null references public.people (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  capacity text not null references public.participation_capacities (key),

  summary text,   -- optional context ("what this belonging was"), never required

  -- The SHARED Many-Clocks temporal model -- identical to public.events, so a
  -- belonging period is dated with the same honesty as a timeline event:
  --   * precision   -> start_precision/end_precision (imprecision)
  --   * approximation -> is_approximate ("circa")
  --   * uncertainty   -> date_is_uncertain (proposed period, not confirmed)
  --   * missing       -> date_is_unknown (belonging known, period unknown)
  -- plus intervals (end_date) and open-ended, still-current belonging
  -- (is_ongoing -> "– present").
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

  constraint participations_start_precision_valid check (
    start_precision is null or start_precision in ('day', 'month', 'year', 'decade')
  ),
  constraint participations_end_precision_valid check (
    end_precision is null or end_precision in ('day', 'month', 'year', 'decade')
  ),
  constraint participations_start_precision_matches_date check (
    (start_date is null) = (start_precision is null)
  ),
  constraint participations_end_precision_matches_date check (
    (end_date is null) = (end_precision is null)
  ),
  -- A participation either has a start date or is explicitly undated -- never
  -- silently dateless. "Unknown period" stays a first-class state.
  constraint participations_unknown_iff_no_start check (
    (start_date is null) = date_is_unknown
  ),
  constraint participations_end_requires_start check (
    end_date is null or start_date is not null
  ),
  constraint participations_end_after_start check (
    end_date is null or end_date >= start_date
  ),
  -- Open-ended (still current) requires a start and no end.
  constraint participations_ongoing_requires_open_start check (
    not is_ongoing or (start_date is not null and end_date is null)
  ),
  -- An undated participation is not also approximate, uncertain, or ongoing
  -- (there is no period for those to qualify).
  constraint participations_unknown_excludes_qualifiers check (
    not date_is_unknown or (not is_approximate and not is_ongoing and not date_is_uncertain)
  ),
  constraint participations_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  ),
  constraint participations_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  )
);

comment on table public.participations is
  'Bounded belonging through time: person + organization + capacity + a dated '
  'period, carrying its own provenance and verification. CC1: NOT authorship, '
  'ownership, provenance, causation, or relationship -- it records that an '
  'entity belonged somewhere, in some capacity, for some period. No uniqueness '
  'constraint: many participations at one organization (sequential AND '
  'concurrent appointments) are first-class. Deny-by-default; read via '
  'get_person_participation.';
comment on column public.participations.is_approximate is
  '"circa" -- the belonging period is approximately dated. Distinct from '
  'date_is_uncertain.';
comment on column public.participations.date_is_uncertain is
  'The proposed belonging period is not confirmed. Distinct from is_approximate '
  '(circa) and from date_is_unknown (no period at all).';
comment on column public.participations.date_is_unknown is
  'The belonging is known but its period is entirely unknown. start_date is '
  'null exactly when this is true.';

create index participations_person_id_idx on public.participations (person_id);
create index participations_organization_id_idx on public.participations (organization_id);
create index participations_capacity_idx on public.participations (capacity);
create index participations_start_date_idx on public.participations (start_date);
create index participations_verification_status_idx on public.participations (verification_status);

create trigger participations_set_updated_at
  before update on public.participations
  for each row
  execute function public.set_updated_at();

alter table public.participations enable row level security;
grant select, insert, update, delete on public.participations to service_role;

-- ---------------------------------------------------------------------
-- get_person_participation -- canonical person-participation read model
-- ---------------------------------------------------------------------
--
-- Separate from get_person_biography/get_person_timeline (not a monolith):
-- composed at the page, so participation can evolve independently and future
-- entity rosters (get_organization_participation, ...) follow the same shape.
-- Same authorization + conservative-visibility discipline as the M6.1/M6.2
-- read models (docs/decisions/0011-.../0012-...): SECURITY DEFINER, search_path
-- pinned, auth.uid() required, EXECUTE to authenticated only, tables stay
-- locked. Returns participations (organization + capacity resolved from their
-- vocabularies, full temporal model + provenance) ordered chronologically,
-- undated last; an empty array for a person with none; null for a nonexistent
-- or merged person. Presentation grouping (by organization) is the client's
-- job (src/features/participation/derive.ts), exactly as timeline decade
-- grouping is -- the read model stays a flat, ordered, testable document.

create function public.get_person_participation(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_participations jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_person_participation: authentication required';
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
        'id', pa.id,
        'organization', jsonb_build_object(
          'id', org.id,
          'name', org.name,
          'short_name', org.short_name
        ),
        'capacity', jsonb_build_object('key', cap.key, 'label', cap.label),
        'summary', pa.summary,
        'temporal', jsonb_build_object(
          'start_date', pa.start_date,
          'start_precision', pa.start_precision,
          'end_date', pa.end_date,
          'end_precision', pa.end_precision,
          'is_approximate', pa.is_approximate,
          'is_ongoing', pa.is_ongoing,
          'date_is_unknown', pa.date_is_unknown,
          'date_is_uncertain', pa.date_is_uncertain
        ),
        'provenance', jsonb_build_object(
          'source_type', pa.source_type,
          'verification_status', pa.verification_status
        )
      )
      order by pa.start_date asc nulls last, pa.created_at asc
    ),
    '[]'::jsonb
  )
  into v_participations
  from public.participations pa
  join public.organizations org on org.id = pa.organization_id
  join public.participation_capacities cap on cap.key = pa.capacity
  where pa.person_id = v_person.id;

  return jsonb_build_object('person_id', v_person.id, 'participations', v_participations);
end;
$$;

comment on function public.get_person_participation(uuid) is
  'Canonical person-participation read model. Returns an authenticated reader a '
  'provenance-bearing, chronologically-ordered set of participations (jsonb) '
  'for one person (organization + capacity resolved, undated last, empty array '
  'when none); null for a nonexistent or merged person. SECURITY DEFINER -- '
  'see the block comment above and docs/decisions/0013-participation-engine.md. '
  'Never grant EXECUTE to anon or PUBLIC.';

revoke all on function public.get_person_participation(uuid) from public;
grant execute on function public.get_person_participation(uuid) to authenticated;
