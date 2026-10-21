-- ---------------------------------------------------------------------
-- M6 System Exhibition — local development seed
-- ---------------------------------------------------------------------
--
-- Loaded ONLY by `supabase db reset` / `supabase start` against a local
-- Supabase instance (see supabase/config.toml `[db.seed]`,
-- sql_paths = ["./seed.sql", "./seeds/m6_exhibition.sql"]). Never applied
-- to any deployed environment.
--
-- Purpose: give the completed M6 engines a single, richly connected
-- fictional world to inspect from /dev/exhibition (see
-- docs/m6-system-exhibition.md). Every record here is UNMISTAKABLY
-- fictional development material: display names and institution names
-- carry the visible "— Development Exhibition" label, and no real
-- historical person, institution, or claim is represented.
--
-- Design rules honored:
--   * Deterministic UUIDs (fixed e6xxxxxx… namespace) so /dev/exhibition
--     links and the DB showcase test are stable across resets.
--   * Idempotent: every insert is `on conflict (id) do nothing`, so the
--     file is safe to re-run even outside a full reset.
--   * Canonical records are reused, never duplicated for presentation:
--       - one Event (E06 interview) is projected onto a person, an
--         institution, and a contribution timeline;
--       - one Event (E08 ongoing programme) is shared by a person, an
--         institution, and a contribution;
--       - each Participation and Contribution is a single canonical row
--         read from both the person side and the institution side.
--   * No inferred history: affiliation (participation) never fabricates a
--     contribution; every assertion carries its own provenance and
--     verification status; absence, uncertainty, and dispute are seeded
--     explicitly, not implied.
--   * Runs as the privileged reset/superuser role, the supported path for
--     writing deny-by-default tables (people, narratives, …). No RLS,
--     SECURITY DEFINER boundary, or client grant is weakened, and no
--     auth.users account/password is seeded.
--
-- People suffixes (used by symmetric-relationship ordering, source < target):
--   01 Helena Arvoredo · 02 Rafael Campos · 03 Ana Yara
--   04 Samuel Nascimento · 05 Beatriz Salgado

-- ---------------------------------------------------------------------
-- People
--   01 Helena — principal; verified, substantial narrative
--   02 Rafael — short narrative; provisional
--   03 Ana Yara — NO narrative (honest absence); provisional
--   04 Samuel — disputed record; deceased with unknown date
--   05 Beatriz — verified_self; short narrative
-- ---------------------------------------------------------------------
insert into public.people
  (id, given_name, family_name, preferred_name, display_name, is_deceased, date_of_death, verification_status, source_type)
values
  ('e6110000-0000-4000-8000-000000000001', 'Helena', 'Arvoredo', 'Helena',
   'Dr. Helena Arvoredo — Development Exhibition', false, null, 'verified_admin', 'imported_historical'),
  ('e6110000-0000-4000-8000-000000000002', 'Rafael', 'Campos', null,
   'Rafael Campos — Development Exhibition', false, null, 'provisional', 'imported_historical'),
  ('e6110000-0000-4000-8000-000000000003', 'Ana', 'Yara', null,
   'Ana Yara — Development Exhibition', false, null, 'provisional', 'nominated_by_other'),
  ('e6110000-0000-4000-8000-000000000004', 'Samuel', 'Nascimento', null,
   'Samuel Nascimento — Development Exhibition', true, null, 'disputed', 'imported_historical'),
  ('e6110000-0000-4000-8000-000000000005', 'Beatriz', 'Salgado', null,
   'Beatriz Salgado — Development Exhibition', false, null, 'verified_self', 'imported_historical')
on conflict (id) do nothing;

-- person_narrative — Helena (substantial, verified), Rafael (short),
-- Samuel (short, disputed), Beatriz (short, verified_self).
-- Ana Yara deliberately has NO narrative row: the honest-absence state.
insert into public.person_narrative
  (id, person_id, body, source_type, verification_status)
