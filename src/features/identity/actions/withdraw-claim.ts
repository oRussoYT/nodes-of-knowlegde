"use server";

// Claim withdrawal. This action performs no ownership or state check of
// its own — public.withdraw_profile_claim() (M3.1) is the actual
// authorization boundary: it enforces `claimant_user_id = auth.uid()` and
// the pending -> withdrawn transition itself, inside a SECURITY DEFINER
// function, precisely because `authenticated` has no UPDATE grant on
// `profile_claims` at all (see that migration's RLS section). Duplicating
// an ownership check here would be redundant at best and a false sense of
// security at worst if it ever drifted from the function's own logic.

import { createClient } from "@/lib/supabase/server";

import { isValidUuid } from "../validation";
import type { WithdrawClaimActionState } from "./state";

export async function withdrawClaimAction(
  _prevState: WithdrawClaimActionState,
  formData: FormData,
): Promise<WithdrawClaimActionState> {
  const claimId = formData.get("claimId");

  if (!isValidUuid(claimId)) {
    return { status: "error", formError: "Something went wrong. Please try again." };
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("withdraw_profile_claim", { p_claim_id: claimId });

  if (error) {
    return {
      status: "error",
      formError: "This claim could not be withdrawn. It may have already been decided or withdrawn.",
    };
  }

  return { status: "success" };
}
