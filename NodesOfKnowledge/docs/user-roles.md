# User Roles (Preliminary)

## Status

This document sketches the roles the platform is expected to need, based
on `docs/product-specification.md`, `docs/database-model.md`, and
`docs/privacy-model.md`. Roles, permissions, and enforcement are not
implemented yet; this is a starting point for that later design.

## Anticipated roles

- **Visitor (unauthenticated)** — anyone browsing the platform without an
  account. Can see only information marked **Public** (see
  `docs/privacy-model.md`).
- **Registered member** — has an authenticated user account. Can see
  **Public** and **Registered members only** information, and manage
  their own **Private to the user** data. May or may not have a claimed
  profile (see `docs/database-model.md`).
- **Verified participant** — a registered member whose person record has
  been verified (either self-claimed or administrator-verified). This is
  a status on a person record rather than a separate account type, and
  may unlock the ability to nominate other people, confirm relationships,
  or contribute participation history.
- **Administrator** — trusted platform operator responsible for
  moderation, verification of nominated/provisional people, and
  administrative data management. Can see **Administrators only**
  information and act on behalf of the platform for auditable
  administrative changes.

## Open questions

- Whether a distinct "super administrator" tier is needed for
  platform-level configuration versus day-to-day moderation.
- Whether verified participants need sub-permissions (e.g. to confirm
  relationships) beyond what "verified" implies.
- How role assignment interacts with Supabase Auth and PostgreSQL Row
  Level Security once implemented.

This document will be revised once authentication and the people/profiles
modules are designed in detail.