values
  ('e6110a00-0000-4000-8000-000000000001',
   'e6110000-0000-4000-8000-000000000001',
   $md$Helena Arvoredo is a fictional tropical-forest ecologist created for the M6 system exhibition. Across four decades she is documented moving between a field station and a research institute, first as a field assistant and later as the principal investigator of a long-running canopy-phenology programme. Her record is used here to demonstrate a fully connected scientific life: a biography with verified provenance, a timeline spanning exact, approximate, uncertain, open-ended, and unknown dates, repeated institutional affiliations in different capacities, directional and symmetric relationships, and contributions attributed jointly with an institution. Nothing in this account refers to a real person; it exists only to exercise the reading surfaces of the system.$md$,
   'admin_entered', 'verified_admin'),
  ('e6110a00-0000-4000-8000-000000000002',
   'e6110000-0000-4000-8000-000000000002',
   $md$Rafael Campos is a fictional early-career researcher used to show a short, provisional biography that has not yet been verified.$md$,
   'imported_historical', 'provisional'),
  ('e6110a00-0000-4000-8000-000000000004',
   'e6110000-0000-4000-8000-000000000004',
   $md$Samuel Nascimento is a fictional archivist whose record is intentionally marked disputed, so the biography surface can show a contested provenance state.$md$,
   'nominated_by_other', 'disputed'),
  ('e6110a00-0000-4000-8000-000000000005',
   'e6110000-0000-4000-8000-000000000005',
   $md$Beatriz Salgado is a fictional programme director used to show a self-verified short biography.$md$,
   'self_reported', 'verified_self')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Institutions
--   01 Instituto de História da Floresta Amazônica (IHFA) — active,
--      rich: former name, acronym, external id, narrative facets
--   02 Estação Biológica Rio Verde (EBRV) — active field station,
--      approximate/decade founding, a former name (renamed)
--   03 Arquivo de Ecologia Tropical (AET) — closed archive, deliberately
--      incomplete history (introduction only; legacy absent)
-- ---------------------------------------------------------------------
insert into public.organizations
  (id, name, short_name, organization_type, status,
   founding_date, founding_precision, founding_is_approximate,
   closure_date, closure_precision, location, website, source_type, verification_status)
values
  ('e6220000-0000-4000-8000-000000000001',
   'Instituto de História da Floresta Amazônica — Development Exhibition', 'IHFA',
   'research_institute', 'active',
   '1985-01-01', 'year', false,
   null, null, 'Manaus (fictional locale) — Development Exhibition',
   'https://example.invalid/ihfa', 'imported_historical', 'verified_admin'),
  ('e6220000-0000-4000-8000-000000000002',
   'Estação Biológica Rio Verde — Development Exhibition', 'EBRV',
   'field_station', 'active',
   '1970-01-01', 'decade', true,
   null, null, 'Rio Verde basin (fictional locale) — Development Exhibition',
   null, 'imported_historical', 'provisional'),
  ('e6220000-0000-4000-8000-000000000003',
   'Arquivo de Ecologia Tropical — Development Exhibition', 'AET',
   'archive', 'closed',
   '1968-01-01', 'year', false,
   '2008-01-01', 'year', 'Belém (fictional locale) — Development Exhibition',
   null, 'imported_historical', 'provisional')
on conflict (id) do nothing;

-- organization_names — historical (former) name, acronym, alternative/local
insert into public.organization_names
  (id, organization_id, name, name_type, language, start_date, start_precision, end_date, end_precision, source_type, verification_status)
