// Pure, dependency-free validation for the review feature's Server
// Actions -- same rationale as src/features/identity/validation.ts:
// simple inputs, no validation library, easily unit-tested without I/O.
// FieldErrors/ValidationResult are the same shared shapes every other
// feature's Server-Action validation already uses.

import type { FieldErrors, ValidationResult } from "@/lib/auth/validation";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const DECISION_NOTES_MAX_LENGTH = 2000;

/** Generic uuid shape check -- used for claim ids throughout this feature. */
export function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export interface ClaimIdValue {
  claimId: string;
}

/**
 * Validates the one input every review action (begin-review, approve)
 * needs: a well-formed claim id. Only checks *shape* -- whether the claim
 * actually exists, is in a reviewable state, and the caller is an
 * authorized non-self reviewer is re-checked server-side by the database
 * function itself (begin_claim_review()/approve_profile_claim()), never
 * assumed here.
 */
export function validateClaimIdInput(claimId: FormDataEntryValue | null): ValidationResult<ClaimIdValue> {
  const value = typeof claimId === "string" ? claimId : "";
  const fieldErrors: FieldErrors = {};

  if (!isValidUuid(value)) {
    fieldErrors.claimId = "Something went wrong. Please try again.";
    return { ok: false, fieldErrors };
  }

  return { ok: true, fieldErrors, value: { claimId: value } };
}

export interface RejectClaimInput {
  claimId: FormDataEntryValue | null;
  decisionNotes: FormDataEntryValue | null;
}

export interface RejectClaimValue {
  claimId: string;
  decisionNotes: string | null;
}

/**
 * Validates a rejection form: a well-formed claim id, plus optional,
 * length-capped decision notes. Blank notes normalize to null, matching
 * submit_profile_claim()'s evidence-normalization convention
 * (src/features/identity/validation.ts).
 */
export function validateRejectClaimInput(input: RejectClaimInput): ValidationResult<RejectClaimValue> {
  const claimIdResult = validateClaimIdInput(input.claimId);
  if (!claimIdResult.ok || !claimIdResult.value) {
    return { ok: false, fieldErrors: claimIdResult.fieldErrors };
  }

  const fieldErrors: FieldErrors = {};
  const rawNotes = typeof input.decisionNotes === "string" ? input.decisionNotes.trim() : "";

  if (rawNotes.length > DECISION_NOTES_MAX_LENGTH) {
    fieldErrors.decisionNotes = `Keep the note to ${DECISION_NOTES_MAX_LENGTH} characters or fewer.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    fieldErrors,
    value: { claimId: claimIdResult.value.claimId, decisionNotes: rawNotes || null },
  };
}
