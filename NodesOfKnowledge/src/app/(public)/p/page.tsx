import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { listPublicPeople } from "@/features/public-person/read";

// Directory of public person pages (ROTEIRO etapa 2). Alphabetical; lists only
// pages that were deliberately made public.
export const metadata: Metadata = {
  title: pageTitle("Public records"),
};

export default async function PublicPeoplePage() {
  const people = await listPublicPeople();

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 py-16">
      <Container width="content">
        <PageHeader
          title="Public records"
          description="People whose page has been made public, by themselves or by an accountable decision of a steward."
        />
        {people.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">No public pages yet.</p>
        ) : (
          <ul className="mt-8 flex flex-col gap-2">
            {people.map((p) => (
              <li key={p.id} className="text-sm">
                <Link href={`/p/${p.id}`} className="underline underline-offset-2">
                  {p.displayName}
                </Link>
                {p.isDemo ? <span className="text-muted-foreground"> · demonstration</span> : null}
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
