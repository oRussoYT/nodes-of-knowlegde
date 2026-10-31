import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { MAX_CHECKED, idsParam, pairSentences, parseConflictCheck, readIds, untied } from "@/features/integrity/parse";
import { searchPeople } from "@/features/people-search/read";
import { createClient } from "@/lib/supabase/server";

// Conflict-of-interest screening (ROTEIRO, "Depois"): pick the people -- an
// author and possible reviewers, a candidate and a committee -- and see the
// ties the record documents between each pair. Facts with years, in
// alphabetical order; deciding what counts as a conflict stays human.
export const metadata: Metadata = {
  title: pageTitle("Check ties"),
};

export default async function IntegrityPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const raw = await searchParams;
  const ids = readIds(raw.ids);
  const q = typeof raw.q === "string" ? raw.q.trim().slice(0, 100) : "";
  const results = q.length >= 2 ? (await searchPeople(q)).filter((r) => !ids.includes(r.id)).slice(0, 12) : [];
  let check = parseConflictCheck(null);
  if (ids.length > 0) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("conflict_check", { p_people: ids });
    check = error ? check : parseConflictCheck(data);
  }
  const href = (next: string[], query?: string) => {
    const params = new URLSearchParams();
    if (next.length > 0) params.set("ids", idsParam(next));
    if (query) params.set("q", query);
    const s = params.toString();
    return s ? `/integrity?${s}` : "/integrity";
  };
  const alone = untied(check);

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Check ties"
          description="Choose up to 15 people — say, an author and the reviewers of a paper, or a candidate and a committee. You see what the record documents between each pair: bonds, works together and years at the same institution. Facts with their years; whether that is a conflict is for you and the rules you follow to decide."
        />

        <section aria-labelledby="chosen-heading" className="mt-8">
          <h2 id="chosen-heading" className="text-sm font-medium text-foreground">
            Chosen ({ids.length}/{MAX_CHECKED})
          </h2>
          {check.people.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Nobody yet. Search for a name below.</p>
          ) : (
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {check.people.map((p) => (
                <li key={p.personId} className="flex items-center gap-2 rounded-full border border-border-default px-3 py-1">
                  <Link href={`/people/${p.personId}`} className="underline underline-offset-2">
                    {p.name}
                  </Link>
                  <Link href={href(ids.filter((i) => i !== p.personId))} aria-label={`Remove ${p.name}`} className="text-muted-foreground">
                    ×
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {ids.length < MAX_CHECKED ? (
          <form role="search" method="get" className="mt-6 flex gap-2">
            {ids.length > 0 ? <input type="hidden" name="ids" value={idsParam(ids)} /> : null}
            <label htmlFor="integrity-q" className="sr-only">
              Find a person to add
            </label>
            <input id="integrity-q" name="q" type="search" defaultValue={q} placeholder="Find a person to add" className="min-w-0 flex-1 rounded-md border border-border-default bg-surface px-3 py-2 text-sm" />
            <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
              Search
            </button>
          </form>
        ) : null}

        {results.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {results.map((r) => (
              <li key={r.id}>
                <Link href={href([...ids, r.id], q)} className="underline underline-offset-2">
                  Add {r.displayName}
                </Link>
                {r.lastInstitution ? <span className="text-muted-foreground"> — {r.lastInstitution.name}</span> : null}
              </li>
            ))}
          </ul>
        ) : q.length >= 2 ? (
          <p className="mt-3 text-sm text-muted-foreground">No one by that name in the record.</p>
        ) : null}

        {ids.length >= 2 ? (
          <section aria-labelledby="ties-heading" className="mt-10">
            <h2 id="ties-heading" className="text-base font-semibold text-foreground">
              What the record documents
            </h2>
            {check.pairs.length === 0 ? (
              <EmptyState className="mt-4" title="No documented ties between these people" description="The record only knows what was documented. Absence here is not proof of independence." />
            ) : (
              <ul className="mt-4 flex flex-col gap-3">
                {check.pairs.map((p) => (
                  <li key={`${p.a.personId}-${p.b.personId}`} className="rounded-md border border-border-default px-4 py-3 text-sm">
                    <p className="font-medium text-foreground">
                      {p.a.name} and {p.b.name}
                    </p>
                    <ul className="mt-1 list-disc pl-5 text-foreground">
                      {pairSentences(p).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                    {p.sharedWorks.length > 0 ? (
                      <p className="mt-1 text-muted-foreground">
                        Works:{" "}
                        {p.sharedWorks.slice(0, 3).map((w, n) => (
                          <span key={w.id}>
                            {n > 0 ? " · " : ""}
                            <Link href={`/contributions/${w.id}`} className="underline underline-offset-2">
                              {w.title}
                            </Link>
                            {w.year ? ` (${w.year})` : ""}
                          </span>
                        ))}
                        {p.sharedWorks.length > 3 ? ` and ${p.sharedWorks.length - 3} more` : ""}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            {alone.length > 0 && check.pairs.length > 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No documented tie to the others: {alone.map((p) => p.name).join(", ")}.
              </p>
            ) : null}
          </section>
        ) : null}
      </Container>
    </main>
  );
}
