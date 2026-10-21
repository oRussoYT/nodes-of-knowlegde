"use server";

// Claim submission — the one write this milestone performs against
// `profile_claims`.
//
// SECURITY CORRECTION (M5.3 review): this action used to check
// is_person_claimable(), check the caller's existing claims, and insert,
// as three separate round trips — a check-then-act sequence a concurrent
// request could race between. All three steps now happen atomically
// inside a single database function, public.submit_profile_claim() (see
// supabase/migrations/20260802110300_add_claim_discovery_search_function.sql
// and docs/decisions/0008-claim-discovery-security-definer-function.md's
// addendum). This action's only remaining jobs are: validate input shape,
// call that function, and map its errors to a safe, specific message.
// It performs no business-rule checks of its own — duplicate prevention
// and eligibility are the database function's responsibility now, not
// this action's, since only the database can make that check atomic with
// the insert.
import { createClient } from "@/lib/supabase/server";

import { validateClaimSubmission } from "../validation";
import type { SubmitClaimActionState } from "./state";

export async function submitClaimAction(
  _prevState: SubmitClaimActionState,
  formData: FormData,
): Promise<SubmitClaimActionState> {
  const validation = validateClaimSubmission({
    personId: formData.get("personId"),
    evidence: formData.get("evidence"),
  });

  if (!validation.ok || !validation.value) {
    return { status: "error", fieldErrors: validation.fieldErrors };
  }

  const supabase = await createClient();

  // submit_profile_claim() derives the claimant from auth.uid() itself —
  // this action never passes an account/user id of any kind. The
  // function also never accepts a status, reviewer, or link value, so
  // there is nothing here to validate on that front either.
  const { error } = await supabase.rpc("submit_profile_claim", {
    p_person_id: validation.value.personId,
    // p_supporting_evidence has SQL DEFAULT NULL: omit (undefined) when absent
    // so the default applies; the function still normalizes blank -> null.
    p_supporting_evidence: validation.value.evidence ?? undefined,
  });

  if (error) {
    // submit_profile_claim() raises specific, safe-to-show messages for
    // the two real failure cases; anything else (a transient DB error)
    // falls back to a generic message. Matched by substring rather than
    // SQLSTATE alone since both failure cases share the same P0001 code.
    const raw = error.message ?? "";

    if (raw.includes("not eligible to be claimed")) {
      return {
        status: "error",
        formError: "This person record is no longer available to claim. Please search again.",
      };
    }

    if (raw.includes("already have a claim")) {
      return {
        status: "error",
        formError:
          "You already have a claim in progress, or an approved link. Withdraw your existing claim before submitting a new one.",
      };
    }

    return { status: "error", formError: "Something went wrong while submitting your claim. Please try again." };
  }

  return { status: "success" };
}
