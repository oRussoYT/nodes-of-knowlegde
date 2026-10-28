import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormMessage } from "@/components/ui/FormMessage";
import { FutureAction } from "@/components/ui/FutureAction";
import { Section } from "@/components/ui/Section";
import { buttonVariants } from "@/components/ui/Button";
import { ActionTile } from "@/components/ui/Tiles";
import { pageTitle } from "@/config/site";
import { getIdentityStatus } from "@/features/identity/status";
import { Avatar } from "@/components/ui/Avatar";
import { getMyProfile } from "@/features/member-profile/read";
import { joinNodeAction } from "@/features/nodes/actions";
import { nodeLabel } from "@/features/nodes/parse";
import { getMyNodes, listNodes } from "@/features/nodes/read";
import { getIdentityStatusCopy } from "@/features/identity/copy";
import { isCurrentUserSteward } from "@/features/review/authorization";
import { buildRevelationHighlights, claimRevelationSentence } from "@/features/revelation/highlights";
import { getPersonCohorts, getPersonMentorshipLineage, getPersonRecurrence } from "@/features/revelation/read";
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
  // The claim moment's revelation (screen 02): once the record is yours, what
  // it documents -- counts of documented things only.
  let claimRevelation: string | null = null;
  if (identityStatus.kind === "approved") {
    const linkedId = identityStatus.claim.personId;
    const [c, l, r] = await Promise.all([getPersonCohorts(linkedId), getPersonMentorshipLineage(linkedId), getPersonRecurrence(linkedId)]);
    claimRevelation = claimRevelationSentence(buildRevelationHighlights(linkedId, c, l, r));
  }
  const mine = await getMyProfile();
  const profile = mine?.profile;
  const photoUrl = mine?.photoUrl ?? null;
  const shown = profile?.displayName ?? email;
  const profileStarted = Boolean(profile?.displayName || profile?.headline || profile?.photoPath);
  const [myNodes, allNodes] = await Promise.all([getMyNodes(), listNodes()]);
  const joinable = allNodes.filter((n) => !myNodes.some((m) => m.slug === n.slug));

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
          <section aria-labelledby="profile-heading" className="rounded-3xl border border-border-default bg-surface p-6 sm:p-7">
            <div className="flex flex-wrap items-center gap-5">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- short-lived signed link to a private photo
                <img src={photoUrl} alt={`Photo of ${shown}`} className="size-20 rounded-full object-cover ring-4 ring-nk-lime/70" />
              ) : (
                <Avatar name={shown} size="lg" className="size-20 text-2xl" />
              )}
              <div className="min-w-0 flex-1">
                <h2 id="profile-heading" className="font-display text-2xl font-bold leading-tight tracking-tight text-foreground">
                  {profile?.displayName ?? "Your profile"}
                </h2>
                <p className="mt-1 text-[15px] text-muted-foreground">
                  {profile?.headline ?? (profileStarted ? "" : "Add your photo, your name and a few words about you.")}
                </p>
                {profile?.location ? <p className="text-sm text-muted-foreground">{profile.location}</p> : null}
              </div>
              <Link href="/profile" className={buttonVariants({ emphasis: profileStarted ? "secondary" : "primary", size: "sm" })}>
                {profileStarted ? "Edit your profile" : "Set up your profile"}
              </Link>
            </div>
            <dl className="mt-5 divide-y divide-border-default border-t border-border-default text-sm">
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="text-foreground">{email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2">
                <dt className="text-muted-foreground">Status</dt>
                <dd className="text-foreground">Authenticated</dd>
              </div>
            </dl>
          </section>

          <section aria-labelledby="nodes-heading" className="rounded-3xl border border-border-default bg-surface p-6 sm:p-7">
            <h2 id="nodes-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">
              Your Nodes
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              One account across every Node of Nodes of Knowledge.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {myNodes.map((n) => (
                <Link key={n.slug} href={`/n/${n.slug}`} className="rounded-full bg-nk-lime px-4 py-2 text-sm font-semibold text-nk-ink">
                  {nodeLabel(n)}
                </Link>
              ))}
              {joinable.map((n) => (
                <form key={n.slug} action={joinNodeAction}>
                  <input type="hidden" name="slug" value={n.slug} />
                  <input type="hidden" name="back" value="member" />
                  <button type="submit" className="rounded-full border border-border-default px-4 py-2 text-sm font-medium text-foreground hover:border-foreground">
                    Join {nodeLabel(n)}
                  </button>
                </form>
              ))}
              <Link href="/nodes" className="px-2 py-2 text-sm text-muted-foreground underline underline-offset-4">
                All Nodes
              </Link>
            </div>
          </section>

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
              description={claimRevelation ? `${statusCopy.description} ${claimRevelation}` : statusCopy.description}
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
                href="/member/connections"
                title="Connections"
                description="Themes, methods, organisms and places you share with others — at your institutions and beyond, always with the reason."
              />
              <ActionTile
                href="/member/suggestions"
                title="People you may know"
                description="Documented in the same place at the same time, or trained by the same mentor. Always with the reason."
              />
              <ActionTile
                href="/member/add"
                title="Add to your history"
                description="A period somewhere, someone you worked with, your ORCID or Lattes CV. A steward checks each item."
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
              <ActionTile href="/profile" title="Your profile" description="Your photo and details, plus your email and password under Access and security." />
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
