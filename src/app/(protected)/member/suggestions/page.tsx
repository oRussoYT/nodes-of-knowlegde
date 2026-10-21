import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { dismissSuggestionAction, setSuggestionOptOutAction } from "@/features/suggestions/actions";
import { describeReason, parseSuggestions } from "@/features/suggestions/parse";
import { createClient } from "@/lib/supabase/server";

// People you may want to know (PRODUTO.md screen 11; ROTEIRO etapa 7). Only
// for your own linked record. Each line says why. Nothing is ranked, nothing
// is written to the record, and you can dismiss anyone or leave everyone
// else's suggestions entirely.
export const metadata: Metadata = {
  title: pageTitle("People you may know"),
};

export default async function SuggestionsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_suggestions");
  const doc = parseSuggestions(error ? null : data);

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="People you may know"
          description="From the record: people documented at the same place and time as you, or trained by the same mentor. Each one says why. Nothing here is ranked or added to your record."
        />

        {!doc.linked ? (
          <EmptyState
            className="mt-8"
            title="Connect your account to your record first"
            description="Suggestions come from your own documented history."
            action={
              <Link href="/member/claim" className="text-sm underline underline-offset-2">
                Find and claim your record
              </Link>
            }
          />
        ) : doc.suggestions.length === 0 ? (
          <EmptyState className="mt-8" title="No suggestions right now" description="As the record grows, people you overlapped with will appear here." />
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {doc.suggestions.map((s) => (
              <li key={s.personId} className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-border-default px-4 py-3">
                <div className="min-w-0">
                  <Link href={`/people/${s.personId}`} className="font-medium text-foreground underline underline-offset-2">
                    {s.displayName}
                  </Link>
                  <ul className="mt-1 text-sm text-muted-foreground">
                    {s.reasons.map((r, i) => (
                      <li key={i}>{describeReason(r)}</li>
                    ))}
                  </ul>
                </div>
                <form action={dismissSuggestionAction}>
                  <input type="hidden" name="personId" value={s.personId} />
                  <Button type="submit" size="sm" emphasis="ghost">
                    Not now
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {doc.linked ? (
          <form action={setSuggestionOptOutAction} className="mt-10 rounded-md border border-border-default px-4 py-4 text-sm">
            <input type="hidden" name="optOut" value={doc.optedOut ? "false" : "true"} />
            <p className="text-foreground">
              {doc.optedOut ? "You are left out of other people's suggestions." : "You can appear in other people's suggestions."}
            </p>
            <div className="mt-2">
              <Button type="submit" size="sm" emphasis="secondary">
                {doc.optedOut ? "Appear in suggestions again" : "Leave me out of everyone's suggestions"}
              </Button>
            </div>
          </form>
        ) : null}
      </Container>
    </main>
  );
}
