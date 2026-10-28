import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Textarea } from "@/components/ui/Textarea";
import { pageTitle } from "@/config/site";
import { hidePostAction, replyAction } from "@/features/forum/actions";
import { when } from "@/features/forum/parse";
import { getThread } from "@/features/forum/read";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: pageTitle("Forum"),
};

export default async function ThreadPage({
  params,
  searchParams,
}: {
  params: Promise<{ threadId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { threadId } = await params;
  const raw = await searchParams;
  if (!UUID.test(threadId)) notFound();
  const thread = await getThread(threadId);
  if (!thread) notFound();
  const error = typeof raw.error === "string" ? raw.error : null;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <p className="text-sm">
          <Link href={`/forum/${thread.nodeSlug}`} className="underline underline-offset-2">
            Forum
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-foreground">{thread.title}</h1>
        <ol className="mt-8 flex flex-col gap-4">
          {thread.posts.map((p) => (
            <li key={p.id} className="rounded-md border border-border-default px-4 py-3">
              <p className="text-xs text-muted-foreground">
                {p.author} · {when(p.createdAt)}
              </p>
              <p className="mt-2 whitespace-pre-line text-foreground">{p.body}</p>
              {p.isMine || thread.canModerate ? (
                <form action={hidePostAction} className="mt-2">
                  <input type="hidden" name="postId" value={p.id} />
                  <input type="hidden" name="threadId" value={thread.id} />
                  <Button type="submit" size="sm" emphasis="ghost">
                    {p.isMine ? "Remove my message" : "Hide (steward)"}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ol>
        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        <form id="reply" action={replyAction} className="mt-8 flex flex-col gap-3">
          <input type="hidden" name="threadId" value={thread.id} />
          <Textarea aria-label="Your reply" name="body" rows={4} required maxLength={10000} />
          <div>
            <Button type="submit">Reply</Button>
          </div>
        </form>
      </Container>
    </main>
  );
}
