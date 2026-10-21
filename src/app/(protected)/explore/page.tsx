import type { Metadata } from "next";
import Link from "next/link";

import { Card } from "@/components/ui/Card";
import { Container } from "@/components/ui/Container";
import { Grid } from "@/components/ui/Grid";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { directoryCopy } from "@/features/directory/copy";

export const metadata: Metadata = {
  title: pageTitle(directoryCopy.explore.title),
};

const READING_SURFACES = [
  { href: "/people", title: directoryCopy.people.title, description: directoryCopy.people.description },
  { href: "/institutions", title: directoryCopy.institutions.title, description: directoryCopy.institutions.description },
  { href: "/contributions", title: directoryCopy.contributions.title, description: directoryCopy.contributions.description },
] as const;

// Explore (/explore): the authenticated reading hub — the "lobby" of the
// reading experience. Three doorways into the completed engines. Pure
// navigation; the directories themselves do the data reads.
export default function ExplorePage() {
  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader title={directoryCopy.explore.title} description={directoryCopy.explore.description} />

        <Grid cols={3} className="mt-8">
          {READING_SURFACES.map((surface) => (
            <Card key={surface.href}>
              <h2 className="text-base font-semibold text-foreground">
                <Link href={surface.href} className="underline underline-offset-2">
                  {surface.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{surface.description}</p>
            </Card>
          ))}
        </Grid>
      </Container>
    </main>
  );
}
