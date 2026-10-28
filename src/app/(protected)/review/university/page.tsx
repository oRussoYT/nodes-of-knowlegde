import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTile } from "@/components/ui/Tiles";
import { pageTitle } from "@/config/site";
import { listInstitutionOptions } from "@/features/import/read";
import { readOutcomeParams } from "@/features/outcomes/parse";
import { getStewardScope } from "@/features/steward/read";
import { rankingIndicators, share } from "@/features/university/parse";
import { getUniversityReport, readHomeCountry } from "@/features/university/read";

// The university package (ROTEIRO fase 2, etapa E): graduates by level, the
// CAPES export and institution indicators for rankings -- each with the
// method it uses. Describes the institution; never ranks a person.
export const metadata: Metadata = {
  title: pageTitle("University reports"),
};

const field = "rounded-md border border-border-default bg-surface px-2 py-1.5";

export default async function UniversityReportPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const get = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : null);
  const { org, filters } = readOutcomeParams(get);
  const home = readHomeCountry(get("home"));
  const scope = await getStewardScope();
  const choices = scope.platform ? await listInstitutionOptions() : scope.organizations;
  const organizationId = org && (scope.platform || scope.organizations.some((o) => o.id === org)) ? org : (choices[0]?.id ?? null);
  const report = organizationId ? await getUniversityReport(organizationId, filters, home) : null;
  const orgName = choices.find((o) => o.id === organizationId)?.name ?? "";

  const exportParams = new URLSearchParams();
  if (organizationId) exportParams.set("org", organizationId);
  if (filters.programme) exportParams.set("programme", filters.programme);
  if (filters.fromYear) exportParams.set("from", String(filters.fromYear));
  if (filters.toYear) exportParams.set("to", String(filters.toYear));

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="University reports"
          description="Undergraduate, master's and doctoral graduates and where they went — for CAPES, rankings and your own board. Every destination was confirmed by a steward and keeps its source."
          action={
            <Link href="/review/console" className="text-sm underline underline-offset-2">
              Steward console
            </Link>
          }
        />

        <form method="get" className="mt-6 grid gap-3 rounded-md border border-border-default px-4 py-4 text-sm sm:grid-cols-[minmax(0,2fr)_5rem_5rem_5rem_auto] sm:items-end">
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Institution</span>
            <select name="org" defaultValue={organizationId ?? ""} className={field}>
              {choices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">From</span>
            <input name="from" inputMode="numeric" pattern="\d{4}" defaultValue={filters.fromYear ?? ""} placeholder="2010" className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">To</span>
            <input name="to" inputMode="numeric" pattern="\d{4}" defaultValue={filters.toYear ?? ""} placeholder="2025" className={field} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-muted-foreground">Home country</span>
            <input name="home" maxLength={2} defaultValue={home} className={field} />
          </label>
          <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
            Show
          </button>
        </form>

        {!organizationId ? (
          <EmptyState className="mt-8" title="No institution to show" description="You are not a steward of any institution yet." />
        ) : !report ? (
          <EmptyState className="mt-8" title="This report could not be read" description="Reload the page to try again." />
        ) : report.totals.graduates === 0 ? (
          <EmptyState
            className="mt-8"
            title="No graduates on record yet"
            description="Import a list of graduates with their degree (Graduação, Mestrado, Doutorado…) and decide each row."
            action={
              <Link href="/review/import" className={buttonVariants({ emphasis: "primary", size: "sm" })}>
                Import a list
              </Link>
            }
          />
        ) : (
          <>
            <section aria-labelledby="levels-heading" className="mt-10">
              <h2 id="levels-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
                {orgName}: graduates by level
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {report.levels.map((l) => (
                  <div key={l.key} className="rounded-md border border-border-default px-4 py-4">
                    <p className="text-sm font-medium text-foreground">
                      {l.label} <span className="text-muted-foreground">· {l.labelPt}</span>
                    </p>
                    <p className="mt-2 font-display text-3xl font-bold text-foreground">{l.graduates}</p>
                    <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <dt>Located</dt>
                      <dd className="text-foreground">{share(l.found, l.graduates)}</dd>
                      <dt>Academia</dt>
                      <dd className="text-foreground">{share(l.academia, l.found)}</dd>
                      <dt>Companies</dt>
                      <dd className="text-foreground">{share(l.business, l.found)}</dd>
                      <dt>Government</dt>
                      <dd className="text-foreground">{share(l.government, l.found)}</dd>
                      <dt>NGOs</dt>
                      <dd className="text-foreground">{share(l.nonprofit, l.found)}</dd>
                      <dt>Abroad</dt>
                      <dd className="text-foreground">{share(l.abroad, l.found)}</dd>
                      <dt>Years to destination</dt>
                      <dd className="text-foreground">{l.medianYearsToDestination === null ? "—" : `${l.medianYearsToDestination} (median)`}</dd>
                    </dl>
                  </div>
                ))}
              </div>
            </section>

            <section aria-labelledby="capes-heading" className="mt-12">
              <h2 id="capes-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
                CAPES — destino de egressos
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                One line per master&apos;s or doctoral graduate: level, programme, year, where they went (category CAPES uses), the source and when it was confirmed. Opens in Excel. Each download is recorded.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <a href={`/review/university/capes?${exportParams.toString()}`} className={buttonVariants({ emphasis: "primary", size: "sm" })}>
                  Download CAPES file (CSV)
                </a>
                <a href={`/review/outcomes/export?${exportParams.toString()}`} className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
                  Download all graduates (CSV)
                </a>
              </div>
            </section>

            <section aria-labelledby="rank-heading" className="mt-12">
              <h2 id="rank-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
                Indicators for rankings
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Figures rankings and evaluators ask about graduate outcomes (employment, academic careers, international mobility). They describe the institution as a whole.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {rankingIndicators(report).map((i) => (
                  <div key={i.label}>
                    <StatTile value={i.value} label={i.label} />
                    <p className="mt-1 text-xs text-muted-foreground">{i.counts}</p>
                  </div>
                ))}
              </div>
              <h3 className="mt-6 text-sm font-medium text-foreground">How these are counted</h3>
              <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
                {report.method.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </section>
          </>
        )}
      </Container>
    </main>
  );
}
