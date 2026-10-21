import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/Badge";
import { Container } from "@/components/ui/Container";
import { pageTitle } from "@/config/site";
import { getPublicProgramme } from "@/features/programmes/read";

// Public programme page (PRODUTO.md screen 07; ROTEIRO etapa 2): what a
// prospective student most wants and can never get -- where the people who
// came before went. Aggregates only; no names. Only for institutions that
// published, and graduates who declined are left out.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SECTOR_LABEL: Record<string, string> = {
  education: "Universities and schools",
  company: "Companies",
  government: "Government",
  nonprofit: "Non-profits",
  facility: "Research facilities",
  healthcare: "Healthcare",
  archive: "Archives and museums",
  other: "Other",
  unknown: "Not stated",
};

interface Props {
  params: Promise<{ organizationId: string; programme: string }>;
}

async function load({ params }: Props) {
  const { organizationId, programme } = await params;
  if (!UUID.test(organizationId)) return null;
  return getPublicProgramme(organizationId, decodeURIComponent(programme));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const page = await load(props);
  return { title: pageTitle(page ? `${page.programme} · ${page.organizationName}` : "Programme") };
}

export default async function PublicProgrammePage(props: Props) {
  const page = await load(props);
  if (!page) notFound();
  const max = Math.max(1, ...page.bySector.map((s) => s.people), ...page.byCountry.map((c) => c.people));

  return (
    <main id="main-content" tabIndex={-1} className="flex-1 py-16">
      <Container width="content">
        <Link href="/programmes" className="text-sm text-muted-foreground underline underline-offset-2">
          ← All programmes
        </Link>
        <p className="mt-6 text-xs uppercase tracking-[0.16em] text-muted-foreground">{page.organizationName}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{page.programme}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {page.graduates} graduates on record
          {page.firstYear && page.lastYear ? `, ${page.firstYear}–${page.lastYear}` : ""} · we know where {page.known} of them
          went.
        </p>
        {page.demo > 0 ? (
          <div className="mt-3">
            <Badge tone="warning">Includes demonstration records</Badge>
          </div>
        ) : null}

        <div className="mt-10 grid gap-10 sm:grid-cols-2">
          <section aria-labelledby="sector-heading">
            <h2 id="sector-heading" className="text-sm font-medium text-foreground">
              Where they work now
            </h2>
            {page.bySector.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Not known yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {page.bySector.map((s) => (
                  <li key={s.sector} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_2.5rem] items-center gap-3">
                    <span className="truncate">{SECTOR_LABEL[s.sector] ?? s.sector}</span>
                    <span className="block h-2.5 rounded-sm bg-surface-sunken">
                      <span className="block h-2.5 rounded-sm bg-accent" style={{ width: `${(s.people / max) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums">{s.people}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="country-heading">
            <h2 id="country-heading" className="text-sm font-medium text-foreground">
              In which countries
            </h2>
            {page.byCountry.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Not known yet.</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {page.byCountry.map((c) => (
                  <li key={c.country ?? "none"} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_2.5rem] items-center gap-3">
                    <span>{c.country ?? "Not stated"}</span>
                    <span className="block h-2.5 rounded-sm bg-surface-sunken">
                      <span className="block h-2.5 rounded-sm bg-accent" style={{ width: `${(c.people / max) * 100}%` }} />
                    </span>
                    <span className="text-right tabular-nums">{c.people}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {page.destinations.length > 0 ? (
          <section aria-labelledby="dest-heading" className="mt-12">
            <h2 id="dest-heading" className="text-sm font-medium text-foreground">
              Where graduates have gone
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">Alphabetical. Not a ranking.</p>
            <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {page.destinations.map((d) => (
                <li key={d.institution} className="flex justify-between gap-3 border-b border-border-muted py-1">
                  <span className="truncate">{d.institution}</span>
                  <span className="tabular-nums text-muted-foreground">{d.people}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="mt-12 text-xs text-muted-foreground">
          From the record: each destination was confirmed by the institution from an open source and keeps its source.
          Graduates can ask not to be counted.
        </p>
      </Container>
    </main>
  );
}
