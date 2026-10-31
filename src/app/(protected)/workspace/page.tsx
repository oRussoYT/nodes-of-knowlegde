import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/Alert";
import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { getMyUserId } from "@/features/record-candidates/read";
import { NoteForm } from "@/features/workspace/components/NoteForm";
import { NOTE_KINDS, excerpt } from "@/features/workspace/parse";
import { getMyNotes } from "@/features/workspace/read";

// The private research space (ROTEIRO fase 2, etapa L): only you see it.
export const metadata: Metadata = {
  title: pageTitle("My research space"),
};

export default async function WorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const q = typeof raw.q === "string" ? raw.q.trim().slice(0, 100) : "";
  const [notes, userId] = await Promise.all([getMyNotes(q || null), getMyUserId()]);
  const error = typeof raw.error === "string" ? raw.error : null;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="My research space"
          description="Notes, hypotheses, interviews and readings that only you can see — not even stewards. When something is ready, send it for review and it becomes a proposal for the history."
        />
        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        {raw.deleted === "1" ? (
          <Alert tone="success" className="mt-6">
            Deleted.
          </Alert>
        ) : null}

        <p className="mt-6 text-sm">
          <Link href="/workspace/support" className="underline underline-offset-2">
            Declare your support and ties
          </Link>{" "}
          <span className="text-muted-foreground">— drafts for NIH Other Support and the NSF COA, filled from the record.</span>
        </p>

        <section aria-labelledby="new-heading" className="mt-8">
          <h2 id="new-heading" className="mb-3 text-lg font-semibold text-foreground">
            New
          </h2>
          {userId ? <NoteForm userId={userId} /> : null}
        </section>

        <section aria-labelledby="notes-heading" className="mt-12">
          <h2 id="notes-heading" className="text-lg font-semibold text-foreground">
            My notes ({notes.length})
          </h2>
          <form role="search" method="get" className="mt-3 flex gap-2">
            <label htmlFor="ws-q" className="sr-only">
              Search my notes
            </label>
            <input id="ws-q" name="q" type="search" defaultValue={q} placeholder="Search my notes" className="min-w-0 flex-1 rounded-md border border-border-default bg-surface px-3 py-2 text-sm" />
            <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
              Search
            </button>
          </form>
          {notes.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{q ? "Nothing found." : "Nothing here yet."}</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-md border border-border-default px-4 py-3 text-sm">
                  <Link href={`/workspace/${n.id}`} className="font-medium text-foreground underline underline-offset-2">
                    {n.title}
                  </Link>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {NOTE_KINDS.find((k) => k.key === n.kind)?.label}
                    {n.filePath ? " · with a file" : ""}
                    {n.submittedStatus === "proposed" ? " · sent for review" : n.submittedStatus === "accepted" ? " · in the history" : ""}
                  </span>
                  {n.body ? <p className="mt-1 text-muted-foreground">{excerpt(n.body)}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </Container>
    </main>
  );
}