values
  -- IHFA: a former name (renamed 1998) and its acronym
  ('e6220a00-0000-4000-8000-000000000001', 'e6220000-0000-4000-8000-000000000001',
   'Núcleo de Estudos da Floresta — Development Exhibition', 'former', 'pt',
   '1985-01-01', 'year', '1998-01-01', 'year', 'imported_historical', 'verified_admin'),
  ('e6220a00-0000-4000-8000-000000000002', 'e6220000-0000-4000-8000-000000000001',
   'IHFA', 'acronym', 'pt', null, null, null, null, 'imported_historical', 'verified_admin'),
  -- EBRV: a former name (renamed 1990) demonstrating an institution name change
  ('e6220a00-0000-4000-8000-000000000003', 'e6220000-0000-4000-8000-000000000002',
   'Posto de Campo do Rio Verde — Development Exhibition', 'former', 'pt',
   '1970-01-01', 'decade', '1990-01-01', 'year', 'imported_historical', 'provisional'),
  ('e6220a00-0000-4000-8000-000000000004', 'e6220000-0000-4000-8000-000000000002',
   'EBRV', 'acronym', 'pt', null, null, null, null, 'imported_historical', 'provisional'),
  -- AET: acronym only (incomplete record)
  ('e6220a00-0000-4000-8000-000000000005', 'e6220000-0000-4000-8000-000000000003',
   'AET', 'acronym', 'pt', null, null, null, null, 'imported_historical', 'provisional')
on conflict (id) do nothing;

-- organization_external_identifiers — one per scheme example
insert into public.organization_external_identifiers
  (id, organization_id, scheme, identifier_value, url, source_type, verification_status)
values
  ('e6220b00-0000-4000-8000-000000000001', 'e6220000-0000-4000-8000-000000000001',
   'ror', '00exhib00', 'https://example.invalid/ror/00exhib00', 'imported_historical', 'verified_admin'),
  ('e6220b00-0000-4000-8000-000000000002', 'e6220000-0000-4000-8000-000000000002',
   'wikidata', 'Q000000000', 'https://example.invalid/wikidata/Q000000000', 'imported_historical', 'provisional'),
  ('e6220b00-0000-4000-8000-000000000003', 'e6220000-0000-4000-8000-000000000003',
   'archival_authority', 'AET-DEV-0001', null, 'imported_historical', 'provisional')
on conflict (id) do nothing;

-- organization_narrative — IHFA rich (introduction/overview/significance),
-- EBRV introduction only, AET introduction only (legacy intentionally absent)
insert into public.organization_narrative
  (id, organization_id, kind, body, source_type, verification_status)
values
  ('e6220c00-0000-4000-8000-000000000001', 'e6220000-0000-4000-8000-000000000001', 'introduction',
   $md$The Instituto de História da Floresta Amazônica is a fictional research institute used in the exhibition to show a fully populated institution identity: a type, an active status, a founding year, a former name, an acronym, and an external identifier.$md$,
   'admin_entered', 'verified_admin'),
  ('e6220c00-0000-4000-8000-000000000002', 'e6220000-0000-4000-8000-000000000001', 'overview',
   $md$It hosts the long-term canopy-phenology programme that appears elsewhere in this world as a shared event and a jointly attributed contribution.$md$,
   'admin_entered', 'verified_admin'),
  ('e6220c00-0000-4000-8000-000000000003', 'e6220000-0000-4000-8000-000000000001', 'significance',
   $md$Its significance in the exhibition is to demonstrate institution-side projection of participation and contribution without duplicating any canonical record.$md$,
   'admin_entered', 'provisional'),
  ('e6220c00-0000-4000-8000-000000000004', 'e6220000-0000-4000-8000-000000000002', 'introduction',
   $md$The Estação Biológica Rio Verde is a fictional field station used to show an approximate, decade-precision founding and a documented name change.$md$,
   'imported_historical', 'provisional'),
  ('e6220c00-0000-4000-8000-000000000005', 'e6220000-0000-4000-8000-000000000003', 'introduction',
   $md$The Arquivo de Ecologia Tropical is a fictional, now-closed archive. Its history here is intentionally incomplete — only an introduction is recorded — so the institution surface can show an honest reserved/absent state for later facets.$md$,
   'imported_historical', 'provisional')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Events (canonical) — Helena's timeline exercises every temporal state
--   E01 exact day · E02 month · E03 year · E04 decade · E05 approximate
--   E06 uncertain (canonical: person+institution+contribution)
--   E07 interval · E08 ongoing (overlaps E07; canonical triple)
--   E09 unknown date
--   E10–E13 institution-timeline events
-- ---------------------------------------------------------------------
insert into public.events
  (id, event_kind, title, summary, place, start_date, start_precision, end_date, end_precision,
   is_approximate, is_ongoing, date_is_unknown, date_is_uncertain, source_type, verification_status)
