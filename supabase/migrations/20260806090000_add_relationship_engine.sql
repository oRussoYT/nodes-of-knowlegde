-- Milestone M6.4: Relationship Engine -- relationships as historical narratives.
--
-- The fourth constitutional engine of Nodes of Knowledge (after Timeline M6.2
-- and Participation M6.3). A Relationship is a historically meaningful BOND
-- between entities -- who was connected, the nature of the bond, when it
-- existed, how it mattered, and the evidence for it. See
-- docs/decisions/0014-relationship-engine.md and
-- docs/m6.4-relationship-engine.md.
--
-- Constitutional boundaries (CC1, ratified):
--   * Participation (M6.3) is bounded belonging/inclusion within a larger
--     context; a Relationship is a bond BETWEEN entities. A student belonging
--     to an institution is Participation; a student mentored by a scientist is
--     a Relationship. They are NOT one generic model.
--   * An Event (M6.2) is something that happened; a Relationship is a bond that
--     may persist, change, deepen, weaken, pause, resume, or end across time.
--     Events may mark stages in a Relationship; they never replace it.
--   * A Relationship row NEVER implies truth: it carries provenance +
--     verification, and is never inferred from co-authorship, shared
--     institutions, overlapping dates, or proximity (CLAUDE.md: "Never treat
--     an inferred relationship as a confirmed relationship").
--
-- Scope: the smallest complete vertical slice is PERSON <-> PERSON, read inside
-- the Scientific Biography. The model is deliberately entity-neutral in shape
-- (a source and a target, a kind, direction, a shared temporal model,
-- provenance, an optional narrative) so it extends WITHOUT redesign to
-- person<->institution, institution<->institution, etc., once those entities
-- exist -- but M6.4 does NOT build the universal Entity Engine, the Institution
-- Engine, or polymorphic source/target. That tradeoff is documented in
-- ADR-0014 ("Deferred universal entity support").
--
-- Adds:
--   1. public.relationship_kinds -- a data-backed controlled vocabulary of
--      GENERIC relationship kinds, each declaring directionality and the role
--      each end plays (with singular + plural role labels, so a relationship
--      reads correctly and with INVERSE labels on both entities' pages). Node-
--      specific kinds (e.g. a PDBFF-specific bond) are added as DATA, never
--      hardcoded (docs/controlled-vocabularies.md).
--   2. public.relationships -- ONE canonical record per bond (never a pair of
--      mirror rows). Source + target + kind + the SHARED Many-Clocks temporal
--      model + provenance/verification + an optional curated narrative.
--      Symmetric kinds are stored in canonical order (source < target) so a
--      reciprocal bond can never be duplicated as two contradictory rows;
--      directional kinds keep source/target meaning.
--   3. public.get_person_relationships(uuid) -- SECURITY DEFINER read model
--      that projects the SAME canonical record onto EITHER person's page,
--      computing that person's perspective (their role, the counterpart's role
--      and its INVERSE label, and the direction) so no duplication is needed.
--
-- Deferred (reserved, not built): the universal Entity/Institution/Contribution
-- engines and polymorphic source/target; other entities' relationship rosters;
-- inference / an AI librarian suggestion surface; client relationship-editing;
-- a Knowledge Network visualization; family-relationship kinds (an open
-- governance/ethics question -- see ADR-0014).

-- ---------------------------------------------------------------------
-- relationship_kinds -- generic controlled vocabulary (data, not code)
-- ---------------------------------------------------------------------

create table public.relationship_kinds (
  key text primary key,
  label text not null,               -- neutral name of the bond ("Mentorship")
  is_directional boolean not null,   -- directional (mentor->student) vs symmetric (collaborators)

  -- The role each end plays, singular (for one entry) and plural (for a group
  -- heading). For symmetric kinds the source and target labels are identical.
  -- These are what let ONE record read with correct INVERSE labels on both
  -- entities' pages: on the source's page the counterpart is shown with the
  -- target role; on the target's page, with the source role.
  source_role_label text not null,
  source_role_label_plural text not null,
  target_role_label text not null,
  target_role_label_plural text not null,

  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,

  constraint relationship_kinds_key_not_blank check (btrim(key) <> ''),
  constraint relationship_kinds_label_not_blank check (btrim(label) <> ''),
  constraint relationship_kinds_source_role_not_blank check (btrim(source_role_label) <> ''),
  constraint relationship_kinds_target_role_not_blank check (btrim(target_role_label) <> ''),
  -- A symmetric kind must have identical source/target roles (there is no
  -- direction to distinguish them); a directional kind should differ.
  constraint relationship_kinds_symmetric_roles_match check (
    is_directional or (source_role_label = target_role_label and source_role_label_plural = target_role_label_plural)
  ),
  -- Referenced by the composite FK on public.relationships so a relationship's
  -- denormalized is_directional is forced to match its kind's.
  constraint relationship_kinds_key_directional_unique unique (key, is_directional)
);

comment on table public.relationship_kinds is
  'Generic, discipline-independent controlled vocabulary of relationship kinds '
  '(docs/controlled-vocabularies.md), each declaring directionality and the '
  'role each end plays (singular + plural, for inverse-label display on both '
  'entities'' pages). Node-neutral: a Node adds its own kinds as DATA, never as '
  'code. Deny-by-default; surfaced only through get_person_relationships.';

alter table public.relationship_kinds enable row level security;
grant select, insert, update, delete on public.relationship_kinds to service_role;

-- Founding generic vocabulary (person-oriented). Directional kinds name two
-- distinct roles; symmetric kinds repeat one role. Institution/project kinds
-- (institutional partner, archival donor, object-of-study, ...) arrive with the
-- Institution/Contribution engines; family kinds are deferred pending
-- governance (ADR-0014). Extensible as data without a code change.
insert into public.relationship_kinds
  (key, label, is_directional, source_role_label, source_role_label_plural, target_role_label, target_role_label_plural, description, sort_order) values
  ('mentorship',              'Mentorship',              true,  'Mentor',                'Mentors',                'Student',               'Students',               'A mentoring bond: the source mentored the target.',                 10),
  ('advising',                'Advising',                true,  'Advisor',               'Advisors',               'Advisee',               'Advisees',               'An advising bond: the source advised the target.',                  20),
  ('interview',               'Interview',               true,  'Interviewer',           'Interviewers',           'Interviewee',           'Interviewees',           'An interview bond: the source interviewed the target.',             30),
  ('succession',              'Succession',              true,  'Predecessor',           'Predecessors',           'Successor',             'Successors',             'A succession: the source preceded the target in a role or work.',   40),
  ('collaboration',           'Collaboration',           false, 'Collaborator',          'Collaborators',          'Collaborator',          'Collaborators',          'A collaboration between two people.',                                50),
  ('co_research',             'Co-research',             false, 'Co-researcher',         'Co-researchers',         'Co-researcher',         'Co-researchers',         'A co-research bond between two researchers.',                        60),
  ('field_partnership',       'Field partnership',       false, 'Field partner',         'Field partners',         'Field partner',         'Field partners',         'A sustained field-work partnership.',                                70),
  ('community_collaboration', 'Community collaboration', false, 'Community collaborator','Community collaborators','Community collaborator','Community collaborators','A collaboration with a community collaborator.',                    80),
  ('technical_collaboration', 'Technical collaboration', false, 'Technical collaborator','Technical collaborators','Technical collaborator','Technical collaborators','A collaboration with a technical collaborator.',                    90),
  ('correspondence',          'Correspondence',          false, 'Correspondent',         'Correspondents',         'Correspondent',         'Correspondents',         'A sustained correspondence between two people.',                    100),
  ('other',                   'Relationship',            false, 'Associate',             'Associates',             'Associate',             'Associates',             'A curated relationship not covered by another kind.',              900);

-- ---------------------------------------------------------------------
-- relationships -- ONE canonical record per historically meaningful bond
-- ---------------------------------------------------------------------

create table public.relationships (
  id uuid primary key default gen_random_uuid(),

  kind text not null,
  -- Denormalized from the kind and FORCED to match it by the composite FK
  -- below. Present on the row so the symmetric-canonical CHECK (which cannot
  -- join to relationship_kinds) can guarantee reciprocal bonds are stored once.
  is_directional boolean not null,

  source_person_id uuid not null references public.people (id) on delete cascade,
  target_person_id uuid not null references public.people (id) on delete cascade,

  narrative text,   -- optional curated narrative: how the bond began, its
                    -- context and meaning, how it changed, why it matters.
                    -- Never auto-generated; a missing narrative is honest.

  -- The SHARED Many-Clocks temporal model -- identical to events/participations
  -- (precision / approximation / uncertainty / missing + intervals +
  -- open-ended), so a bond's span is dated with the same honesty.
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

  -- The kind reference; the composite target forces is_directional == kind's.
  constraint relationships_kind_fkey foreign key (kind, is_directional)
    references public.relationship_kinds (key, is_directional),

  -- No self-relationship: a bond is between two DISTINCT entities.
  constraint relationships_no_self check (source_person_id <> target_person_id),

  -- Canonical reciprocal storage: a SYMMETRIC bond is stored once, in a fixed
  -- order (source < target), so (A,B) and (B,A) can never both exist. A
  -- DIRECTIONAL bond keeps source/target meaning (A->B and B->A are distinct).
  constraint relationships_symmetric_canonical check (
    is_directional or source_person_id < target_person_id
  ),
  -- Prevents exact duplicates; combined with the canonical order above, also
  -- prevents symmetric mirror duplicates.
  constraint relationships_unique unique (kind, source_person_id, target_person_id),

  constraint relationships_narrative_not_blank check (
    narrative is null or btrim(narrative) <> ''
  ),

  -- Temporal invariants (identical discipline to events/participations).
  constraint relationships_start_precision_valid check (
    start_precision is null or start_precision in ('day', 'month', 'year', 'decade')
  ),
  constraint relationships_end_precision_valid check (
    end_precision is null or end_precision in ('day', 'month', 'year', 'decade')
  ),
  constraint relationships_start_precision_matches_date check (
    (start_date is null) = (start_precision is null)
  ),
  constraint relationships_end_precision_matches_date check (
    (end_date is null) = (end_precision is null)
  ),
  constraint relationships_unknown_iff_no_start check (
    (start_date is null) = date_is_unknown
  ),
  constraint relationships_end_requires_start check (
    end_date is null or start_date is not null
  ),
  constraint relationships_end_after_start check (
    end_date is null or end_date >= start_date
  ),
  constraint relationships_ongoing_requires_open_start check (
    not is_ongoing or (start_date is not null and end_date is null)
  ),
  constraint relationships_unknown_excludes_qualifiers check (
    not date_is_unknown or (not is_approximate and not is_ongoing and not date_is_uncertain)
  ),
  constraint relationships_verification_status_valid check (
    verification_status in ('provisional', 'verified_self', 'verified_admin', 'disputed')
  ),
  constraint relationships_source_type_valid check (
    source_type in ('self_reported', 'nominated_by_other', 'admin_entered', 'imported_historical')
  )
);

comment on table public.relationships is
  'ONE canonical record per historically meaningful bond between two people '
  '(never a pair of mirror rows). CC1: a bond BETWEEN entities, not '
  'Participation (bounded belonging) and not an Event (something that '
  'happened). Symmetric bonds are stored in canonical order (source < target); '
  'directional bonds keep source/target meaning. Carries provenance + '
  'verification + an optional curated narrative; a row never implies truth and '
  'is never inferred. Deny-by-default; read via get_person_relationships, which '
  'projects it onto EITHER person''s page with correct inverse labels.';
comment on column public.relationships.is_directional is
  'Denormalized from relationship_kinds and forced to match it by '
  'relationships_kind_fkey; present so the symmetric-canonical CHECK can run.';
comment on column public.relationships.narrative is
  'Optional curated narrative (how the bond began, its meaning, how it '
  'changed, why it matters). Never auto-generated/AI; a missing narrative is '
  'an honest state, distinct from the factual assertions.';

create index relationships_source_person_id_idx on public.relationships (source_person_id);
create index relationships_target_person_id_idx on public.relationships (target_person_id);
create index relationships_kind_idx on public.relationships (kind);
create index relationships_verification_status_idx on public.relationships (verification_status);
create index relationships_start_date_idx on public.relationships (start_date);

create trigger relationships_set_updated_at
  before update on public.relationships
  for each row
  execute function public.set_updated_at();

alter table public.relationships enable row level security;
grant select, insert, update, delete on public.relationships to service_role;

-- ---------------------------------------------------------------------
-- get_person_relationships -- canonical read model, projected per person
-- ---------------------------------------------------------------------
--
-- Separate from get_person_biography/timeline/participation (not a monolith):
-- composed at the page, same authorization + conservative-visibility
-- discipline as the M6.1-M6.3 read models (ADR-0011/0012/0013): SECURITY
-- DEFINER, search_path pinned, auth.uid() required, EXECUTE to authenticated
-- only, tables stay locked. For the given person it returns EACH bond ONCE,
-- from THAT person's perspective: their role, the counterpart's role and its
-- INVERSE label (singular + plural), and the direction (outgoing / incoming /
-- symmetric) -- so the SAME canonical record appears correctly on both
-- entities' pages without duplication. Counterparts that are merged records are
-- omitted; a merged/nonexistent subject returns null. Ordered chronologically
-- (undated last). Provisional/disputed bonds ARE returned (rendered calmly);
-- the row's existence never implies truth. Grouping (by the counterpart's role)
-- is the client's job (src/features/relationships/derive.ts).

