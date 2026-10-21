import type { Metadata } from "next";
import Link from "next/link";

import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { getReviewStatusLabel, REVIEW_QUEUE_EMPTY_COPY, REVIEW_QUEUE_INTRO } from "@/features/review/copy";
import { getReviewQueue } from "@/features/review/queue";
import type { ClaimStatus } from "@/features/review/types";

export const metadata: Metadata = {
  title: pageTitle("Claim review queue"),
};

const STATUS_TONE: Record<ClaimStatus, BadgeTone> = {
  submitted: "neutral",
  under_review: "info",
  approved: "success",
  rejected: "danger",
  withdrawn: "neutral",
};

// Reached only once src/app/(protected)/review/layout.tsx has already
// confirmed the caller is an active reviewer. Renders exactly what
// list_claims_for_review() returns -- submitted/under_review claims,
// oldest first -- no fabricated counts, no participation/network/
// publication content anywhere on this page. Selecting a claim is
// deliberately framed as opening a record to review, not as confirming a
// match -- see src/features/review/copy.ts's REVIEW_QUEUE_INTRO.
export default async function ReviewClaimsPage() {
  const queue = await getReviewQueue();

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Claim review"
          description={REVIEW_QUEUE_INTRO}
          action={
            <Link href="/review/console" className="text-sm underline underline-offset-2">
              Steward console
            </Link>
          }
        />

        <div className="mt-8">
          {queue.length === 0 ? (
            <EmptyState title={REVIEW_QUEUE_EMPTY_COPY.title} description={REVIEW_QUEUE_EMPTY_COPY.description} />
          ) : (
            <ul className="flex flex-col divide-y divide-border-default rounded-md border border-border-default">
              {queue.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/review/claims/${item.id}`}
                    className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-border-focus sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">{item.personDisplayName}</span>
                      <span className="text-xs text-muted-foreground">
                        Claimed by {item.claimantEmail ?? "an account"}
                      </span>
                    </span>
                    <span className="flex items-center gap-3">
                      <Badge tone={STATUS_TONE[item.status]}>{getReviewStatusLabel(item.status)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        Submitted {new Date(item.submittedAt).toLocaleDateString()}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Container>
    </main>
  );
}
