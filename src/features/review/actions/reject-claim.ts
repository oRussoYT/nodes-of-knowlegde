"use server";

// Claim rejection. Like approval, this action performs no authorization
// or state check of its own -- public.reject_profile_claim() (M5.4) is
// the actual boundary: reviewer authorization, self-review rejection, and
// the reviewable-state check all happen inside that one SECURITY DEFINER
// function. Rejection never creates a user_person_links row.

import { createClient } from "@/lib/supabase/server";

import { validateRejectClaimInput } from "../validation";
import type { RejectClaimActionState } from "./state";

export async function rejectClaimAction(
  _prevState: RejectClaimActionState,
  formData: FormData,
): Promise<RejectClaimActionState> {
  const validation = validateRejectClaimInput({
    claimId: formData.get("claimId"),
    decisionNotes: formData.get("decisionNotes"),
  });

  if (!validation.ok || !validation.value) {
    return { status: "error", fieldErrors: validation.fieldErrors };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("reject_profile_claim", {
    p_claim_id: validation.value.claimId,
    // p_decision_notes has SQL DEFAULT NULL: omit (undefined) when absent so
    // the default applies and absent notes remain null in the database.
    p_decision_notes: validation.value.decisionNotes ?? undefined,
  });

  if (error) {
    const raw = error.message ?? "";

    if (raw.includes("reviewer authorization required")) {
      return { status: "error", formError: "You don't have permission to review claims." };
    }

    if (raw.includes("cannot decide their own claim")) {
      return { status: "error", formError: "You cannot review your own claim." };
    }

    if (raw.includes("not in a reviewable state") || raw.includes("claim not found")) {
      return {
        status: "error",
        formError: "This claim is no longer available to reject. It may have already been decided.",
      };
    }

    return { status: "error", formError: "Something went wrong. Please try again." };
  }

  return { status: "success" };
}
