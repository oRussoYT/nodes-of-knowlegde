import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { CallCard } from "@/features/funding/CallCard";
import { getMyFundingMatches, listCalls } from "@/features/funding/read";
import { isCurrentUserSteward } from "@/features/review/authorization";

// Calls and grants (ROTEIRO fase 2, etapa J): open calls, and the ones that
// match your own record -- each with why. Ordered by deadline, never ranked.
export const metadata: Metadata = {
  title: pageTitle("Calls and grants"),
};

export default async function FundingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q.trim().slice(0, 100) : "";
  const [mine, calls, isSteward] = await Promise.all([getMyFundingMatches(), listCalls(q || null), isCurrentUserSteward()]);

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Calls and grants"
          description="National and international calls, matched with what your record shows you work on. Each match says why; the order is the deadline."
          action={
            isSteward ? (
              <Link href="/review/funding" className="text-sm underline underline-offset-2">
                Add calls
              </Link>
            ) : undefined
          }
        />

        <section aria-labelledby="mine-heading" className="mt-10">
          <h2 id="mine-heading" className="text-lg font-semibold text-foreground">
            For you
          </h2>
          {!mine.linked ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Link your account to your record, then say what you work on in{" "}
              <Link href="/member/connections" className="underline underline-offset-2">
                Connections
              </Link>
              .
            </p>
          ) : mine.matches.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              No open call matches your themes yet. Add or confirm your themes in{" "}
              <Link href="/member/connections" className="underline underline-offset-2">
                Connections
              </Link>
              .
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {mine.matches.map((c) => (
                <CallCard key={c.id} call={c} />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="all-heading" className="mt-12">
          <h2 id="all-heading" className="text-lg font-semibold text-foreground">
            All open calls
          </h2>
          <form role="search" method="get" className="mt-3 flex gap-2">
            <label htmlFor="funding-q" className="sr-only">
              Search calls
            </label>
            <input id="funding-q" name="q" type="search" defaultValue={q} placeholder="A theme, a funder" className="min-w-0 flex-1 rounded-md border border-border-default bg-surface px-3 py-2 text-sm" />
            <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
              Search
            </button>
          </form>
          {calls.length === 0 ? (
            <EmptyState className="mt-6" title={q ? "No call found" : "No open calls yet"} description="Stewards add calls from funders and from Grants.gov." />
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {calls.map((c) => (
                <CallCard key={c.id} call={c} />
              ))}
            </ul>
          )}
        </section>
      </Container>
    </main>
  );
}