values
  ('e6330000-0000-4000-8000-000000000001', 'appointment',
   'Appointed to lead the canopy-ecology programme', 'Exact-date event (day precision).',
   'Manaus (fictional)', '1996-03-14', 'day', null, null,
   false, false, false, false, 'admin_entered', 'verified_admin'),
  ('e6330000-0000-4000-8000-000000000002', 'fieldwork',
   'First systematic canopy survey', 'Month-precision event.',
   'Rio Verde basin (fictional)', '1997-06-01', 'month', null, null,
   false, false, false, false, 'imported_historical', 'provisional'),
  ('e6330000-0000-4000-8000-000000000003', 'publication',
   'Monograph on flooded-forest succession', 'Year-precision event; also a contribution timeline.',
   null, '1999-01-01', 'year', null, null,
   false, false, false, false, 'admin_entered', 'verified_admin'),
  ('e6330000-0000-4000-8000-000000000004', 'observation',
   'Early informal canopy observations', 'Decade-precision event.',
   null, '1980-01-01', 'decade', null, null,
   false, false, false, false, 'imported_historical', 'provisional'),
  ('e6330000-0000-4000-8000-000000000005', 'expedition',
   'Expedition to the upper tributaries', 'Approximate date.',
   'Upper tributaries (fictional)', '1992-01-01', 'year', null, null,
   true, false, false, false, 'imported_historical', 'provisional'),
  ('e6330000-0000-4000-8000-000000000006', 'interview',
   'Oral-history interview on field techniques',
   'Uncertain date. Canonical event reused on a person, an institution, and a contribution timeline.',
   'Belém (fictional)', '2001-01-01', 'year', null, null,
   false, false, false, true, 'nominated_by_other', 'provisional'),
  ('e6330000-0000-4000-8000-000000000007', 'fieldwork',
   'Long-term monitoring transect run', 'Closed interval (start and end).',
   'Rio Verde basin (fictional)', '2005-01-01', 'year', '2015-12-31', 'year',
   false, false, false, false, 'admin_entered', 'verified_admin'),
  ('e6330000-0000-4000-8000-000000000008', 'project_start',
   'Continuous canopy-phenology programme', 'Ongoing / open-ended; overlaps the monitoring interval. Canonical triple.',
   'Manaus (fictional)', '2010-01-01', 'year', null, null,
   false, true, false, false, 'admin_entered', 'verified_admin'),
  ('e6330000-0000-4000-8000-000000000009', 'archival_deposit',
   'Field notebooks deposited; date not recorded', 'Unknown date (honest gap).',
   null, null, null, null, null,
   false, false, true, false, 'imported_historical', 'provisional'),
  ('e6330000-0000-4000-8000-000000000010', 'site_established',
   'Field station established', 'Approximate, decade-precision institutional event.',
   'Rio Verde basin (fictional)', '1970-01-01', 'decade', null, null,
   true, false, false, false, 'imported_historical', 'provisional'),
  ('e6330000-0000-4000-8000-000000000011', 'institutional_milestone',
   'Institute formally founded', 'Institution founding event.',
   'Manaus (fictional)', '1985-01-01', 'year', null, null,
   false, false, false, false, 'admin_entered', 'verified_admin'),
  ('e6330000-0000-4000-8000-000000000012', 'institutional_milestone',
   'Field station renamed', 'Name-change milestone.',
   null, '1990-01-01', 'year', null, null,
   false, false, false, false, 'imported_historical', 'provisional'),
  ('e6330000-0000-4000-8000-000000000013', 'other',
   'Archive closed to new deposits', 'Closure milestone.',
   'Belém (fictional)', '2008-01-01', 'year', null, null,
   false, false, false, false, 'imported_historical', 'provisional')
on conflict (id) do nothing;

