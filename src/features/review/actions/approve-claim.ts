"use server";

// Claim approval -- the one write in this feature that also creates a
// user_person_links row. This action performs no authorization,
// eligibility, or duplicate-prevention check of its own --
// public.approve_profile_claim() (M5.4) does all of that atomically,
// inside one SECURITY DEFINER function: reviewer authorization, self-
// review rejection, approvable-state check, person-eligibility
// re-verification, conflicting-link check, the status update, and the
// single resulting link insert all happen in one transaction, or none of
// them do. This action's only jobs are: validate input shape, call that
// function, and map its errors to a safe, specific-where-safe message.

import { createClient } from "@/lib/supabase/server";

import { validateClaimIdInput } from "../validation";
import type { ApproveClaimActionState } from "./state";

export async function approveClaimAction(
  _prevState: ApproveClaimActionState,
  formData: FormData,
): Promise<ApproveClaimActionState> {
  const validation = validateClaimIdInput(formData.get("claimId"));

  if (!validation.ok || !validation.value) {
    return { status: "error", formError: "Something went wrong. Please try again." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("approve_profile_claim", {
    p_claim_id: validation.value.claimId,
  });

  if (error) {
    const raw = error.message ?? "";

    if (raw.includes("reviewer authorization required")) {
      return { status: "error", formError: "You don't have permission to review claims." };
    }

    if (raw.includes("cannot decide their own claim")) {
      return { status: "error", formError: "You cannot review your own claim." };
    }

    if (raw.includes("not in an approvable state") || raw.includes("claim not found")) {
      return {
        status: "error",
        formError: "This claim is no longer available to approve. It may have already been decided.",
      };
    }

    if (raw.includes("no longer eligible to be linked")) {
      return {
        status: "error",
        formError: "This person record is no longer eligible to be linked. Please refresh and check its current status.",
      };
    }

    if (raw.includes("already has an active link") || raw.includes("conflicts with an existing approved claim")) {
      return {
        status: "error",
        formError: "This could not be approved because of a conflicting claim or link. Please refresh and try again.",
      };
    }

    return { status: "error", formError: "Something went wrong. Please try again." };
  }

  return { status: "success" };
}