create function public.get_person_relationships(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_relationships jsonb;
begin
  if auth.uid() is null then
    raise exception 'get_person_relationships: authentication required';
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
        'id', r.id,
        'kind', jsonb_build_object('key', k.key, 'label', k.label, 'is_directional', r.is_directional),
        'counterpart', jsonb_build_object('id', cp.id, 'display_name', cp.display_name),
        'perspective', jsonb_build_object(
          'person_role_label',
            case when r.source_person_id = v_person.id then k.source_role_label else k.target_role_label end,
          'counterpart_role_label',
            case when r.source_person_id = v_person.id then k.target_role_label else k.source_role_label end,
          'counterpart_role_label_plural',
            case when r.source_person_id = v_person.id then k.target_role_label_plural else k.source_role_label_plural end,
          'direction',
            case when not r.is_directional then 'symmetric'
                 when r.source_person_id = v_person.id then 'outgoing'
                 else 'incoming' end
        ),
        'narrative', r.narrative,
        'temporal', jsonb_build_object(
          'start_date', r.start_date,
          'start_precision', r.start_precision,
          'end_date', r.end_date,
          'end_precision', r.end_precision,
          'is_approximate', r.is_approximate,
          'is_ongoing', r.is_ongoing,
          'date_is_unknown', r.date_is_unknown,
          'date_is_uncertain', r.date_is_uncertain
        ),
        'provenance', jsonb_build_object(
          'source_type', r.source_type,
          'verification_status', r.verification_status
        )
      )
      order by r.start_date asc nulls last, r.created_at asc
    ),
    '[]'::jsonb
  )
  into v_relationships
  from public.relationships r
  join public.relationship_kinds k
    on k.key = r.kind and k.is_directional = r.is_directional
  join public.people cp
    on cp.id = (case when r.source_person_id = v_person.id then r.target_person_id else r.source_person_id end)
  where (r.source_person_id = v_person.id or r.target_person_id = v_person.id)
    and cp.verification_status <> 'merged';

  return jsonb_build_object('person_id', v_person.id, 'relationships', v_relationships);
end;
$$;

comment on function public.get_person_relationships(uuid) is
  'Canonical person-relationships read model. Returns an authenticated reader a '
  'provenance-bearing set of a person''s bonds (jsonb), each projected from '
  'THAT person''s perspective with correct inverse labels, ordered '
  'chronologically (undated last); merged counterparts omitted; null for a '
  'nonexistent or merged subject. SECURITY DEFINER -- see the block comment '
  'above and docs/decisions/0014-relationship-engine.md. Never grant EXECUTE '
  'to anon or PUBLIC.';

revoke all on function public.get_person_relationships(uuid) from public;
grant execute on function public.get_person_relationships(uuid) to authenticated;
