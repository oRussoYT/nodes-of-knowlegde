import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { decideContributionAction } from "@/features/contribution-candidates/actions";
import { listCandidateQueue } from "@/features/contribution-candidates/read";
import { describePeriod } from "@/features/institution-names/parse";

// The review queue for proposed contributions (candidate -> review -> record).
// Oldest first -- a queue, never a ranking. Accepting writes a PROVISIONAL
// contribution that keeps what documents it; rejecting needs a reason the
// proposer will read. Nobody reviews their own proposal.
export const metadata: Metadata = {
  title: pageTitle("Proposed contributions"),
};

export default async function ContributionQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const error = typeof raw.error === "string" ? raw.error : null;
  const queue = await listCandidateQueue();

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Proposed contributions"
          description="Waiting for a human. Nothing here is part of the record until you accept it."
          action={
            <Link href="/review/console" className="text-sm underline underline-offset-2">
              Steward console
            </Link>
          }
        />

        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}

        {queue === null ? (
          <EmptyState className="mt-8" title="This queue could not be loaded" />
        ) : queue.length === 0 ? (
          <EmptyState className="mt-8" title="Nothing waiting" description="New proposals from people at your institution appear here." />
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {queue.map((c) => {
              const period = describePeriod(c.startYear, c.endYear);
              return (
                <li key={c.id} className="rounded-md border border-border-default px-4 py-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-foreground">{c.title}</h2>
                    <Badge size="sm" tone="info">
                      Waiting for review
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    <Link href={`/people/${c.personId}`} className="text-foreground underline underline-offset-2">
                      {c.displayName}
                    </Link>
                    {" · "}
                    {c.kindLabel}
                    {c.capacityLabel ? ` · ${c.capacityLabel}` : ""}
                    {period ? ` · ${period}` : ""}
                    {c.toldByThePerson ? " · told by the person" : " · proposed by a steward"}
                  </p>
                  {c.description ? <p className="mt-2 text-foreground">{c.description}</p> : null}
                  <p className="mt-2">
                    <span className="text-muted-foreground">Documented by: </span>
                    <span className="text-foreground">{c.sourceNote}</span>
                  </p>

                  {c.isOwnProposal ? (
                    <p className="mt-3 text-muted-foreground">You proposed this, so someone else must review it.</p>
                  ) : (
                    <form action={decideContributionAction} className="mt-4 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="candidateId" value={c.id} />
                      <div className="flex min-w-60 flex-1 flex-col gap-1.5">
                        <Label htmlFor={`note-${c.id}`}>Note (required to reject)</Label>
                        <Input id={`note-${c.id}`} name="note" placeholder="e.g. Thesis checked in the library" />
                      </div>
                      <Button type="submit" name="decision" value="accept" size="sm">
                        Add to the record
                      </Button>
                      <Button type="submit" name="decision" value="reject" size="sm" emphasis="secondary">
                        Do not add
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </main>
  );
}
