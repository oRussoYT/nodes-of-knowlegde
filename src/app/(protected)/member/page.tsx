import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormMessage } from "@/components/ui/FormMessage";
import { FutureAction } from "@/components/ui/FutureAction";
import { Section } from "@/components/ui/Section";
import { buttonVariants } from "@/components/ui/Button";
import { ActionTile } from "@/components/ui/Tiles";
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
    <main id="main-content" tabIndex={-1} className="px-4 py-6 sm:px-8 sm:py-10">
      <Container width="content" padded={false}>
        {/* 1. Welcome band (ink, like the home page). */}
        <section data-theme="dark" className="relative overflow-hidden rounded-3xl bg-nk-ink px-7 py-10 text-nk-bone sm:px-12 sm:py-14">
          <p className="flex items-center gap-3 text-sm text-[#c3c8b6]">
            <span aria-hidden="true" className="nk-live-dot" />
            You&apos;re signed in as <strong className="font-medium text-nk-bone">{email}</strong>.
          </p>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] sm:text-7xl">
            Member area
          </h1>
          <p className="mt-5 max-w-xl text-lg text-[#c3c8b6]">
            Read the record, find your own place in it, and see who you were documented alongside.
          </p>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full border-[28px] border-nk-lime/90 sm:-right-10 sm:-top-10"
          />
        </section>

        {/* Explicit "confirmation success" state — only shown once, right
            after following the signup-confirmation link. */}
        {justConfirmed ? (
          <div className="mt-4">
            <FormMessage tone="success">Your email address has been confirmed.</FormMessage>
          </div>
        ) : null}

        <Section spacing="sm" className="mt-6 flex flex-col gap-6">
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

          {/* 4. Where to go next -- whole-card links, not a list of records. */}
          <section aria-labelledby="next-heading">
            <h2 id="next-heading" className="mt-6 font-display text-3xl font-bold tracking-tight text-foreground">
              Where to go next
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <ActionTile
                href="/explore"
                title="Read the record"
                description="People, institutions and contributions, each with its sources."
              />
              {identityStatus.kind === "approved" ? null : (
                <ActionTile
                  href="/member/claim"
                  title="Find your record"
                  description="Search for the person record that is you and ask to link it to this account."
                />
              )}
              <ActionTile
                href="/member/suggestions"
                title="People you may know"
                description="Documented in the same place at the same time, or trained by the same mentor. Always with the reason."
              />
              <ActionTile
                href="/member/contributions"
                title="Propose a contribution"
                description="Something you helped bring into being. A steward checks what documents it."
              />
              {isSteward ? (
                <ActionTile
                  href="/review/console"
                  title="Steward console"
                  description="Import graduate lists, see where they went, and work through what needs a human."
                />
              ) : null}
              <ActionTile href="/account" title="Account" description="Your email and sign-in details." />
            </div>
            <div className="mt-4 text-sm">
              <FutureAction label="Account → Security" />
            </div>
          </section>
        </Section>
      </Container>
    </main>
  );
}
