-- Local development / e2e-test seed data. Runs only via `supabase db
-- reset` / `supabase start` against a local Supabase instance — see
-- supabase/config.toml's `[db.seed]` section (`enabled = true`,
-- `sql_paths = ["./seed.sql"]`, already configured before this file
-- existed). Never applied to a real deployed environment, and never
-- inserts real PDBFF participant data.
--
-- These two `people` rows are the same obviously-fictional-for-this-purpose
-- names already used as pgTAP fixtures
-- (supabase/tests/database/identity_foundation.test.sql,
-- supabase/tests/database/claim_discovery.test.sql) — kept consistent on
-- purpose so it's unambiguous these are test fixtures, not real historical
-- records, and so a reviewer checking test output already recognizes them.
--
-- Purpose: the claim-discovery search/browse flow
-- (tests/e2e/claim-workflow.spec.ts) needs at least one real, eligible
-- `people` row to find. There is no client-reachable, app-level way to
-- create a `people` row at all in this milestone (see
-- docs/decisions/0001-separate-people-from-user-accounts.md and
-- docs/database-implementation.md's "Admin-review limitation") — seeding
-- is the only realistic way to exercise the search/select/submit path
-- end-to-end in a real browser without a database script running outside
-- the app.

insert into public.people (given_name, family_name, display_name, verification_status, source_type)
values
  ('Ada', 'Lovelace', 'Ada Lovelace', 'provisional', 'imported_historical'),
  ('Grace', 'Hopper', 'Grace Hopper', 'provisional', 'imported_historical');

-- Scientific Biography read fixture (M6.1) for
-- tests/e2e/scientific-biography.spec.ts: a person WITH a curated narrative.
--
-- person_narrative is deny-by-default like people, and -- unlike people --
-- has no service_role table grant, so the service-role test client (used
-- for disposable people-only fixtures) cannot create narrative rows. This
-- superuser seed is the supported privileged path for narrative test data,
-- exactly as the two people above are the supported path for discoverable
-- people. Read-only in the e2e suite (biography reading never mutates the
-- subject), so a single shared row is safe under parallel workers. The name
-- is a distinctive test token that no claim-discovery search term matches.
with seeded_biography_person as (
  insert into public.people (given_name, family_name, display_name, verification_status, source_type)
  values ('Seed', 'Narrative', 'Seed Narrative Subject', 'provisional', 'imported_historical')
  returning id
)
insert into public.person_narrative (person_id, body, source_type, verification_status)
select id,
       'A tropical-forest ecologist, documented from historical records.',
       'admin_entered',
       'provisional'
from seeded_biography_person;

-- Everything this seed inserted is fictional demonstration data
-- (docs/REGRAS.md rule 11). wipe_demo_data() removes it in one step.
update public.people        set is_demo = true where not is_demo;
update public.organizations set is_demo = true where not is_demo;
update public.contributions set is_demo = true where not is_demo;
update public.events        set is_demo = true where not is_demo;
