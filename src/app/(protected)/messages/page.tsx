import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormMessage } from "@/components/ui/FormMessage";
import { PageHeader } from "@/components/ui/PageHeader";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { pageTitle } from "@/config/site";
import { replyMessageAction } from "@/features/messages/actions";
import { MESSAGE_MAX } from "@/features/messages/parse";
import { getMyMessages, markMyMessagesRead } from "@/features/messages/read";

export const metadata: Metadata = {
  title: pageTitle("Messages"),
};

interface MessagesPageProps {
  searchParams: Promise<{ sent?: string; error?: string }>;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }) + " UTC";
}

// Messages between members. Names only, never email addresses. Opening this
// page marks received messages as read.
export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const { sent, error } = await searchParams;
  const messages = await getMyMessages();
  if (messages.some((m) => m.direction === "received" && !m.read)) await markMyMessagesRead();

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Messages"
          description="Messages with other members. You see names, never email addresses. Whether others can write to you is set in your profile."
        />

        <div className="mt-6 space-y-3">
          {sent === "1" ? <FormMessage tone="success">Reply sent.</FormMessage> : null}
          {error ? <FormMessage tone="error">{error}</FormMessage> : null}
        </div>

        {messages.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="No messages yet"
              description="Find someone in People and use “Get in touch” on their page. To receive messages, turn them on in your profile."
              action={
                <Link href="/profile" className="text-sm underline underline-offset-4">
                  Open your profile
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {messages.map((m) => (
              <article
                key={m.id}
                className={`rounded-2xl border bg-surface p-5 ${m.direction === "received" && !m.read ? "border-foreground" : "border-border-default"}`}
              >
                <header className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold text-foreground">
                    {m.direction === "received" ? "From " : "To "}
                    {m.otherPersonId ? (
                      <Link href={`/people/${m.otherPersonId}`} className="underline underline-offset-4">
                        {m.otherLabel}
                      </Link>
                    ) : (
                      m.otherLabel
                    )}
                    {m.direction === "received" && !m.read ? <span className="ml-2 rounded-full bg-nk-lime px-2 py-0.5 text-xs text-nk-ink">New</span> : null}
                  </h2>
                  <p className="text-xs text-muted-foreground">{when(m.createdAt)}</p>
                </header>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-foreground">{m.body}</p>
                {m.direction === "received" ? (
                  <form action={replyMessageAction} className="mt-4 space-y-2">
                    <input type="hidden" name="messageId" value={m.id} />
                    <label htmlFor={`reply-${m.id}`} className="sr-only">
                      Reply to {m.otherLabel}
                    </label>
                    <textarea
                      id={`reply-${m.id}`}
                      name="body"
                      rows={2}
                      maxLength={MESSAGE_MAX}
                      required
                      placeholder={`Reply to ${m.otherLabel}`}
                      className="w-full rounded-xl border border-border-default bg-background px-4 py-2.5 text-[15px] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                    />
                    <SubmitButton pendingLabel="Sending…">Reply</SubmitButton>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
