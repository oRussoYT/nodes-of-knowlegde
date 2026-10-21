# Privacy Model (Initial)

## Status

This document defines the initial visibility levels the platform will
support. It establishes principles for the eventual implementation; it
does not implement enforcement, and no personal data is collected or
displayed by the current project foundation.

## Visibility levels

Every piece of personal information stored about a person is expected to
carry one of the following visibility levels:

- **Public** — visible to anyone, including visitors without an account.
- **Registered members only** — visible only to people who have an
  authenticated account on the platform.
- **Administrators only** — visible only to platform administrators, for
  moderation, verification, or support purposes.
- **Private to the user** — visible only to the person the information is
  about (and, where applicable, administrators acting under the
  "administrators only" level for legitimate platform operations).

Visibility is expected to be controllable per field or per record, not
only at the whole-profile level, since different pieces of information
about the same person may reasonably have different sensitivity.

## Core rule: unregistered people are never public by default

Information submitted **about** a person who has not registered and
confirmed their own account (a provisional or nominated person record,
see `docs/database-model.md`) must **never become public automatically**.
Such information defaults to the most restrictive visibility appropriate
to how it was collected (typically administrators-only or registered
members-only) until the person it describes registers, claims the
record, and explicitly chooses a visibility level for it — or until an
administrator makes a deliberate, accountable decision to publish it
(e.g. for a well-documented historical figure), consistent with the
auditability rule in `CLAUDE.md`.

This protects people who are added to the system by someone else (a
nomination) from having personal information exposed without their
knowledge or consent.

## Relationship to other documents

- `docs/user-roles.md` defines who administrators and registered members
  are.
- `docs/database-model.md` defines the person states (provisional,
  claimed, verified) that visibility rules apply to.
- `CLAUDE.md` requires that any field storing personal data have a
  visibility level decided before it is introduced, and that
  administrative changes to data remain auditable.

## Out of scope for this document

Enforcement mechanism (e.g. PostgreSQL Row Level Security policies),
consent flows, and data retention/deletion policy are intentionally not
specified here and will be defined alongside the database schema.
