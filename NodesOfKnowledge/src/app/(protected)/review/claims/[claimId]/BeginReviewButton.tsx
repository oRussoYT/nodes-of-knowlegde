"use client";

// Small, self-contained "begin review" control, the same
// boundary-minimization pattern as WithdrawClaimButton
// (src/app/(protected)/member/WithdrawClaimButton.tsx): the detail page
// stays a Server Component that reads claim data once per request, and
// this Client Component only renders the form and reacts to the result.
// public.begin_claim_review() is the actual authorization/state boundary
// -- see src/features/review/actions/begin-review.ts.

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import { FormMessage } from "@/components/ui/FormMessage";
import { HelperText } from "@/components/ui/HelperText";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { beginReviewAction } from "@/features/review/actions/begin-review";
import { initialBeginReviewState } from "@/features/review/actions/state";
import { BEGIN_REVIEW_HELPER } from "@/features/review/copy";

interface BeginReviewButtonProps {
  claimId: string;
}

export function BeginReviewButton({ claimId }: BeginReviewButtonProps) {
  const [state, formAction] = useActionState(beginReviewAction, initialBeginReviewState);
  const router = useRouter();

  // On success, re-run the detail page's Server Component so it re-reads
  // the claim's now-under_review status and shows the approve/reject
  // controls in its place -- this component holds no status state of its
  // own to update locally.
  useEffect(() => {
    if (state.status === "success") {
      router.refresh();
    }
  }, [state.status, router]);

  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="claimId" value={claimId} />
      {state.status === "error" && state.formError ? <FormMessage tone="error">{state.formError}</FormMessage> : null}
      <SubmitButton pendingLabel="Starting review…">Begin review</SubmitButton>
      <HelperText>{BEGIN_REVIEW_HELPER}</HelperText>
    </form>
  );
}
