import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PageHeader } from "@/components/ui/PageHeader";
import { Textarea } from "@/components/ui/Textarea";
import { pageTitle } from "@/config/site";
import { startThreadAction } from "@/features/forum/actions";
import { when } from "@/features/forum/parse";
import { getThreads } from "@/features/forum/read";
import { nodeLabel } from "@/features/nodes/parse";
import { getNode } from "@/features/nodes/read";

export const metadata: Metadata = {
  title: pageTitle("Forum"),
};

export default async function ForumPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const raw = await searchParams;
  const node = await getNode(slug);
  if (!node) notFound();
  const threads = await getThreads(slug);
  const label = nodeLabel(node);
  const error = typeof raw.error === "string" ? raw.error : null;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title={`${label} forum`}
          description="Conversations among the members of this Node. Be kind; stewards may hide what breaks the rules."
          action={
            <Link href={`/n/${node.slug}`} className="text-sm underline underline-offset-2">
              {label}
            </Link>
          }
        />
        {error ? (
          <Alert tone="danger" className="mt-6">
            {error}
          </Alert>
        ) : null}
        {threads === null ? (
          <EmptyState
            className="mt-8"
            title={`Join ${label} to read and write here`}
            action={
              <Link href={`/n/${node.slug}`} className="text-sm underline underline-offset-2">
                Join {label}
              </Link>
            }
          />
        ) : (
          <>
            <form action={startThreadAction} className="mt-8 flex flex-col gap-3 rounded-md border border-border-default px-4 py-4">
              <input type="hidden" name="slug" value={node.slug} />
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="thread-title">Start a conversation</Label>
                <Input id="thread-title" name="title" required maxLength={200} placeholder="A question, a memory, an idea" />
              </div>
              <Textarea aria-label="Message" name="body" rows={4} required maxLength={10000} />
              <div>
                <Button type="submit">Post</Button>
              </div>
            </form>
            {threads.length === 0 ? (
              <p className="mt-8 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              <ul className="mt-8 flex flex-col gap-2">
                {threads.map((t) => (
                  <li key={t.id} className="rounded-md border border-border-default px-4 py-3 text-sm">
                    <Link href={`/forum/thread/${t.id}`} className="font-medium text-foreground underline underline-offset-2">
                      {t.title}
                    </Link>
                    <p className="mt-1 text-muted-foreground">
                      {t.author} · {t.posts} {t.posts === 1 ? "message" : "messages"} · last {when(t.lastPostAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Container>
    </main>
  );
}
