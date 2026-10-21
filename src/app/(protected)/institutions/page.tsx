import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { directoryCopy } from "@/features/directory/copy";
import { institutionStatusLabel, verificationBadge } from "@/features/directory/derive";
import { getInstitutionsIndex } from "@/features/directory/read";

export const metadata: Metadata = {
  title: pageTitle(directoryCopy.institutions.title),
};

// Institutions directory (/institutions): the reading entry point into the
// Institution engine. Lists institutions by name (including historical and
// closed) via the bounded list_organizations read model; links to
// /institutions/[id]. No UUIDs surfaced.
export default async function InstitutionsIndexPage() {
  const institutions = await getInstitutionsIndex();

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title={directoryCopy.institutions.title}
          description={directoryCopy.institutions.description}
        />

        {institutions.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title={directoryCopy.institutions.empty.title}
              description={directoryCopy.institutions.empty.description}
            />
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {institutions.map((institution) => {
              const badge = verificationBadge(institution.verificationStatus);
              const meta = [
                institution.typeLabel,
                institutionStatusLabel(institution.status),
              ].filter(Boolean);
              return (
                <li key={institution.id}>
                  <Card>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/institutions/${institution.id}`}
                        className="font-medium text-foreground underline underline-offset-2"
                      >
                        {institution.name}
                        {institution.shortName ? (
                          <span className="text-muted-foreground"> ({institution.shortName})</span>
                        ) : null}
                      </Link>
                      <Badge tone={badge.tone}>{badge.label}</Badge>
                    </div>
                    {meta.length > 0 ? (
                      <p className="mt-1 text-sm text-muted-foreground">{meta.join(" · ")}</p>
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