-- person_events — Helena's full-spectrum timeline; Rafael one shared event
insert into public.person_events (id, person_id, event_id) values
  ('e6330a00-0000-4000-8000-000000000001', 'e6110000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000001'),
  ('e6330a00-0000-4000-8000-000000000002', 'e6110000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000002'),
  ('e6330a00-0000-4000-8000-000000000003', 'e6110000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000003'),
  ('e6330a00-0000-4000-8000-000000000004', 'e6110000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000004'),
  ('e6330a00-0000-4000-8000-000000000005', 'e6110000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000005'),
  ('e6330a00-0000-4000-8000-000000000006', 'e6110000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000006'),
  ('e6330a00-0000-4000-8000-000000000007', 'e6110000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000007'),
  ('e6330a00-0000-4000-8000-000000000008', 'e6110000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000008'),
  ('e6330a00-0000-4000-8000-000000000009', 'e6110000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000009'),
  ('e6330a00-0000-4000-8000-000000000010', 'e6110000-0000-4000-8000-000000000002', 'e6330000-0000-4000-8000-000000000003')
on conflict (id) do nothing;

-- organization_events — institution timelines (E06/E08 canonical reuse)
insert into public.organization_events (id, organization_id, event_id) values
  ('e6330b00-0000-4000-8000-000000000001', 'e6220000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000011'),
  ('e6330b00-0000-4000-8000-000000000002', 'e6220000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000001'),
  ('e6330b00-0000-4000-8000-000000000003', 'e6220000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000003'),
  ('e6330b00-0000-4000-8000-000000000004', 'e6220000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000007'),
  ('e6330b00-0000-4000-8000-000000000005', 'e6220000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000008'),
  ('e6330b00-0000-4000-8000-000000000006', 'e6220000-0000-4000-8000-000000000002', 'e6330000-0000-4000-8000-000000000010'),
  ('e6330b00-0000-4000-8000-000000000007', 'e6220000-0000-4000-8000-000000000002', 'e6330000-0000-4000-8000-000000000012'),
  ('e6330b00-0000-4000-8000-000000000008', 'e6220000-0000-4000-8000-000000000003', 'e6330000-0000-4000-8000-000000000006'),
  ('e6330b00-0000-4000-8000-000000000009', 'e6220000-0000-4000-8000-000000000003', 'e6330000-0000-4000-8000-000000000009'),
  ('e6330b00-0000-4000-8000-000000000010', 'e6220000-0000-4000-8000-000000000003', 'e6330000-0000-4000-8000-000000000013')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Participations (canonical; projected from both person and institution)
--   Repeated periods (Helena@EBRV twice, Rafael@IHFA twice), ongoing,
--   approximate, and uncertain periods, in several capacities.
-- ---------------------------------------------------------------------
insert into public.participations
  (id, person_id, organization_id, capacity, summary,
   start_date, start_precision, end_date, end_precision,
   is_approximate, is_ongoing, date_is_unknown, date_is_uncertain, source_type, verification_status)
