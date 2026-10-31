import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { decideInterpretationAction } from "@/features/interpretations/actions";
import { getPendingInterpretations } from "@/features/interpretations/read";

// Signed interpretations waiting for a steward. Publishing shows a named
// reading beside the record; it never turns it into a fact.
export const metadata: Metadata = {
  title: pageTitle("Interpretations to review"),
};

export default async function InterpretationReviewPage() {
  const pending = await getPendingInterpretations();
  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Interpretations to review"
          description="Signed readings people wrote about someone in the record. Publish the ones that are fair and respectful; they appear with the author's name, apart from the facts, and the person can hide them."
        />
        {pending.length === 0 ? (
          <EmptyState className="mt-8" title="Nothing waiting" description="New interpretations appear here." />
        ) : (
          <ul className="mt-8 flex flex-col gap-4">
            {pending.map((i) => (
              <li key={i.id} className="rounded-md border border-border-default px-4 py-4 text-sm">
                <p className="text-muted-foreground">
                  About{" "}
                  <Link
                    href={i.subjectType === "person" ? `/people/${i.subjectId}` : `/contributions/${i.subjectId}`}
                    className="font-medium text-foreground underline underline-offset-2"
                  >
                    {i.subjectLabel}
                  </Link>{" "}
                  — by {i.author}, {i.createdAt.slice(0, 10)}
                </p>
                <blockquote className="mt-2 whitespace-pre-line text-foreground">{i.body}</blockquote>
                {i.sources ? <p className="mt-1 text-xs text-muted-foreground">Based on: {i.sources}</p> : null}
                <form action={decideInterpretationAction} className="mt-3 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={i.id} />
                  <input type="hidden" name="returnTo" value="/review/interpretations" />
                  <label className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Note to the author (optional)</span>
                    <input name="note" maxLength={500} className="rounded-md border border-border-default bg-surface px-3 py-2" />
                  </label>
                  <button type="submit" name="decision" value="publish" className={buttonVariants({ emphasis: "primary", size: "sm" })}>
                    Publish
                  </button>
                  <button type="submit" name="decision" value="decline" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
                    Do not publish
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
