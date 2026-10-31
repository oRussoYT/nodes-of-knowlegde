import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { advisorSentence, parseAdvisors } from "@/features/advisors/parse";
import { createClient } from "@/lib/supabase/server";

// Find an advisor: who has trained people in a theme or at an institution,
// and what the record shows of where their advisees went. Alphabetical,
// facts only -- the record never says who is "best".
export const metadata: Metadata = {
  title: pageTitle("Find an advisor"),
};

export default async function AdvisorsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  let advisors: ReturnType<typeof parseAdvisors> = [];
  if (query.length >= 2) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("find_advisors", { p_query: query });
    advisors = error ? [] : parseAdvisors(data);
  }

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Find an advisor"
          description="Search a theme, an institution or a name. You see who trained people there and where their advisees went next — documented facts, in alphabetical order, never a ranking."
        />
        <form role="search" method="get" className="mt-6 flex gap-2">
          <label htmlFor="advisors-q" className="sr-only">
            Search advisors
          </label>
          <input id="advisors-q" name="q" type="search" defaultValue={query} placeholder="e.g. birds, INPA, fragmentation" className="min-w-0 flex-1 rounded-md border border-border-default bg-surface px-3 py-2 text-sm" />
          <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
            Search
          </button>
        </form>
        {query.length < 2 ? null : advisors.length === 0 ? (
          <EmptyState className="mt-8" title="No advisor found for that" description="The record only knows advising that was documented. Try a broader theme or an institution." />
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {advisors.map((a) => (
              <li key={a.personId} className="rounded-md border border-border-default px-4 py-4 text-sm">
                <Link href={`/people/${a.personId}`} className="font-semibold text-foreground underline underline-offset-2">
                  {a.name}
                </Link>
                <p className="mt-1 text-foreground">{advisorSentence(a)}</p>
                {a.topics.length > 0 ? <p className="mt-1 text-muted-foreground">Works on: {a.topics.join(", ")}</p> : null}
                {a.whereAdviseesWent.length > 0 ? (
                  <p className="mt-1 text-muted-foreground">Where advisees went: {a.whereAdviseesWent.join(" · ")}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
