import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { pageTitle } from "@/config/site";
import { getMyUserId } from "@/features/record-candidates/read";
import { deleteNoteAction, submitNoteAction } from "@/features/workspace/actions";
import { NoteForm } from "@/features/workspace/components/NoteForm";
import { getMyNote } from "@/features/workspace/read";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: pageTitle("My research space"),
};

export default async function NotePage({
  params,
  searchParams,
}: {
  params: Promise<{ noteId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { noteId } = await params;
  const raw = await searchParams;
  if (!UUID.test(noteId)) notFound();
  const [found, userId] = await Promise.all([getMyNote(noteId), getMyUserId()]);
  if (!found || !userId) notFound();
  const { note, fileUrl } = found;
  const error = typeof raw.error === "string" ? raw.error : null;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <p className="text-sm">
          <Link href="/workspace" className="underline underline-offset-2">
            My research space
          </Link>{" "}
          <span className="text-muted-foreground">· private — only you see this</span>
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">{note.title}</h1>

        {raw.saved === "1" ? (
          <Alert tone="success" className="mt-6">
            Saved.
          </Alert>
        ) : null}
        {raw.submitted === "1" ? (
          <Alert tone="success" className="mt-6">
            Sent for review. A steward will look at it; your private note stays here.
          </Alert>
        ) : null}
        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}

        {fileUrl ? (
          <p className="mt-4 text-sm">
            <a href={fileUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
              Open the file
            </a>
          </p>
        ) : null}

        <div className="mt-6">
          <NoteForm note={note} userId={userId} />
        </div>

        <section aria-labelledby="share-heading" className="mt-10 rounded-md border border-border-default px-4 py-4">
          <h2 id="share-heading" className="text-lg font-semibold text-foreground">
            Ready to share?
          </h2>
          {note.submittedItemId ? (
            <p className="mt-2 text-sm text-foreground">
              Sent for review —{" "}
              <Link href={`/history/${note.submittedItemId}`} className="underline underline-offset-2">
                {note.submittedStatus === "accepted" ? "now in the history (provisional)" : note.submittedStatus === "rejected" ? "declined (see the reason)" : "waiting for a steward"}
              </Link>
              .
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                It becomes a proposal for the history ({note.kind === "interview" ? "an oral history" : "a document"}), with its file and the people it is about. A steward checks it first.
              </p>
              <form action={submitNoteAction} className="mt-3">
                <input type="hidden" name="id" value={note.id} />
                <Button type="submit" emphasis="secondary">
                  Send for review
                </Button>
              </form>
            </>
          )}
        </section>

        <form action={deleteNoteAction} className="mt-6">
          <input type="hidden" name="id" value={note.id} />
          <Button type="submit" emphasis="ghost" size="sm">
            Delete this note
          </Button>
        </form>
      </Container>
    </main>
  );
}
