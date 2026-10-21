# Supabase Development

## Status

This document covers **development infrastructure only**: how to run Supabase
locally, link a hosted development project, and manage migrations. It does
not describe the database schema (see `docs/database-schema.md`,
`docs/database-model.md`) or any application-level Supabase integration
(auth pages, data fetching) — those are later roadmap phases (see
`docs/development-roadmap.md`, Phase 1+). No domain tables or migrations
exist yet.

## One-time setup: initializing the `supabase/` folder

This repository has `supabase` registered as a pinned dev dependency in
`package.json`, and the application dependencies (`@supabase/supabase-js`,
`@supabase/ssr`) are installed, but the `supabase/` project folder itself
(`config.toml`, `migrations/`, etc.) has **not** been generated yet. Running
the actual CLI requires network access (to fetch the CLI binary/Docker
images) and a local Docker installation, neither of which is available in
the environment this milestone was prepared in.

Run this once, locally, before anything else in this document:

```bash
npm install
npx supabase init
```

This creates `supabase/config.toml` (safe to commit) and an empty
`supabase/migrations/` directory. Commit the result as part of finishing
this milestone.

## Local development prerequisites

- **Node.js 20+** (the Supabase CLI requires it when run via `npx`/`npm`).
- **Docker Desktop** (or a Docker-compatible runtime: Podman, Rancher
  Desktop, OrbStack, or Colima) — the local stack (Postgres, Auth, Storage,
  Studio, etc.) runs in containers.
- **npm** (already used by this project; the CLI is installed as a dev
  dependency, not globally — see `CLAUDE.md`/milestone constraints).

Verify prerequisites:

```bash
node --version   # expect 20.x or later
docker info      # should succeed without error
npx supabase --version
```

## Starting and stopping the local stack

```bash
npm run supabase:start   # supabase start — boots Postgres, Auth, Storage, Studio, etc. in Docker
npm run supabase:status  # supabase status — prints local URLs and keys
npm run supabase:stop    # supabase stop — stops containers, keeps data volumes
```

On first `supabase start`, the CLI prints local credentials (Studio URL,
API URL, publishable/secret keys, and the Postgres connection string).
These are local-only, non-secret-by-convention development values — they
are still not committed anywhere; copy the ones you need into your own
untracked `.env.local`.

Local Studio is normally at `http://127.0.0.1:54323`.

## Linking a hosted development project

**Run these yourself, in your own terminal.** They involve your personal
Supabase login and a project reference; Claude should not be asked to
paste or handle these values.

```bash
# 1. Authenticate the CLI with your Supabase account (opens a browser,
#    or accepts a personal access token from
#    https://supabase.com/dashboard/account/tokens)
npx supabase login

# 2. Link this repository to the hosted DEVELOPMENT project
#    (find the project ref in the Supabase Dashboard project URL/settings)
npx supabase link --project-ref <your-dev-project-ref>

# 3. Check link status
npx supabase status
npx supabase projects list
```

`supabase link` may prompt for the database password; it's cached in your
OS credential store if available and is never written into the repository.

## Creating a migration

```bash
npm run db:new -- add_some_table
# equivalent to: supabase migration new add_some_table
```

This creates a timestamped SQL file under `supabase/migrations/`. Per
`CLAUDE.md`, every schema change must go through a migration file — never
hand-edit the database.

## Testing migrations locally

```bash
npm run supabase:reset   # supabase db reset
# or: npm run db:reset
```

This recreates the local Postgres container from scratch, applies every
migration in `supabase/migrations/` in order, and runs `supabase/seed.sql`
if present. Requires the local stack to already be running
(`npm run supabase:start`). This is the standard way to confirm a new
migration applies cleanly before pushing it anywhere.

## Pushing migrations to the hosted development project

```bash
npx supabase db push
```

Applies any local migrations not yet recorded in the linked project's
migration history table. Use `--dry-run` first to preview:

```bash
npx supabase db push --dry-run
```

**Not run as part of this milestone** — no migrations exist yet to push,
and pushing requires the login/link steps above, which only you can do.

## Generating TypeScript database types

```bash
npm run supabase:types    # against the local database
# supabase gen types --lang typescript --local > src/types/database.types.ts

npx supabase gen types --lang typescript --linked > src/types/database.types.ts
# against the linked hosted project instead of local
```

The generated file is derived data (regenerate after every migration); it's
fine to commit for editor/type-checking convenience, but treat
`supabase/migrations/*.sql` as the source of truth, not the generated types.

## Credentials that must never be committed

Never commit, and never place in `.env.example`:

- The Supabase **secret key** (`sb_secret_...`) or legacy
  `service_role` JWT — full-access, bypasses Row Level Security.
- The local or hosted **Postgres database password**.
- Any **personal access token** used for `supabase login` /
  `SUPABASE_ACCESS_TOKEN`.
- `.env.local` or any other file holding real values (already excluded via
  `.gitignore`).

The **publishable key** (`sb_publishable_...`, or the legacy `anon` key) is
the one exception: it's designed to be public and is the only key that
belongs in `.env.example` (as an empty placeholder) and in client-side code,
per `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.example`.

If a secret key or database password is ever needed by application code,
it stays server-side only, is set directly in `.env.local` (local) or the
hosting provider's environment/secrets configuration (deployed), and is
never referenced from a Client Component — per `CLAUDE.md`.

### Local service-role key for the reviewer E2E tests (M5.4)

`tests/e2e/helpers/reviewer.ts` needs a service-role connection to grant
reviewer status directly during test setup, since there is deliberately no
client-facing way to do this (see
`docs/decisions/0009-reviewer-authorization-table.md`). To run
`npm run test:e2e` locally:

1. Start the local stack: `npm run supabase:start`.
2. Get the local secret key: `npm run supabase:status` (look for
   `service_role key` in the output).
3. Add it to `.env.local` (already gitignored, never committed):
   `SUPABASE_SERVICE_ROLE_KEY=<value>`.

`playwright.config.ts` loads `.env.local` via Node's built-in
`process.loadEnvFile()` before the test run starts, so no manual `export`
step is needed on top of adding the line above. A value already exported
in your shell takes precedence over `.env.local` if both are present. If
the key is missing entirely, the reviewer tests fail immediately with a
clear error rather than skipping silently.

## Development vs. production projects

- **Local Supabase** (`supabase start`, Docker) — fully disposable, no
  real data, reset freely with `supabase db reset`. Used for day-to-day
  development and CI.
- **Hosted development project** (linked via `supabase link`) — a shared
  Supabase project on supabase.com used for integration testing against a
  real hosted Postgres/Auth/Storage instance. Still not production: no
  real participant data belongs here (see `docs/privacy-model.md` — this
  milestone explicitly creates no production data).
- **Hosted production project** — does not exist yet. It will be a
  separate Supabase project with its own project ref, its own migration
  history, and stricter access controls, introduced when the platform is
  ready to launch. Migrations are pushed to development first, verified,
  and only later promoted to production through a deliberate, separate
  step — never pushed to both from the same `supabase link` at once.
