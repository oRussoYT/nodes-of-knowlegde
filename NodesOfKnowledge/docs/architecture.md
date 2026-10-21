# Architecture

## Status

This document describes the planned architecture for NetPDBFF. Only the
project foundation (this repository's current state) has been built. The
modules below are planned, not implemented.

## Platform context

NetPDBFF is the first Node of the **Nodes of Knowledge** platform (see
`docs/master-vision.md` and
`docs/decisions/0010-platform-vision-nodes-of-knowledge.md`, which extends
`docs/decisions/0007-netpdbff-first-vertical-general-research-infrastructure.md`).
In practice this means one standing discipline for everything below: keep
the generic core (`src/lib`, `src/types`, the design system, the generic
schema tables) discipline-independent, and keep PDBFF-specific vocabulary,
branding, and copy in the per-Node "skin" layer. It does **not** add
multi-tenancy, Node/institution tables, or any platform machinery — those
remain unbuilt until a real second Node makes their requirements concrete.

## Approach: modular monolith

NetPDBFF will be built as a single Next.js application (a monolith for
deployment and operational simplicity) internally organized into
well-bounded modules (to keep the codebase navigable as it grows). Each
module owns its own domain logic, UI, and data-access code, and depends on
shared, lower-level code in `src/lib`, `src/types`, and `src/config`
rather than reaching into another module's internals.

Modules will live under `src/features/<module-name>` as they are built.
A module should be able to be reasoned about, tested, and (eventually)
extracted into a separate service without redesigning the rest of the
application — even though extraction is not a near-term goal.

## Technology stack

- **Next.js (App Router)** for routing, rendering, and server actions.
- **TypeScript in strict mode** throughout.
- **PostgreSQL**, managed through **Supabase** (database, auth, storage),
  accessed via versioned SQL migrations (see `docs/database-model.md`).
- **Tailwind CSS** for styling.
- **Server Components by default**; Client Components only where
  interactivity requires them, kept as small and low as possible in the
  component tree.

## Cross-cutting principles

- **Business logic outside presentation components.** UI components
  render; logic lives in `src/lib`, module-specific server code, or
  server actions.
- **Controlled vocabularies are data, not code.** Roles, institution
  types, relationship types, and similar enumerations are stored and
  managed as data (ultimately in the database), never hard-coded into
  interface components — see `docs/controlled-vocabularies.md`.
- **Row Level Security is the default enforcement layer** for data access
  once Supabase is introduced; it is never disabled in production.
- **Secrets stay server-side.** Service-role keys and other secrets are
  never referenced from Client Components or exposed to the browser.
- **Auditability.** Administrative writes are designed so that an audit
  log can be added without reshaping the write path.

## Planned modules

- **Authentication** — account creation, login, session management, and
  the boundary between authenticated accounts and person records.
- **People and profiles** — the core person entity, profile pages, and
  the distinction between verified, provisional/nominated, and
  claimed-but-unverified people.
- **PDBFF participation history** — records of a person's involvement in
  PDBFF over time (potentially multiple periods, roles, and contexts per
  person).
- **Career history** — a person's broader academic/professional history,
  distinct from PDBFF-specific participation.
- **Institutions** — universities, agencies, and organizations associated
  with people, projects, and participation periods.
- **Person nominations** — the process by which one person can add or
  propose another person who has not yet registered.
- **Relationships** — person-to-person connections, distinguishing
  inferred from confirmed relationships at all times.
- **Projects** — research projects and initiatives within or connected to
  PDBFF.
- **Publications** — authored or co-authored works linked to people and
  projects.
- **Oral histories** — recorded or transcribed personal accounts and
  interviews.
- **Forum** — member discussion space.
- **Search** — cross-entity search over people, projects, publications,
  and related content.
- **Network visualization** — interactive visualization of the
  person-to-person and person-to-institution/project network.
- **Analytics** — aggregate, non-personal reporting on participation,
  network structure, and platform usage.
- **Administration** — moderation, verification workflows, and
  administrative data management, designed for future auditability.

## Internationalization readiness

The interface language at launch is English, with no other locale
implemented yet. To keep a future Portuguese translation from requiring a
rewrite:

- User-facing copy should stay easy to extract into a translation layer
  rather than being deeply embedded in logic-heavy components.
- Locale is treated as a first-class, if currently fixed, concept (see the
  `LOCALE` constant in `src/app/layout.tsx`) rather than assumed implicitly.
- Routing and content structure should avoid decisions that would be hard
  to adapt to locale-prefixed routes later (e.g. `next-intl` or the App
  Router's built-in i18n routing).

No i18n library or translation infrastructure is added at this stage —
introducing it is a future roadmap item.

## Directory structure

```
src/
  app/          Routes, layouts, and global styles (App Router)
  components/
    layout/     Structural, page-shell components
    ui/         Generic, reusable UI primitives
  features/     Feature modules, one directory per module above
  lib/          Shared utilities and integration code (e.g. future Supabase clients)
  types/        Shared TypeScript types
  config/       Application-level configuration
```