values
  -- Helena @ IHFA, principal investigator, ongoing
  ('e6440000-0000-4000-8000-000000000001', 'e6110000-0000-4000-8000-000000000001', 'e6220000-0000-4000-8000-000000000001',
   'principal_investigator', 'Leads the canopy-phenology programme.',
   '1996-01-01', 'year', null, null, false, true, false, false, 'admin_entered', 'verified_admin'),
  -- Helena @ EBRV, field assistant, early closed interval
  ('e6440000-0000-4000-8000-000000000002', 'e6110000-0000-4000-8000-000000000001', 'e6220000-0000-4000-8000-000000000002',
   'field_assistant', 'Earliest recorded affiliation.',
   '1985-01-01', 'year', '1988-12-31', 'year', false, false, false, false, 'imported_historical', 'provisional'),
  -- Helena @ EBRV again, visiting researcher, approximate period (repeated institution)
  ('e6440000-0000-4000-8000-000000000003', 'e6110000-0000-4000-8000-000000000001', 'e6220000-0000-4000-8000-000000000002',
   'visiting_researcher', 'A second, later period at the same field station.',
   '1990-01-01', 'year', '1994-12-31', 'year', true, false, false, false, 'imported_historical', 'provisional'),
  -- Rafael @ IHFA, student, then researcher (repeated institution)
  ('e6440000-0000-4000-8000-000000000004', 'e6110000-0000-4000-8000-000000000002', 'e6220000-0000-4000-8000-000000000001',
   'student', 'Doctoral student period.',
   '2008-01-01', 'year', '2012-12-31', 'year', false, false, false, false, 'imported_historical', 'provisional'),
  ('e6440000-0000-4000-8000-000000000005', 'e6110000-0000-4000-8000-000000000002', 'e6220000-0000-4000-8000-000000000001',
   'researcher', 'Continued as a researcher after graduating.',
   '2013-01-01', 'year', null, null, false, true, false, false, 'imported_historical', 'provisional'),
  -- Ana Yara @ EBRV, collaborator, uncertain period
  ('e6440000-0000-4000-8000-000000000006', 'e6110000-0000-4000-8000-000000000003', 'e6220000-0000-4000-8000-000000000002',
   'collaborator', 'Community collaborator; exact period uncertain.',
   '2015-01-01', 'year', null, null, false, false, false, true, 'nominated_by_other', 'provisional'),
  -- Samuel @ AET, staff (archivist), closed interval
  ('e6440000-0000-4000-8000-000000000007', 'e6110000-0000-4000-8000-000000000004', 'e6220000-0000-4000-8000-000000000003',
   'staff', 'Archivist at the tropical-ecology archive.',
   '2000-01-01', 'year', '2008-12-31', 'year', false, false, false, false, 'imported_historical', 'provisional'),
  -- Beatriz @ IHFA, director, ongoing (succeeded Helena)
  ('e6440000-0000-4000-8000-000000000008', 'e6110000-0000-4000-8000-000000000005', 'e6220000-0000-4000-8000-000000000001',
   'director', 'Directs the institute; succeeded the founding programme lead.',
   '2016-01-01', 'year', null, null, false, true, false, false, 'admin_entered', 'verified_admin')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Relationships — directional + symmetric, multiple kinds, verified /
-- provisional / disputed. Symmetric rows keep source_person_id < target.
-- ---------------------------------------------------------------------
insert into public.relationships
  (id, kind, is_directional, source_person_id, target_person_id, narrative,
   start_date, start_precision, end_date, end_precision,
   is_approximate, is_ongoing, date_is_unknown, date_is_uncertain, source_type, verification_status)
values
  -- Directional mentorship: Helena (mentor) -> Rafael (student)
  ('e6550000-0000-4000-8000-000000000001', 'mentorship', true,
   'e6110000-0000-4000-8000-000000000001', 'e6110000-0000-4000-8000-000000000002',
   'Advised Rafael Campos during doctoral fieldwork.',
   '2008-01-01', 'year', '2012-12-31', 'year', false, false, false, false, 'admin_entered', 'verified_admin'),
  -- Directional succession: Helena (predecessor) -> Beatriz (successor)
  ('e6550000-0000-4000-8000-000000000002', 'succession', true,
   'e6110000-0000-4000-8000-000000000001', 'e6110000-0000-4000-8000-000000000005',
   'Handed over direction of the programme.',
   '2016-01-01', 'year', null, null, false, false, false, false, 'admin_entered', 'verified_admin'),
  -- Symmetric collaboration: Helena & Beatriz (01 < 05)
  ('e6550000-0000-4000-8000-000000000003', 'collaboration', false,
   'e6110000-0000-4000-8000-000000000001', 'e6110000-0000-4000-8000-000000000005',
   'Collaborated on canopy-phenology methods.',
   '2016-01-01', 'year', null, null, false, true, false, false, 'imported_historical', 'provisional'),
  -- Symmetric field partnership: Helena & Ana Yara (01 < 03), DISPUTED
  ('e6550000-0000-4000-8000-000000000004', 'field_partnership', false,
   'e6110000-0000-4000-8000-000000000001', 'e6110000-0000-4000-8000-000000000003',
   'Joint fieldwork is reported by one source and contested by another.',
   '2015-01-01', 'year', null, null, false, false, false, true, 'nominated_by_other', 'disputed'),
  -- Directional interview: Samuel (interviewer) -> Helena (interviewee)
  ('e6550000-0000-4000-8000-000000000005', 'interview', true,
   'e6110000-0000-4000-8000-000000000004', 'e6110000-0000-4000-8000-000000000001',
   'Recorded an oral-history interview with Helena Arvoredo.',
   '2001-01-01', 'year', null, null, false, false, false, true, 'nominated_by_other', 'provisional'),
  -- Symmetric correspondence: Samuel & Beatriz (04 < 05)
  ('e6550000-0000-4000-8000-000000000006', 'correspondence', false,
   'e6110000-0000-4000-8000-000000000004', 'e6110000-0000-4000-8000-000000000005',
   'Exchanged letters about archival deposits.',
   null, null, null, null, false, false, true, false, 'imported_historical', 'verified_self')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Contributions (canonical; person AND institution contributors; both
-- projections + a dedicated contribution page). No rankings or inferred
-- credit — each attribution carries its own capacity and provenance.
-- ---------------------------------------------------------------------
insert into public.contributions
  (id, title, contribution_kind, description, place,
   start_date, start_precision, end_date, end_precision,
   is_approximate, is_ongoing, date_is_unknown, date_is_uncertain, source_type, verification_status)
