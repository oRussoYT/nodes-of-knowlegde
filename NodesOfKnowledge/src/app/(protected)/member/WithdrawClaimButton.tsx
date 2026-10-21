"use client";

// Small, self-contained withdraw control for a pending claim, rendered
// from /member's identity-status section. Separate Client Component
// (rather than making the whole /member page a Client Component) so the
// page itself stays a Server Component that reads identity status once
// per request — the same boundary-minimization approach LogoutButton
// (src/components/auth/LogoutButton.tsx) already established.
//
// public.withdraw_profile_claim() (M3.1) is the actual authorization
// boundary — see src/features/identity/actions/withdraw-claim.ts's own
// comment. This component only renders the form and reacts to the
// result.

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { FormMessage } from "@/components/ui/FormMessage";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { withdrawClaimAction } from "@/features/identity/actions/withdraw-claim";
import { initialWithdrawClaimState } from "@/features/identity/actions/state";

interface WithdrawClaimButtonProps {
  claimId: string;
}

export function WithdrawClaimButton({ claimId }: WithdrawClaimButtonProps) {
  const [state, formAction] = useActionState(withdrawClaimAction, initialWithdrawClaimState);
  const router = useRouter();

  // On success, re-run the /member Server Component so it re-reads
  // identity status from the database and reflects the now-withdrawn
  // claim — this component holds no status state of its own to update
  // locally.
  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state.status, router]);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="claimId" value={claimId} />
      {state.status === "error" && state.formError ? (
        <FormMessage tone="error">{state.formError}</FormMessage>
      ) : null}
      <SubmitButton pendingLabel="Withdrawing…">Withdraw claim</SubmitButton>
    </form>
  );
}
