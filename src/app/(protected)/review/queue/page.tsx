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
import { decideHeritageAction } from "@/features/heritage/actions";
import { describeSpan } from "@/features/heritage/parse";
import { getHeritageProposals } from "@/features/heritage/read";
import { decideRecordCandidateAction } from "@/features/record-candidates/actions";
import { describeCandidate, ORIGIN_LABELS } from "@/features/record-candidates/parse";
import { getRecordQueue, signEvidence } from "@/features/record-candidates/read";

// One review queue for everything that would change the record: periods
// and bonds proposed by members or imported from CVs. Oldest first -- a
// queue, never a ranking. Accepting writes PROVISIONAL records that keep
// their source; declining needs a reason the proposer will read.
export const metadata: Metadata = {
  title: pageTitle("Review queue"),
};

export default async function ReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const error = typeof raw.error === "string" ? raw.error : null;
  const decided = raw.decided === "accepted" || raw.decided === "declined" ? raw.decided : null;
  const queue = await getRecordQueue();
  const pending = (queue ?? []).filter((c) => c.status === "pending");
  const files = await Promise.all(pending.map((c) => signEvidence(c.evidencePaths)));
  const heritage = (await getHeritageProposals()) ?? [];

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Review queue"
          description="Proposals waiting for a human. Nothing here is part of the record until you accept it."
          action={
            <Link href="/review/console" className="text-sm underline underline-offset-2">
              Steward console
            </Link>
          }
        />

        <nav aria-label="Other queues" className="mt-6 flex flex-wrap gap-4 text-sm">
          <Link href="/review/claims" className="underline underline-offset-2">
            Account claims
          </Link>
          <Link href="/review/contributions" className="underline underline-offset-2">
            Proposed contributions
          </Link>
          <Link href="/review/import" className="underline underline-offset-2">
            Imports
          </Link>
        </nav>

        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        {raw.decided === "1" ? (
          <Alert tone="success" className="mt-6">
            Saved.
          </Alert>
        ) : null}
        {decided ? (
          <Alert tone="success" className="mt-6">
            {decided === "accepted" ? "Accepted. It is in the record now, marked provisional." : "Declined. The person will see your reason."}
          </Alert>
        ) : null}

        {queue === null ? (
          <EmptyState className="mt-8" title="This queue could not be loaded" />
        ) : pending.length === 0 ? (
          <EmptyState className="mt-8" title="No periods or bonds waiting" description="Periods and bonds proposed by members appear here." />
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {pending.map((c, i) => (
              <li key={c.id} id={`c-${c.id}`} className="rounded-md border border-border-default px-4 py-4 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold text-foreground">{describeCandidate(c)}</h2>
                  <Badge size="sm" tone="info">
                    Waiting for review
                  </Badge>
                </div>
                <p className="mt-1 text-muted-foreground">
                  <Link href={`/people/${c.aboutPersonId}`} className="text-foreground underline underline-offset-2">
                    {c.aboutPersonName}
                  </Link>
                  {" · "}
                  {ORIGIN_LABELS[c.origin]}
                  {c.sourceType === "self_reported" ? " · told by the person" : " · proposed by someone else"}
                </p>
                {c.summary ? <p className="mt-2 text-foreground">{c.summary}</p> : null}
                <p className="mt-2 text-foreground">
                  <span className="text-muted-foreground">What documents it: </span>
                  {c.sourceNote}
                </p>
                {files[i]!.length > 0 ? (
                  <ul className="mt-2 flex flex-wrap gap-3">
                    {files[i]!.map((f) =>
                      f.url ? (
                        <li key={f.path}>
                          <a href={f.url} target="_blank" rel="noreferrer" className="underline underline-offset-2">
                            📎 {f.name}
                          </a>
                        </li>
                      ) : null,
                    )}
                  </ul>
                ) : null}
                {c.isOwnProposal ? (
                  <p className="mt-3 text-muted-foreground">This is your own proposal — another steward reviews it.</p>
                ) : (
                  <form action={decideRecordCandidateAction} className="mt-3 flex flex-wrap items-end gap-3">
                    <input type="hidden" name="candidateId" value={c.id} />
                    <div className="flex min-w-60 flex-1 flex-col gap-1.5">
                      <Label htmlFor={`note-${c.id}`}>Note to the person (needed when declining)</Label>
                      <Input id={`note-${c.id}`} name="note" maxLength={1000} />
                    </div>
                    <Button type="submit" name="decision" value="accept">
                      Accept as provisional
                    </Button>
                    <Button type="submit" name="decision" value="reject" emphasis="secondary">
                      Decline
                    </Button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {heritage.length > 0 ? (
          <section aria-labelledby="heritage-queue-heading" className="mt-12">
            <h2 id="heritage-queue-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
              Additions to the history
            </h2>
            <ul className="mt-4 flex flex-col gap-4">
              {heritage.map((h) => (
                <li key={h.id} className="rounded-md border border-border-default px-4 py-4 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/history/${h.id}`} className="font-semibold text-foreground underline underline-offset-2">
                      {h.title}
                    </Link>
                    <Badge size="sm" tone="info">
                      Waiting for review
                    </Badge>
                  </div>
                  <p className="mt-1 text-muted-foreground">
                    {h.kindLabel}
                    {describeSpan(h) ? ` · ${describeSpan(h)}` : ""}
                    {h.place ? ` · ${h.place}` : ""}
                    {h.hasFile ? " · with a file" : ""}
                  </p>
                  <p className="mt-2 text-foreground">
                    <span className="text-muted-foreground">What documents it: </span>
                    {h.sourceNote}
                  </p>
                  {h.isMine ? (
                    <p className="mt-3 text-muted-foreground">This is your own addition — another steward reviews it.</p>
                  ) : (
                    <form action={decideHeritageAction} className="mt-3 flex flex-wrap items-end gap-3">
                      <input type="hidden" name="itemId" value={h.id} />
                      <div className="flex min-w-60 flex-1 flex-col gap-1.5">
                        <Label htmlFor={`hnote-${h.id}`}>Note to the person (needed when declining)</Label>
                        <Input id={`hnote-${h.id}`} name="note" maxLength={1000} />
                      </div>
                      <Button type="submit" name="decision" value="accept">
                        Accept as provisional
                      </Button>
                      <Button type="submit" name="decision" value="reject" emphasis="secondary">
                        Decline
                      </Button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </main>
  );
}
