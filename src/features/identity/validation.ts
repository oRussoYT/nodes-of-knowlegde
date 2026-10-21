// Pure, dependency-free validation for the identity-claiming feature —
// same rationale as src/lib/auth/validation.ts: simple inputs, no
// validation library, easily unit-tested without I/O.

import type { FieldErrors } from "@/lib/auth/validation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const SEARCH_QUERY_MAX_LENGTH = 200;
export const EVIDENCE_MAX_LENGTH = 2000;

/**
 * Normalizes a raw search input: trims and caps length. A blank result
 * means "browse" (no filter), not an error — search is optional, per the
 * milestone's "browse eligible existing person records" requirement.
 */
export function normalizeSearchQuery(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.trim().slice(0, SEARCH_QUERY_MAX_LENGTH);
}

/** Generic uuid shape check — used for person ids, claim ids, and the like. */
export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export interface ClaimSubmissionInput {
  personId: FormDataEntryValue | null;
  evidence: FormDataEntryValue | null;
}

export interface ClaimSubmissionValue {
  personId: string;
  evidence: string | null;
}

export interface ValidationResult<T> {
  ok: boolean;
  value?: T;
  fieldErrors: FieldErrors;
}

/**
 * Validates a claim-submission form. `personId` must be a well-formed
 * uuid selected from a prior search result — this function only checks
 * *shape*, not eligibility (whether the person is actually claimable is
 * re-checked server-side against the `is_person_claimable` database
 * function before insert — see src/features/identity/actions/submit-claim.ts).
 * `evidence` is optional free text, capped to a concise length per the
 * milestone's "concise, auditable, purpose-specific" requirement — this is
 * not a general-purpose text field.
 */
export function validateClaimSubmission(input: ClaimSubmissionInput): ValidationResult<ClaimSubmissionValue> {
  const fieldErrors: FieldErrors = {};

  const personId = typeof input.personId === "string" ? input.personId : "";
  if (!isValidUuid(personId)) {
    fieldErrors.personId = "Choose a person record from the search results before submitting a claim.";
  }

  const rawEvidence = typeof input.evidence === "string" ? input.evidence.trim() : "";
  if (rawEvidence.length > EVIDENCE_MAX_LENGTH) {
    fieldErrors.evidence = `Keep your note to ${EVIDENCE_MAX_LENGTH} characters or fewer.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    fieldErrors,
    value: { personId, evidence: rawEvidence || null },
  };
}
