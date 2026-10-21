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
import { getContributionsIndex } from "@/features/directory/read";

export const metadata: Metadata = {
  title: pageTitle(directoryCopy.contributions.title),
};

// Contributions directory (/contributions): the reading entry point into
// the Contribution engine. Lists contributions (most recent first) via the
// bounded list_contributions read model; links to /contributions/[id]. No
// UUIDs surfaced.
export default async function ContributionsIndexPage() {
  const contributions = await getContributionsIndex();

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title={directoryCopy.contributions.title}
          description={directoryCopy.contributions.description}
        />

        {contributions.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={directoryCopy.contributions.empty.title}
              description={directoryCopy.contributions.empty.description}
            />
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {contributions.map((contribution) => {
              const badge = verificationBadge(contribution.verificationStatus);
              return (
                <li key={contribution.id}>
                  <Card>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/contributions/${contribution.id}`}
                        className="font-medium text-foreground underline underline-offset-2"
                      >
                        {contribution.title}
                      </Link>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </div>
                    {contribution.kindLabel ? (
                      <p className="mt-1 text-sm text-muted-foreground">{contribution.kindLabel}</p>
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
