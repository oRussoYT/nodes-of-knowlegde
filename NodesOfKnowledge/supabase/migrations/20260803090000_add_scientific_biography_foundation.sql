-- Milestone M6.1: Scientific Biography Foundation
--
-- The first production data + read structures for the Digital Scientific
-- Biography (docs/nodes-of-knowledge-design-bible-volume-1.md,
-- docs/nodes-of-knowledge-product-blueprint.md). Constrained to the
-- smallest durable schema needed to render an identity + introductory
-- narrative honestly, provenance-aware, for an AUTHENTICATED authorized
-- reader. See docs/decisions/0011-scientific-biography-read-model.md.
--
-- Adds:
--   1. public.person_narrative -- narrative as a first-class *authored*
--      assertion, deliberately separate from the factual `people` record
--      (the Blueprint requires narrative to carry its own authorship and
--      provenance; people.biography is a bare field with neither and is
--      NOT surfaced by the read model below -- see ADR-0011).
--   2. public.get_person_biography(uuid) -- the canonical Scientific
--      Biography read model. SECURITY DEFINER, following the exact pattern
--      of search_claimable_people / list_claims_for_review
--      (docs/decisions/0008-..., 0009-...): `people`/`person_narrative`
--      stay fully locked at the table level (no client GRANT/RLS policy);
--      this function is the only new read path, it requires auth.uid(),
--      and it returns only the fields safe for authenticated reading, with
--      per-fact provenance, withholding sensitive personal data.
--
-- Deliberately NOT added (deferred; see ADR-0011 and the M6.V validation):
--   * profile_visibility_settings / any per-field visibility system
--     (ADR-0008 already deferred it as premature) -- M6.1 encodes a fixed
--     conservative policy in the function instead.
--   * any public (unauthenticated / anon) read path -- the living-scholar
--     public-record policy is open governance/legal work (M6.V/G1).
--   * Participation / Event / Relationship / Institution structures.

-- ---------------------------------------------------------------------
-- person_narrative
-- ---------------------------------------------------------------------

create table public.person_narrative (
  id uuid primary key default gen_random_uuid(),

  person_id uuid not null references public.people (id) on delete cascade,

  body text not null,

  -- Narrative's OWN provenance, independent of the person record's. Same
  -- provenance vocabulary as people.source_type, plus an authored-by actor.
  source_type text not null,
  verification_status text not null default 'provisional',
  authored_by_user_id uuid references auth.users (id) on delete set null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint person_narrative_body_not_blank check (btrim(body) <> ''),
  constraint person_narrative_source_type_valid check (
    source_type in (
      'self_reported', 'nominated_by_other', 'admin_entered',
      'imported_historical'
    )
  ),
  -- Narrative verification is a narrower set than person verification:
  -- claim_pending/merged are person-record lifecycle states, not narrative
  -- states, so they are intentionally excluded here.
  constraint person_narrative_verification_status_valid check (
    verification_status in (
      'provisional', 'verified_self', 'verified_admin', 'disputed'
    )
  ),
  -- M6.1 surfaces a single current narrative per person. A revision/
  -- history model is a later capability, not forced in now.
  constraint person_narrative_one_current_per_person unique (person_id)
);

comment on table public.person_narrative is
  'A person''s curated biographical narrative, as a first-class authored '
  'assertion distinct from the factual people record -- carries its own '
  'source_type/verification_status/authored_by. Not public by default: RLS '
  'is enabled with no client GRANT/policy (deny-by-default, exactly like '
  'public.people); the only read path is get_person_biography(). Narrative '
  'is never system- or AI-generated. See '
  'docs/decisions/0011-scientific-biography-read-model.md.';
comment on column public.person_narrative.source_type is
  'Provenance of THIS narrative text (not the person record). Same '
  'vocabulary as people.source_type.';
comment on column public.person_narrative.authored_by_user_id is
  'The account that authored/curated this narrative, where attributable. '
  'Nullable for imported/administrative narrative with no attributable '
  'author. Editorial-authorship governance (who may author/edit) is '
  'deferred (M6.V/G2); in M6.1 narrative is created only via a trusted '
  'service_role/admin path, never a client write.';

create index person_narrative_person_id_idx on public.person_narrative (person_id);

