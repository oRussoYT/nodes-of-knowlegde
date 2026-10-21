"use client";

// Client Component: the multi-step search -> select -> confirm -> submit
// flow needs client-side selection state between two separate Server
// Actions (search, submit). Neither Server Action call here ever receives
// an account/user id from this component — see submit-claim.ts's own
// comment for where the claimant's identity actually comes from
// (the verified session, server-side).
//
// States covered, per the milestone's UX requirements: no search
// performed (initial render), no matches, possible matches, selected
// person, claim form, validation error, transient server failure. ("Already
// linked" / "permission denied" is handled one level up, in page.tsx,
// before this component ever renders.)

import { useActionState, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { FieldError } from "@/components/ui/FieldError";
import { FormField } from "@/components/ui/FormField";
import { FormMessage } from "@/components/ui/FormMessage";
import { HelperText } from "@/components/ui/HelperText";
import { Label } from "@/components/ui/Label";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Textarea } from "@/components/ui/Textarea";
import { searchPeopleAction } from "@/features/identity/actions/search-people";
import { submitClaimAction } from "@/features/identity/actions/submit-claim";
import { initialSearchPeopleState, initialSubmitClaimState } from "@/features/identity/actions/state";
import type { ClaimablePerson } from "@/features/identity/types";
import { EVIDENCE_MAX_LENGTH } from "@/features/identity/validation";

export function ClaimDiscoveryFlow() {
  const [searchState, searchFormAction] = useActionState(searchPeopleAction, initialSearchPeopleState);
  const [submitState, submitFormAction] = useActionState(submitClaimAction, initialSubmitClaimState);
  const [selectedPerson, setSelectedPerson] = useState<ClaimablePerson | null>(null);

  const confirmHeadingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the confirmation step when a person is selected, so
  // keyboard/screen-reader users land on the new content instead of
  // staying on the now-hidden "Select" button they just activated.
  useEffect(() => {
    if (selectedPerson) {
      confirmHeadingRef.current?.focus();
    }
  }, [selectedPerson]);

  if (submitState.status === "success") {
    return (
      <FormMessage tone="success">
        Your claim has been submitted for review. You can check its status any time from the Member
        area.
      </FormMessage>
    );
  }

  if (selectedPerson) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 ref={confirmHeadingRef} tabIndex={-1} className="text-base font-medium text-foreground">
            Confirm your claim
          </h2>
          <p role="status" className="mt-1 text-sm text-muted-foreground">
            You selected <strong className="font-medium text-foreground">{selectedPerson.displayName}</strong>.
            This is not yet confirmed as you — review the name carefully before submitting.
          </p>
        </div>

        <form action={submitFormAction} noValidate className="flex flex-col gap-5">
          <input type="hidden" name="personId" value={selectedPerson.id} />

          {submitState.status === "error" && submitState.formError ? (
            <FormMessage tone="error">{submitState.formError}</FormMessage>
          ) : null}
          {submitState.fieldErrors?.personId ? (
            <FormMessage tone="error">{submitState.fieldErrors.personId}</FormMessage>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="evidence">Supporting note (optional)</Label>
            <Textarea
              id="evidence"
              name="evidence"
              maxLength={EVIDENCE_MAX_LENGTH}
              invalid={Boolean(submitState.fieldErrors?.evidence)}
              aria-describedby={
                submitState.fieldErrors?.evidence ? "evidence-error" : "evidence-hint"
              }
            />
            <HelperText id="evidence-hint">
              Anything that helps a reviewer confirm this is you — for example how you were involved
              with PDBFF and roughly when. Not required.
            </HelperText>
            {submitState.fieldErrors?.evidence ? (
              <FieldError id="evidence-error">{submitState.fieldErrors.evidence}</FieldError>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <SubmitButton pendingLabel="Submitting claim…">Submit claim</SubmitButton>
            <Button
              type="button"
              emphasis="secondary"
              onClick={() => setSelectedPerson(null)}
            >
              Choose a different person
            </Button>
          </div>
        </form>
      </div>
    );
  }

  const hasSearched = searchState.status !== "idle";
  const results = searchState.status === "success" ? (searchState.results ?? []) : [];

  return (
    <div className="flex flex-col gap-6">
      <form action={searchFormAction} noValidate className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <FormField
            label="Search by name"
            name="query"
            type="text"
            defaultValue={searchState.query ?? ""}
            hint="Leave blank to browse. Only a name is used to search — no other personal information."
          />
        </div>
        <SubmitButton pendingLabel="Searching…">Search</SubmitButton>
      </form>

      {searchState.status === "error" && searchState.error ? (
        <FormMessage tone="error">{searchState.error}</FormMessage>
      ) : null}

      {hasSearched && searchState.status === "success" ? (
        results.length > 0 ? (
          <div className="flex flex-col gap-3">
            <p role="status" className="text-sm text-muted-foreground">
              {results.length} possible {results.length === 1 ? "match" : "matches"} based on the name
              you searched. None of these are confirmed to be you — review carefully before selecting
              one.
            </p>
            <ul className="flex flex-col divide-y divide-border-default rounded-md border border-border-default">
              {results.map((person) => (
                <li key={person.id} className="flex items-center justify-between gap-4 px-4 py-3">
                  <span className="text-sm text-foreground">{person.displayName}</span>
                  <Button
                    type="button"
                    emphasis="secondary"
                    size="sm"
                    onClick={() => setSelectedPerson(person)}
                  >
                    Select
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <EmptyState
            title="No matching person records found"
            description="Try a different spelling, search for just a last name, or leave the search blank to browse."
          />
        )
      ) : null}
    </div>
  );
}
