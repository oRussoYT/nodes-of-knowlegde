import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { directoryCopy } from "@/features/directory/copy";
import { verificationBadge } from "@/features/directory/derive";
import { cleanQuery, describeLastInstitution } from "@/features/people-search/parse";
import { searchPeople } from "@/features/people-search/read";

export const metadata: Metadata = {
  title: pageTitle(directoryCopy.people.title),
};

interface PeoplePageProps {
  searchParams: Promise<{ q?: string }>;
}

// People directory (/people): search by a person's name or an institution's
// name (accents and capitals ignored). Each result shows where the person was
// last documented and how much the record holds -- alphabetical, never ranked.
// No UUIDs surfaced. Honest empty states.
export default async function PeopleIndexPage({ searchParams }: PeoplePageProps) {
  const { q } = await searchParams;
  const query = cleanQuery(q);
  const people = await searchPeople(query);

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader title={directoryCopy.people.title} description={directoryCopy.people.description} />

        <form role="search" action="/people" className="mt-8 flex flex-wrap gap-2">
          <label htmlFor="people-search" className="sr-only">
            Search people by name or institution
          </label>
          <input
            id="people-search"
            name="q"
            type="search"
            defaultValue={query}
            placeholder="Search by name or institution — e.g. Peng, McGill, INPA"
            className="min-w-0 flex-1 rounded-full border border-border-default bg-surface px-5 py-3 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          />
          <button
            type="submit"
            className="rounded-full bg-nk-lime px-6 py-3 text-sm font-semibold text-nk-ink transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            Search
          </button>
        </form>

        {query ? (
          <p className="mt-4 text-sm text-muted-foreground" role="status">
            {people.length === 0
              ? `Nobody found for “${query}”.`
              : `${people.length} ${people.length === 1 ? "person" : "people"} for “${query}”.`}{" "}
            <Link href="/people" className="underline underline-offset-4">
              Show everyone
            </Link>
          </p>
        ) : null}

        {people.length === 0 && !query ? (
          <div className="mt-8">
            <EmptyState title={directoryCopy.people.empty.title} description={directoryCopy.people.empty.description} />
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {people.map((person) => {
              const badge = verificationBadge(person.verificationStatus);
              const facts = [
                person.institutionsCount > 0
                  ? `${person.institutionsCount} ${person.institutionsCount === 1 ? "institution" : "institutions"}`
                  : null,
                person.worksCount > 0 ? `${person.worksCount} ${person.worksCount === 1 ? "work" : "works"}` : null,
              ].filter(Boolean);
              return (
                <article key={person.id} className="nk-tile rounded-2xl border border-border-default bg-surface p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="font-display text-xl font-bold leading-tight tracking-tight">
                      <Link href={`/people/${person.id}`} className="text-foreground underline-offset-4 hover:underline">
                        {person.displayName}
                      </Link>
                    </h2>
                    <Badge tone={badge.tone}>{badge.label}</Badge>
                  </div>
                  {person.lastInstitution ? (
                    <p className="mt-2 text-[15px] text-foreground">{describeLastInstitution(person.lastInstitution)}</p>
                  ) : (
                    <p className="mt-2 text-[15px] text-muted-foreground">No institution documented yet</p>
                  )}
                  <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                    {facts.length > 0 ? <span>{facts.join(" · ")}</span> : null}
                    {person.isDeceased ? <span>Deceased</span> : null}
                    {person.acceptsMessages ? (
                      <span className="font-medium text-foreground">Can be messaged here</span>
                    ) : person.hasAccount ? (
                      <span>Member</span>
                    ) : null}
                  </p>
                </article>
              );
            })}
          </div>
        )}
      </Container>
    </main>
  );
}
