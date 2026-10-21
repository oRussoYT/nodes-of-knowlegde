import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormMessage } from "@/components/ui/FormMessage";
import { FutureAction } from "@/components/ui/FutureAction";
import { PageHeader } from "@/components/ui/PageHeader";
import { Section } from "@/components/ui/Section";
import { buttonVariants } from "@/components/ui/Button";
import { pageTitle } from "@/config/site";
import { getIdentityStatus } from "@/features/identity/status";
import { getIdentityStatusCopy } from "@/features/identity/copy";
import { isCurrentUserSteward } from "@/features/review/authorization";
import { createClient } from "@/lib/supabase/server";

import { WithdrawClaimButton } from "./WithdrawClaimButton";

export const metadata: Metadata = {
  title: pageTitle("Member area"),
};

interface MemberPageProps {
  searchParams: Promise<{ confirmed?: string }>;
}

// M5.2 redesign, extended in M5.3 with the real identity-claim status
// (section 3 below). Structure still follows
// docs/application-information-architecture.md's "Dashboard hierarchy"
// exactly: (1) welcome/status header, (2) a real "Your account" summary
// card, (3) identity-claim status, (4) quick links.
//
// This page never queries `people`/`user_person_links` directly — status
// comes entirely from src/features/identity/status.ts, which itself only
// reads the claimant's own `profile_claims` rows plus the one narrow,
// claim-scoped name lookup (get_claimed_person_display_name). See
// docs/decisions/0008-claim-discovery-security-definer-function.md.
//
// Production Experience Phase I: the Member area is deliberately SECONDARY to
// the reading experience. It stays account-focused — authentication status and
// person-record claim state — and never becomes a dashboard or a second
// Explore. The one reading doorway it now offers is the correct one: an
// approved claimant can follow their linked record straight to its canonical
// Person page.
//
// Single-column `Container` deliberately: nothing on this page has enough
// content to justify a second column yet. `Section`/`Stack`/`Grid`
// (src/components/ui) already exist for a future two-column workspace
// layout — composing this page into one later is a page-level change, not
// a new primitive.
export default async function MemberPage({ searchParams }: MemberPageProps) {
  const params = await searchParams;
  const justConfirmed = params.confirmed === "1";

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = typeof data?.claims?.email === "string" ? data.claims.email : "your account";

  const identityStatus = await getIdentityStatus();
  const statusCopy = getIdentityStatusCopy(identityStatus);
  const isSteward = await isCurrentUserSteward();

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        {/* 1. Welcome/status header */}
        <PageHeader title="Member area" />

        {/* Explicit "confirmation success" state — only shown once, right
            after following the signup-confirmation link. */}
        {justConfirmed ? (
          <div className="mt-4">
            <FormMessage tone="success">Your email address has been confirmed.</FormMessage>
          </div>
        ) : null}

        <p className="mt-2 text-sm text-muted-foreground">
          You&apos;re signed in as <strong className="font-medium text-foreground">{email}</strong>.
        </p>

        <Section spacing="sm" className="mt-8 flex flex-col gap-6">
          {/* 2. "Your account" summary card — the same minimal facts
              /account shows, surfaced here too as a real, currently-true
              summary, not a placeholder. */}
          <Card>
            <h2 className="text-sm font-medium text-foreground">Your account</h2>
            <dl className="mt-3 divide-y divide-border-default text-sm">
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-foreground">{email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-foreground">Authenticated</dd>
              </div>
            </dl>
          </Card>

          {/* 3. Identity-claim status — the real workflow, M5.3. Every branch
              renders only real, currently-true state from
              src/features/identity/status.ts. The Member area stays
              account-focused: participation, relationships, and the wider
              network are read in the reading experience (People / Institutions
              / Contributions), never re-created here — and an approved claim now
              offers a doorway straight to the reader's own canonical Person
              page. */}
          {identityStatus.kind === "no_claim" ? (
            <EmptyState
              title={statusCopy.title}
              description={statusCopy.description}
              action={
                <Link href="/member/claim" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
                  Claim a person record
                </Link>
              }
            />
          ) : identityStatus.kind === "pending" ? (
            <EmptyState
              title={statusCopy.title}
              description={statusCopy.description}
              action={<WithdrawClaimButton claimId={identityStatus.claim.id} />}
            />
          ) : identityStatus.kind === "approved" ? (
            <EmptyState
              title={statusCopy.title}
              description={statusCopy.description}
              action={
                <Link
                  href={`/people/${identityStatus.claim.personId}`}
                  className={buttonVariants({ emphasis: "secondary", size: "sm" })}
                >
                  Read your linked record
                </Link>
              }
            />
          ) : identityStatus.kind === "rejected" ? (
            <EmptyState
              title={statusCopy.title}
              description={
                identityStatus.claim.decisionNotes
                  ? `${statusCopy.description} Reviewer note: ${identityStatus.claim.decisionNotes}`
                  : statusCopy.description
              }
              action={
                <Link href="/member/claim" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
                  Search again
                </Link>
              }
            />
          ) : (
            // withdrawn
            <EmptyState
              title={statusCopy.title}
              description={statusCopy.description}
              action={
                <Link href="/member/claim" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
                  Search again
                </Link>
              }
            />
          )}

          {/* 4. Quick links */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <Link href="/account" className="font-medium text-foreground underline underline-offset-2">
              Account
            </Link>
            <FutureAction label="Account → Security" />
            <Link href="/member/suggestions" className="font-medium text-foreground underline underline-offset-2">
              People you may know
            </Link>
            {isSteward ? (
              <Link href="/review/console" className="font-medium text-foreground underline underline-offset-2">
                Steward console
              </Link>
            ) : null}
          </div>
        </Section>
      </Container>
    </main>
  );
}
