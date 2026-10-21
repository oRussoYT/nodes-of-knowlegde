import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { programmePath } from "@/features/programmes/parse";
import { listPublicProgrammes } from "@/features/programmes/read";

// Public directory of programme pages (PRODUTO.md screen 07): only
// institutions that chose to publish where their graduates went.
export const metadata: Metadata = {
  title: pageTitle("Programmes"),
};

export default async function ProgrammesPage() {
  const programmes = await listPublicProgrammes();
  const byOrg = new Map<string, { name: string; items: typeof programmes }>();
  for (const p of programmes) {
    const entry = byOrg.get(p.organizationId) ?? { name: p.organizationName, items: [] };
    entry.items.push(p);
    byOrg.set(p.organizationId, entry);
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 py-16">
      <Container width="content">
        <PageHeader
          title="Programmes"
          description="Where the people who came before went — published by the institutions themselves, from the record."
        />
        {byOrg.size === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">No institution has published its programmes yet.</p>
        ) : (
          <div className="mt-8 flex flex-col gap-6">
            {[...byOrg.entries()].map(([orgId, org]) => (
              <section key={orgId} aria-label={org.name}>
                <h2 className="text-sm font-semibold text-foreground">{org.name}</h2>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {org.items.map((p) => (
                    <li key={p.programme}>
                      <Link href={programmePath(orgId, p.programme)} className="underline underline-offset-2">
                        {p.programme}
                      </Link>
                      <span className="text-muted-foreground"> · {p.graduates} graduates on record</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}