values
  ('e6660000-0000-4000-8000-000000000001',
   'Long-term canopy-phenology dataset', 'long_term_monitoring',
   'A continuing monitoring dataset, attributed jointly to a person and an institution.',
   'Manaus (fictional)', '2010-01-01', 'year', null, null,
   false, true, false, false, 'admin_entered', 'verified_admin'),
  ('e6660000-0000-4000-8000-000000000002',
   'Interpretation of flooded-forest succession', 'ecological_interpretation',
   'A conceptual contribution with two person contributors in different capacities.',
   null, '1999-01-01', 'year', null, null,
   false, false, false, false, 'imported_historical', 'provisional'),
  ('e6660000-0000-4000-8000-000000000003',
   'Oral-history preservation of field knowledge', 'oral_history_preservation',
   'Preservation work attributed to two people and a holding institution; date uncertain.',
   'Belém (fictional)', '2001-01-01', 'year', null, null,
   false, false, false, true, 'nominated_by_other', 'provisional')
on conflict (id) do nothing;

insert into public.contribution_narrative
  (id, contribution_id, kind, body, source_type, verification_status)
values
  ('e6660a00-0000-4000-8000-000000000001', 'e6660000-0000-4000-8000-000000000001', 'overview',
   $md$An open-ended monitoring dataset used to show a contribution attributed to both a person and an institution.$md$,
   'admin_entered', 'verified_admin'),
  ('e6660a00-0000-4000-8000-000000000002', 'e6660000-0000-4000-8000-000000000001', 'significance',
   $md$Its significance here is to demonstrate contribution projection onto both a person page and an institution page from one canonical record.$md$,
   'admin_entered', 'provisional'),
  ('e6660a00-0000-4000-8000-000000000003', 'e6660000-0000-4000-8000-000000000002', 'overview',
   $md$A conceptual interpretation, shown with two person contributors.$md$,
   'imported_historical', 'provisional'),
  ('e6660a00-0000-4000-8000-000000000004', 'e6660000-0000-4000-8000-000000000003', 'overview',
   $md$Preservation of field knowledge through recorded oral history.$md$,
   'nominated_by_other', 'provisional'),
  ('e6660a00-0000-4000-8000-000000000005', 'e6660000-0000-4000-8000-000000000003', 'context',
   $md$The precise extent of this preservation work is disputed between sources.$md$,
   'nominated_by_other', 'disputed')
on conflict (id) do nothing;

-- person_contributions — person-side attributions (different capacities)
insert into public.person_contributions
  (id, contribution_id, person_id, capacity, attribution_note, sort_order, source_type, verification_status)
