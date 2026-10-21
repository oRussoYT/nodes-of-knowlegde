# src/features

Feature modules (e.g. `people`, `participation`, `relationships`,
`nominations`, `institutions`, `projects`, `publications`, `oral-histories`,
`forum`, `search`, `network`, `analytics`, `admin`). Each feature owns its
own components, server actions/queries, and types, kept separate from
generic UI and from other features. See docs/architecture.md for the
planned module boundaries.

- `auth` (M4) — authentication Server Actions and action-state types.
- `identity` (M5.3) — the identity-claiming feature: pure claim-status
  derivation and state-to-copy mapping (`derive-status.ts`, `copy.ts`),
  validation (`validation.ts`), the read-only status lookup used by
  `/member`/`/account` (`status.ts`), and the claim-discovery/submission/
  withdrawal Server Actions (`actions/`). Does not include the person
  record itself or any admin/review functionality — see
  `docs/decisions/0008-claim-discovery-security-definer-function.md` and
  `docs/application-information-architecture.md`'s "Future member
  structure" for what was still deferred as of M5.3 (a person-record view,
  claim review — now built, see `review` below — and
  participation/relationships/publications, still deferred).
- `review` (M5.4) — the claim-review feature, a distinct audience from
  `identity` above (reviewer, not claimant) sharing only the same
  `ClaimStatus` vocabulary (re-exported from `identity/types.ts`, not
  duplicated): reviewer-authorization state mapping (`authorization.ts`,
  wrapping `am_i_a_reviewer()`), pure status-transition/action-availability
  logic (`types.ts`), reviewer-facing copy with no name-similarity-implies-
  identity language (`copy.ts`), input validation (`validation.ts`), the
  read-only queue/detail lookups (`queue.ts`, `detail.ts`, wrapping
  `list_claims_for_review()`/`get_claim_review_detail()`), and the
  begin-review/approve/reject Server Actions (`actions/`, wrapping
  `begin_claim_review()`/`approve_profile_claim()`/`reject_profile_claim()`).
  Every authorization and state-transition decision is enforced inside
  PostgreSQL (`supabase/migrations/20260802130000_add_claim_review_governance.sql`);
  nothing in this module is itself an authorization boundary — see
  `docs/decisions/0009-reviewer-authorization-table.md`. No general
  role-management UI, moderation beyond identity claims, or link-revocation
  workflow exists here — see that ADR's "Consequences"/"Risks" for what
  remains deferred.

No other feature modules exist yet.
