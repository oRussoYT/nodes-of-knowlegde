import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { getReviewStatusLabel } from "@/features/review/copy";
import { getReviewClaimDetail } from "@/features/review/detail";
import { isReviewActionAvailable, type ClaimStatus } from "@/features/review/types";

import { BeginReviewButton } from "./BeginReviewButton";
import { ReviewDecisionActions } from "./ReviewDecisionActions";

export const metadata: Metadata = {
  title: pageTitle("Review claim"),
};

const STATUS_TONE: Record<ClaimStatus, BadgeTone> = {
  submitted: "neutral",
  under_review: "info",
  approved: "success",
  rejected: "danger",
  withdrawn: "neutral",
};

interface ReviewClaimDetailPageProps {
  params: Promise<{ claimId: string }>;
}

// Reached only once src/app/(protected)/review/layout.tsx has already
// confirmed the caller is an active reviewer. get_claim_review_detail()
// returns null identically for "claim doesn't exist" and "not
// authorized" -- notFound() below renders the same outcome for both,
// which is deliberate: this page never confirms or denies a specific
// claim's existence to anyone who couldn't already see it in the queue.
//
// Sections below are visually and structurally separate, per the
// milestone's explicit "clearly separate: claimant account; historical
// person record; claimant statement/evidence; existing person-record
// provenance; review decision; resulting account-to-person link"
// requirement -- never blended into one undifferentiated fact list, and
// nothing here implies name similarity proves identity.
export default async function ReviewClaimDetailPage({ params }: ReviewClaimDetailPageProps) {
  const { claimId } = await params;
  const claim = await getReviewClaimDetail(claimId);

  if (!claim) {
    notFound();
  }

  const canBeginReview = isReviewActionAvailable(claim.status, "begin_review");
  const canDecide = isReviewActionAvailable(claim.status, "approve") || isReviewActionAvailable(claim.status, "reject");
  const isDecided = claim.status === "approved" || claim.status === "rejected";

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title={`Review: ${claim.personDisplayName}`}
          description="Review the evidence below carefully. Name similarity alone does not confirm identity."
          action={<Badge tone={STATUS_TONE[claim.status]}>{getReviewStatusLabel(claim.status)}</Badge>}
        />

        <div className="mt-8 flex flex-col gap-6">
          {/* Claimant account */}
          <Card>
            <h2 className="text-sm font-medium text-foreground">Claimant account</h2>
            <dl className="mt-3 divide-y divide-border-default text-sm">
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-foreground">{claim.claimantEmail ?? "Unknown"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Submitted</dt>
                <dd className="text-foreground">{new Date(claim.submittedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </Card>

          {/* Historical person record + its existing provenance */}
          <Card>
            <h2 className="text-sm font-medium text-foreground">Claimed person record</h2>
            <dl className="mt-3 divide-y divide-border-default text-sm">
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Name</dt>
                <dd className="text-foreground">{claim.personDisplayName}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Given / family name</dt>
                <dd className="text-foreground">
                  {claim.personGivenName} {claim.personFamilyName}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Verification status</dt>
                <dd className="text-foreground">{claim.personVerificationStatus}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Record source</dt>
                <dd className="text-foreground">{claim.personSourceType}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Record created</dt>
                <dd className="text-foreground">{new Date(claim.personCreatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </Card>

          {/* Claimant statement / evidence */}
          <Card>
            <h2 className="text-sm font-medium text-foreground">Claimant statement</h2>
            <p className="mt-2 text-sm text-foreground">
              {claim.supportingEvidence ?? "No supporting note was provided."}
            </p>
          </Card>

          {/* Review decision, if any */}
          {isDecided || claim.status === "withdrawn" ? (
            <Card>
              <h2 className="text-sm font-medium text-foreground">Review decision</h2>
              <dl className="mt-3 divide-y divide-border-default text-sm">
                <div className="flex items-center justify-between gap-4 py-2">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd className="text-foreground">{getReviewStatusLabel(claim.status)}</dd>
                </div>
                {claim.decidedAt ? (
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-muted-foreground">Decided</dt>
                    <dd className="text-foreground">{new Date(claim.decidedAt).toLocaleString()}</dd>
                  </div>
                ) : null}
                {claim.reviewerEmail ? (
                  <div className="flex items-center justify-between gap-4 py-2">
                    <dt className="text-muted-foreground">Reviewed by</dt>
                    <dd className="text-foreground">{claim.reviewerEmail}</dd>
                  </div>
                ) : null}
              </dl>
              {claim.decisionNotes ? (
                <p className="mt-3 text-sm text-foreground">
                  <span className="text-muted-foreground">Note: </span>
                  {claim.decisionNotes}
                </p>
              ) : null}
              {claim.status === "approved" ? (
                <p className="mt-3 text-sm text-foreground">
                  <span className="text-muted-foreground">Resulting link: </span>
                  {claim.activeLinkExists ? "Active" : "Not active"}
                </p>
              ) : null}
            </Card>
          ) : null}

          {/* Actions */}
          {canBeginReview ? <BeginReviewButton claimId={claim.id} /> : null}
          {canDecide ? <ReviewDecisionActions claimId={claim.id} /> : null}
        </div>
      </Container>
    </main>
  );
}