create trigger person_narrative_set_updated_at
  before update on public.person_narrative
  for each row
  execute function public.set_updated_at();

-- Deny-by-default, exactly like public.people (see the identity-foundation
-- migration's Grants section): RLS on, and NO grant/policy for anon or
-- authenticated. Only service_role (which bypasses RLS) can write, and the
-- SECURITY DEFINER read function below is the only read path. There is
-- deliberately no client write path in M6.1.
alter table public.person_narrative enable row level security;

-- ---------------------------------------------------------------------
-- get_person_biography -- the canonical Scientific Biography read model
-- ---------------------------------------------------------------------
--
-- Threat model / design (mirrors search_claimable_people, see
-- docs/decisions/0008-...):
--   * `people` and `person_narrative` remain fully locked at the table
--     level -- this migration adds NO GRANT and NO RLS policy on either for
--     anon/authenticated. The only new capability is EXECUTE on this one
--     function, granted to `authenticated` only.
--   * SECURITY DEFINER lets the function read those tables while the body
--     enforces every restriction: auth.uid() must be present (an
--     unauthenticated caller cannot forge it), the caller's identity is
--     never an input (the only parameter is the person id), and the result
--     is assembled and filtered inside the function, never left to the
--     caller.
--   * search_path pinned + every reference schema-qualified.
--   * Conservative M6.1 visibility policy, encoded here rather than in a
--     (deferred) per-field settings table: to an authenticated reader it
--     returns display/given/family/preferred names, is_deceased,
--     verification/claim state, and the narrative when present -- each with
--     provenance. It WITHHOLDS exact date_of_birth/date_of_death (personal
--     data per docs/privacy-model.md) and never returns created_by_user_id
--     or any internal column. `withheld` is a FIXED policy list, not data:
--     it never reveals whether a value exists, only that this surface does
--     not show it.
--   * A nonexistent id and a `merged` duplicate both return SQL null
--     (no biography), indistinguishably -- this cannot be used as an
--     existence oracle.

create function public.get_person_biography(p_person_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_person public.people%rowtype;
  v_narrative public.person_narrative%rowtype;
  v_is_claimed boolean;
begin
  if auth.uid() is null then
    raise exception 'get_person_biography: authentication required';
  end if;

  if p_person_id is null then
    return null;
  end if;

  select * into v_person from public.people p where p.id = p_person_id;

  -- Not found, or a merged duplicate redirected away: no biography.
  if not found or v_person.verification_status = 'merged' then
    return null;
  end if;

  v_is_claimed := exists (
    select 1
    from public.user_person_links upl
    where upl.person_id = v_person.id
      and upl.status = 'active'
  );

  select * into v_narrative
  from public.person_narrative pn
  where pn.person_id = v_person.id
  limit 1;

  return jsonb_build_object(
    'person_id', v_person.id,
    'identity', jsonb_build_object(
      'display_name', v_person.display_name,
      'given_name', v_person.given_name,
      'family_name', v_person.family_name,
      'preferred_name', v_person.preferred_name,
      'is_deceased', v_person.is_deceased
    ),
    -- Provenance of the identity assertions (the person record itself).
    'provenance', jsonb_build_object(
      'source_type', v_person.source_type,
      'verification_status', v_person.verification_status
    ),
    'is_claimed', v_is_claimed,
    -- Fixed policy list of fields withheld from this authenticated surface.
    'withheld', jsonb_build_array('date_of_birth', 'date_of_death'),
    'narrative', case
      when v_narrative.id is null then null
      else jsonb_build_object(
        'body', v_narrative.body,
        'source_type', v_narrative.source_type,
        'verification_status', v_narrative.verification_status
      )
    end
  );
end;
$$;

comment on function public.get_person_biography(uuid) is
  'Canonical Scientific Biography read model. Returns an authenticated '
  'reader an authorized, provenance-bearing biography document (jsonb) for '
  'one person, withholding exact life dates and internal columns; null for '
  'a nonexistent or merged person. SECURITY DEFINER: see the block comment '
  'above and docs/decisions/0011-scientific-biography-read-model.md. Never '
  'grant EXECUTE to anon or PUBLIC.';

revoke all on function public.get_person_biography(uuid) from public;
grant execute on function public.get_person_biography(uuid) to authenticated;
