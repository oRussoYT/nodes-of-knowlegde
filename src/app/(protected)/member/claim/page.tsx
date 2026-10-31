import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { FormMessage } from "@/components/ui/FormMessage";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { getIdentityStatus } from "@/features/identity/status";
import { getIdentityStatusCopy } from "@/features/identity/copy";

import { ClaimDiscoveryFlow } from "./ClaimDiscoveryFlow";

export const metadata: Metadata = {
  title: pageTitle("Claim a person record"),
};

// New route for M5.3 — the real workflow entry point /member's "Claim a
// person record" FutureAction now links to (see
// src/app/(protected)/member/page.tsx). Nested under /member rather than
// a top-level route: docs/application-information-architecture.md
// reserves `/[person]` for a future person-record *view* page (not
// scheduled this milestone) and a `profile` primary-nav slot for once
// that exists — this page is neither of those. It is the claim-submission
// workflow itself, which the IA doc frames as an extension of the member
// area ("Future member structure: a profile-claim flow ... the mechanism
// that turns an authenticated account into a linked member").
//
// This page never fabricates participation, network, or publication data
// — see src/features/identity/copy.ts and ClaimDiscoveryFlow.tsx for the
// honest-empty-state handling throughout the search/select/submit flow.
export default async function ClaimPage() {
  const status = await getIdentityStatus();

  // Duplicate-prevention, page-level half: a claimant with an active
  // (pending) or approved claim cannot start a new search here — the same
  // condition src/features/identity/actions/submit-claim.ts enforces
  // server-side on the write path (hasActiveOrApprovedClaim). Showing
  // this instead of the search UI avoids presenting an action that would
  // just be rejected on submit, and doubles as this page's
  // "already-linked account" / "permission denied" state.
  const blocked = status.kind === "approved" || status.kind === "pending";

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Claim a person record"
          description="Search for an existing Nodes of Knowledge person record that represents you, and submit a claim for review."
        />

        {blocked ? (
          <div className="mt-8 flex flex-col gap-4">
            <FormMessage tone="info">{getIdentityStatusCopy(status).title}.</FormMessage>
            <p className="text-sm text-muted-foreground">
              <Link href="/member" className="font-medium text-foreground underline underline-offset-2">
                Back to Member area
              </Link>
            </p>
          </div>
        ) : (
          <div className="mt-8">
            <ClaimDiscoveryFlow />
          </div>
        )}
      </Container>
    </main>
  );
}
