import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/Tiles";
import { pageTitle } from "@/config/site";
import { listInstitutionOptions } from "@/features/import/read";
import { formatMinutes } from "@/features/outcomes/parse";
import { setOutcomesPublicAction } from "@/features/programmes/actions";
import { createClient } from "@/lib/supabase/server";
import { getOutcomes, readOutcomeParams } from "@/features/outcomes/read";
import { getStewardScope } from "@/features/steward/read";

// The outcomes panel (ROTEIRO etapa 5; PRODUTO.md screen 09): where an
// institution's graduates went. Found / probable / needs a person, the time
// this saved (a stated benchmark, not a measurement), descriptive cuts, and a
// CSV export with provenance. Alphabetical and chronological -- never a
// league table.
export const metadata: Metadata = {
  title: pageTitle("Graduate outcomes"),
};

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

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <span className="block h-2.5 rounded-sm bg-surface-sunken">
      <span className="nk-bar block h-2.5 rounded-sm bg-accent" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </span>
  );
}

export default async function OutcomesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const { org, filters } = readOutcomeParams((k) => (typeof raw[k] === "string" ? (raw[k] as string) : null));
  const scope = await getStewardScope();
  const choices = scope.platform ? await listInstitutionOptions() : scope.organizations;
  const organizationId =
    org && (scope.platform || scope.organizations.some((o) => o.id === org)) ? org : (choices[0]?.id ?? null);
  const doc = organizationId ? await getOutcomes(organizationId, filters) : null;
  const orgName = choices.find((o) => o.id === organizationId)?.name ?? "";
  // Whether this institution's programme pages are public (screen 07).
  const supabase = await createClient();
  const { data: anyPublic } = organizationId
    ? await supabase.rpc("list_public_programmes")
    : { data: null };
  const isPublished = Array.isArray(anyPublic) && anyPublic.some((p) => p.organization_id === organizationId);

  const exportParams = new URLSearchParams();
  if (organizationId) exportParams.set("org", organizationId);
  if (filters.programme) exportParams.set("programme", filters.programme);
  if (filters.fromYear) exportParams.set("from", String(filters.fromYear));
  if (filters.toYear) exportParams.set("to", String(filters.toYear));

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Graduate outcomes"
          description="Where your graduates went, from the record. Every destination was confirmed by a steward and keeps its source."
          action={
            <Link href="/review/console" className="text-sm underline underline-offset-2">
              Steward console
            </Link>
          }
        />

        <form method="get" className="mt-6 grid gap-3 rounded-md border border-border-default px-4 py-4 text-sm sm:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_5rem_5rem_auto] sm:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Institution</span>
            <select name="org" defaultValue={organizationId ?? ""} className="rounded-md border border-border-default bg-surface px-2 py-1.5">
              {choices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Programme</span>
            <select name="programme" defaultValue={filters.programme ?? ""} className="rounded-md border border-border-default bg-surface px-2 py-1.5">
              <option value="">All programmes</option>
              {(doc?.programmes ?? []).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">From</span>
            <input name="from" inputMode="numeric" pattern="\d{4}" defaultValue={filters.fromYear ?? ""} placeholder="2010" className="rounded-md border border-border-default bg-surface px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">To</span>
            <input name="to" inputMode="numeric" pattern="\d{4}" defaultValue={filters.toYear ?? ""} placeholder="2025" className="rounded-md border border-border-default bg-surface px-2 py-1.5" />
          </label>
          <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
            Show
          </button>
        </form>

        {!organizationId ? (
          <EmptyState className="mt-8" title="No institution to show" description="You are not a steward of any institution yet." />
        ) : !doc ? (
          <EmptyState className="mt-8" title="These outcomes could not be read" description="Reload the page to try again." />
        ) : doc.totals.graduates === 0 ? (
          <EmptyState
            className="mt-8"
            title="No graduates on record yet"
            description="Import a list of graduates and decide each row; they will appear here."
            action={
              <Link href="/review/import" className={buttonVariants({ emphasis: "primary", size: "sm" })}>
                Import a list
              </Link>
            }
          />
        ) : (
          <>
            <section aria-labelledby="totals-heading" className="mt-10">
              <h2 id="totals-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
                {orgName}, {doc.totals.graduates} graduates on record
              </h2>
              <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile value={doc.totals.found} label="Found, destination confirmed" emphasis />
                <StatTile value={doc.totals.probable} label="Probable, proposals waiting" />
                <StatTile value={doc.totals.needsPerson} label="Need a person" />
                <StatTile value={formatMinutes(doc.timeSaved.minutes)} label="Of searching saved" />
              </dl>
              <div className="mt-4" aria-hidden="true">
                <span className="flex h-4 overflow-hidden rounded-full bg-surface-sunken">
                  <span className="nk-bar bg-accent" style={{ width: `${(doc.totals.found / doc.totals.graduates) * 100}%` }} />
                  <span className="bg-accent opacity-40" style={{ width: `${(doc.totals.probable / doc.totals.graduates) * 100}%` }} />
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {doc.timeSaved.basis} About {formatMinutes(doc.timeSaved.minutesRemaining)} of searching left for the rest.
                {doc.totals.demo > 0 ? ` ${doc.totals.demo} of these are demonstration records.` : ""}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <a href={`/review/outcomes/export?${exportParams.toString()}`} className={buttonVariants({ emphasis: "primary", size: "sm" })}>
                  Export CSV
                </a>
                <form action={setOutcomesPublicAction}>
                  <input type="hidden" name="organizationId" value={organizationId} />
                  <input type="hidden" name="makePublic" value={isPublished ? "false" : "true"} />
                  <button type="submit" className={buttonVariants({ emphasis: "ghost", size: "sm" })}>
                    {isPublished ? "Unpublish programme pages" : "Publish programme pages (counts only, no names)"}
                  </button>
                </form>
                {isPublished ? (
                  <Link href="/programmes" className={buttonVariants({ emphasis: "ghost", size: "sm" })}>
                    See the public pages
                  </Link>
                ) : null}
                {doc.totals.probable + doc.totals.needsPerson > 0 ? (
                  <Link href="/review/import" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
                    Work through the lists
                  </Link>
                ) : null}
              </div>
            </section>

            <div className="mt-12 grid gap-10 sm:grid-cols-2">
              <section aria-labelledby="sector-heading">
                <h2 id="sector-heading" className="font-display text-lg font-bold tracking-tight text-foreground">
                  Where they work now, by sector
                </h2>
                {doc.bySector.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No confirmed destinations yet.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2 text-sm">
                    {doc.bySector.map((s) => (
                      <li key={s.sector} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_2.5rem] items-center gap-3">
                        <span className="truncate">{SECTOR_LABEL[s.sector] ?? s.sector}</span>
                        <Bar value={s.people} max={doc.totals.found} />
                        <span className="text-right tabular-nums">{s.people}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="country-heading">
                <h2 id="country-heading" className="font-display text-lg font-bold tracking-tight text-foreground">
                  By country
                </h2>
                {doc.byCountry.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No confirmed destinations yet.</p>
                ) : (
                  <ul className="mt-3 flex flex-col gap-2 text-sm">
                    {doc.byCountry.map((c) => (
                      <li key={c.country ?? "none"} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_2.5rem] items-center gap-3">
                        <span>{c.country ?? "Not stated"}</span>
                        <Bar value={c.people} max={doc.totals.found} />
                        <span className="text-right tabular-nums">{c.people}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section aria-labelledby="year-heading">
                <h2 id="year-heading" className="font-display text-lg font-bold tracking-tight text-foreground">
                  By graduation year
                </h2>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {doc.byYear.map((y) => (
                    <li key={y.year ?? "none"} className="grid grid-cols-[4rem_minmax(0,1fr)_4.5rem] items-center gap-3">
                      <span className="tabular-nums">{y.year ?? "—"}</span>
                      <Bar value={y.found} max={y.graduates} />
                      <span className="text-right tabular-nums text-muted-foreground">
                        {y.found}/{y.graduates}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">Found out of graduates on record, per year.</p>
              </section>

              <section aria-labelledby="programme-heading">
                <h2 id="programme-heading" className="font-display text-lg font-bold tracking-tight text-foreground">
                  By programme
                </h2>
                <ul className="mt-3 flex flex-col gap-2 text-sm">
                  {doc.byProgramme.map((p) => (
                    <li key={p.programme ?? "none"} className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_4.5rem] items-center gap-3">
                      <span className="truncate">{p.programme ?? "Not stated"}</span>
                      <Bar value={p.found} max={p.graduates} />
                      <span className="text-right tabular-nums text-muted-foreground">
                        {p.found}/{p.graduates}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            </div>

            {doc.destinations.length > 0 ? (
              <section aria-labelledby="dest-heading" className="mt-12">
                <h2 id="dest-heading" className="font-display text-lg font-bold tracking-tight text-foreground">
                  Destinations
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">Alphabetical. Not a ranking.</p>
                <ul className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                  {doc.destinations.map((d) => (
                    <li key={d.institution} className="flex justify-between gap-3 border-b border-border-muted py-1">
                      <span className="truncate">{d.institution}</span>
                      <span className="tabular-nums text-muted-foreground">{d.people}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </>
        )}
      </Container>
    </main>
  );
}