values
  ('e6660b00-0000-4000-8000-000000000001', 'e6660000-0000-4000-8000-000000000001', 'e6110000-0000-4000-8000-000000000001',
   'data_stewardship', 'Maintained the dataset over its lifetime.', 0, 'admin_entered', 'verified_admin'),
  ('e6660b00-0000-4000-8000-000000000002', 'e6660000-0000-4000-8000-000000000002', 'e6110000-0000-4000-8000-000000000001',
   'conceptual_development', 'Developed the interpretive framework.', 0, 'imported_historical', 'provisional'),
  ('e6660b00-0000-4000-8000-000000000003', 'e6660000-0000-4000-8000-000000000002', 'e6110000-0000-4000-8000-000000000002',
   'analysis', 'Carried out the supporting analysis.', 1, 'imported_historical', 'provisional'),
  ('e6660b00-0000-4000-8000-000000000004', 'e6660000-0000-4000-8000-000000000003', 'e6110000-0000-4000-8000-000000000004',
   'archival_preservation', 'Preserved the recordings and transcripts.', 0, 'imported_historical', 'provisional'),
  ('e6660b00-0000-4000-8000-000000000005', 'e6660000-0000-4000-8000-000000000003', 'e6110000-0000-4000-8000-000000000003',
   'community_governance', 'Contributed and stewarded community knowledge.', 1, 'nominated_by_other', 'provisional')
on conflict (id) do nothing;

-- organization_contributions — institution-side attributions
insert into public.organization_contributions
  (id, contribution_id, organization_id, capacity, attribution_note, sort_order, source_type, verification_status)
values
  ('e6660c00-0000-4000-8000-000000000001', 'e6660000-0000-4000-8000-000000000001', 'e6220000-0000-4000-8000-000000000001',
   'institutional_support', 'Hosted and resourced the monitoring programme.', 0, 'admin_entered', 'verified_admin'),
  ('e6660c00-0000-4000-8000-000000000002', 'e6660000-0000-4000-8000-000000000003', 'e6220000-0000-4000-8000-000000000003',
   'custodianship', 'Holds the archival record of the interviews.', 0, 'imported_historical', 'provisional')
on conflict (id) do nothing;

-- contribution_events — reuse canonical events on contribution timelines
insert into public.contribution_events (id, contribution_id, event_id) values
  ('e6330c00-0000-4000-8000-000000000001', 'e6660000-0000-4000-8000-000000000001', 'e6330000-0000-4000-8000-000000000008'),
  ('e6330c00-0000-4000-8000-000000000002', 'e6660000-0000-4000-8000-000000000002', 'e6330000-0000-4000-8000-000000000003'),
  ('e6330c00-0000-4000-8000-000000000003', 'e6660000-0000-4000-8000-000000000003', 'e6330000-0000-4000-8000-000000000006')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- organization_relationships (M7 Knowledge Network) — institutional lineage
--   AET → IHFA succession (directional); IHFA ↔ EBRV affiliation (symmetric).
--   Fixed e677… namespace so /dev/exhibition and the DB test stay stable.
-- ---------------------------------------------------------------------
insert into public.organization_relationships
  (id, kind, is_directional, source_organization_id, target_organization_id, note, start_date, start_precision, source_type, verification_status)
values
  ('e6770000-0000-4000-8000-000000000001', 'succession', true,
   'e6220000-0000-4000-8000-000000000003', 'e6220000-0000-4000-8000-000000000001',
   'IHFA carried forward the archival mission of AET — Development Exhibition.',
   '1984-01-01', 'year', 'imported_historical', 'verified_admin'),
  ('e6770000-0000-4000-8000-000000000002', 'affiliation', false,
   'e6220000-0000-4000-8000-000000000001', 'e6220000-0000-4000-8000-000000000002',
   'A standing field-station affiliation — Development Exhibition.',
   '1996-01-01', 'year', 'imported_historical', 'provisional')
on conflict (id) do nothing;

-- Everything this seed inserted is fictional demonstration data
-- (docs/REGRAS.md rule 11). wipe_demo_data() removes it in one step.
update public.people        set is_demo = true where not is_demo;
update public.organizations set is_demo = true where not is_demo;
update public.contributions set is_demo = true where not is_demo;
update public.events        set is_demo = true where not is_demo;
