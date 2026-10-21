import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { directoryCopy } from "@/features/directory/copy";
import { verificationBadge } from "@/features/directory/derive";
import { getPeopleIndex } from "@/features/directory/read";

export const metadata: Metadata = {
  title: pageTitle(directoryCopy.people.title),
};

// People directory (/people): the reading entry point into the Scientific
// Biography engine and the per-person timeline/participation/relationship
// reads. Lists non-merged people by name via the bounded list_people read
// model; links to /people/[id]. No UUIDs surfaced. Honest empty state when
// there are no records yet.
export default async function PeopleIndexPage() {
  const people = await getPeopleIndex();

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader title={directoryCopy.people.title} description={directoryCopy.people.description} />

        {people.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={directoryCopy.people.empty.title}
              description={directoryCopy.people.empty.description}
            />
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {people.map((person) => {
              const badge = verificationBadge(person.verificationStatus);
              return (
                <li key={person.id}>
                  <Card>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/people/${person.id}`}
                        className="font-medium text-foreground underline underline-offset-2"
                      >
                        {person.displayName}
                      </Link>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </div>
                    {person.isDeceased ? (
                      <p className="mt-1 text-sm text-muted-foreground">Deceased</p>
                    ) : null}
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </Container>
    </main>
  );
}
