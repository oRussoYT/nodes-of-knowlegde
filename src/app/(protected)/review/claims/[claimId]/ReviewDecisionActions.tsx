"use client";

// The two irreversible-from-here decisions a reviewer can make on an
// under_review claim: approve or reject. Each is behind its own Radix
// Dialog confirmation (docs/design-system-architecture.md's approved
// primitive -- see src/components/ui/Dialog.tsx), per the milestone's
// explicit "confirmation before irreversible decisions" accessibility
// requirement. public.approve_profile_claim()/reject_profile_claim() are
// the actual authorization/atomicity boundary -- see
// src/features/review/actions/{approve-claim,reject-claim}.ts; this
// component only renders the two forms and reacts to their result.

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/Dialog";
import { FieldError } from "@/components/ui/FieldError";
import { FormMessage } from "@/components/ui/FormMessage";
import { HelperText } from "@/components/ui/HelperText";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Textarea } from "@/components/ui/Textarea";
import { approveClaimAction } from "@/features/review/actions/approve-claim";
import { rejectClaimAction } from "@/features/review/actions/reject-claim";
import { initialApproveClaimState, initialRejectClaimState } from "@/features/review/actions/state";
import { APPROVE_CONFIRM_COPY, REJECT_CONFIRM_COPY } from "@/features/review/copy";
import { DECISION_NOTES_MAX_LENGTH } from "@/features/review/validation";

interface ReviewDecisionActionsProps {
  claimId: string;
}

export function ReviewDecisionActions({ claimId }: ReviewDecisionActionsProps) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const [approveState, approveFormAction] = useActionState(approveClaimAction, initialApproveClaimState);
  const [rejectState, rejectFormAction] = useActionState(rejectClaimAction, initialRejectClaimState);

  const approveSuccessRef = useRef<HTMLParagraphElement>(null);
  const rejectSuccessRef = useRef<HTMLParagraphElement>(null);

  const router = useRouter();

  // On success, the dialog itself stops being rendered at all (the early
  // returns below swap in a status message instead -- no need to close it
  // via state). Move focus to that status message, which this component
  // renders itself so it's reliable regardless of exactly when the
  // server refresh below finishes, and re-run the detail page's Server
  // Component so it re-reads the claim's now-decided status.
  useEffect(() => {
    if (approveState.status === "success") {
      approveSuccessRef.current?.focus();
      router.refresh();
    }
  }, [approveState.status, router]);

  useEffect(() => {
    if (rejectState.status === "success") {
      rejectSuccessRef.current?.focus();
      router.refresh();
    }
  }, [rejectState.status, router]);

  if (approveState.status === "success") {
    return (
      <p ref={approveSuccessRef} role="status" tabIndex={-1} className="text-sm font-medium text-foreground focus:outline-none">
        Claim approved.
      </p>
    );
  }

  if (rejectState.status === "success") {
    return (
      <p ref={rejectSuccessRef} role="status" tabIndex={-1} className="text-sm font-medium text-foreground focus:outline-none">
        Claim rejected.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogTrigger asChild>
          <Button type="button">Approve claim</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>{APPROVE_CONFIRM_COPY.title}</DialogTitle>
          <DialogDescription>{APPROVE_CONFIRM_COPY.description}</DialogDescription>
          <form action={approveFormAction} className="mt-4 flex flex-col gap-3">
            <input type="hidden" name="claimId" value={claimId} />
            {approveState.status === "error" && approveState.formError ? (
              <FormMessage tone="error">{approveState.formError}</FormMessage>
            ) : null}
            <div className="flex flex-wrap justify-end gap-3">
              <DialogClose asChild>
                <Button type="button" emphasis="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <SubmitButton pendingLabel="Approving…">{APPROVE_CONFIRM_COPY.confirmLabel}</SubmitButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button type="button" emphasis="secondary">
            Reject claim
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>{REJECT_CONFIRM_COPY.title}</DialogTitle>
          <DialogDescription>{REJECT_CONFIRM_COPY.description}</DialogDescription>
          <form action={rejectFormAction} className="mt-4 flex flex-col gap-4">
            <input type="hidden" name="claimId" value={claimId} />
            {rejectState.status === "error" && rejectState.formError ? (
              <FormMessage tone="error">{rejectState.formError}</FormMessage>
            ) : null}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="decisionNotes">Note to claimant (optional)</Label>
              <Textarea
                id="decisionNotes"
                name="decisionNotes"
                maxLength={DECISION_NOTES_MAX_LENGTH}
                invalid={Boolean(rejectState.fieldErrors?.decisionNotes)}
                aria-describedby={rejectState.fieldErrors?.decisionNotes ? "decision-notes-error" : "decision-notes-hint"}
              />
              <HelperText id="decision-notes-hint">
                The claimant will see this note. Keep it concise and factual.
              </HelperText>
              {rejectState.fieldErrors?.decisionNotes ? (
                <FieldError id="decision-notes-error">{rejectState.fieldErrors.decisionNotes}</FieldError>
              ) : null}
            </div>
            <div className="flex flex-wrap justify-end gap-3">
              <DialogClose asChild>
                <Button type="button" emphasis="secondary">
                  Cancel
                </Button>
              </DialogClose>
              <SubmitButton pendingLabel="Rejecting…">{REJECT_CONFIRM_COPY.confirmLabel}</SubmitButton>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
