"use server";

// Begin-review: submitted -> under_review. This action performs no
// authorization or state check of its own -- public.begin_claim_review()
// (M5.4) is the actual authorization boundary: it re-derives the reviewer
// from auth.uid(), verifies live reviewer-table membership, rejects
// self-review, and only transitions a claim that is actually 'submitted'
// -- inside a SECURITY DEFINER function, precisely because `authenticated`
// has no UPDATE grant on `profile_claims` at all. This action's only jobs
// are: validate input shape, call that function, and map its errors to a
// safe, specific-where-safe message.

import { createClient } from "@/lib/supabase/server";

import { validateClaimIdInput } from "../validation";
import type { BeginReviewActionState } from "./state";

export async function beginReviewAction(
  _prevState: BeginReviewActionState,
  formData: FormData,
): Promise<BeginReviewActionState> {
  const validation = validateClaimIdInput(formData.get("claimId"));

  if (!validation.ok || !validation.value) {
    return { status: "error", formError: "Something went wrong. Please try again." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("begin_claim_review", {
    p_claim_id: validation.value.claimId,
  });

  if (error) {
    const raw = error.message ?? "";

    if (raw.includes("reviewer authorization required")) {
      return { status: "error", formError: "You don't have permission to review claims." };
    }

    if (raw.includes("cannot review their own claim")) {
      return { status: "error", formError: "You cannot review your own claim." };
    }

    if (raw.includes("not in a reviewable state") || raw.includes("claim not found")) {
      return {
        status: "error",
        formError: "This claim is no longer available to begin review. It may have already been reviewed, decided, or withdrawn.",
      };
    }

    return { status: "error", formError: "Something went wrong. Please try again." };
  }

  return { status: "success" };
}
