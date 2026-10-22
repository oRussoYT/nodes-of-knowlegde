import type { Metadata } from "next";
import Link from "next/link";

import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { ActionTile, StatTile } from "@/components/ui/Tiles";
import { pageTitle } from "@/config/site";
import { listInstitutionOptions } from "@/features/import/read";
import {
  getCorpusTimeline,
  getDemoSummary,
  getStewardAttention,
  getStewardOverview,
  getStewardScope,
} from "@/features/steward/read";
import type { AttentionSection } from "@/features/steward/types";

// Steward console (docs/PRODUTO.md screen 09), first cut. Reached only after
// src/app/(protected)/review/layout.tsx confirms an active reviewer; each read
// is reviewer-gated again in the database. Descriptive: counts of records and
// lists that need a human -- nothing ranked, nothing changed from here.
export const metadata: Metadata = {
  title: pageTitle("Steward console"),
};

function Attention<T>({
  title,
  description,
  section,
  render,
}: {
  title: string;
  description: string;
  section: AttentionSection<T>;
  render: (item: T) => React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border-default bg-surface px-5 py-4">
      <h3 className="text-sm font-semibold text-foreground">
        {title} <span className="font-normal tabular-nums text-muted-foreground">· {section.total}</span>
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      {section.items.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 text-sm">{section.items.map(render)}</ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">Nothing here.</p>
      )}
      {section.total > section.items.length ? (
        <p className="mt-2 text-xs text-muted-foreground">Showing the first {section.items.length}, alphabetically.</p>
      ) : null}
    </section>
  );
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StewardConsolePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Scope (ROTEIRO etapa 3): platform reviewers see the whole record or any
  // one institution; institution stewards see only their own institutions.
  const { org } = await searchParams;
  const scope = await getStewardScope();
  const requested = typeof org === "string" && UUID.test(org) ? org : null;
  const allowedOrg =
    requested && (scope.platform || scope.organizations.some((o) => o.id === requested)) ? requested : null;
  const organizationId = allowedOrg ?? (scope.platform ? undefined : scope.organizations[0]?.id);
  const institutionChoices = scope.platform ? await listInstitutionOptions() : scope.organizations;
  const scopeName = organizationId
    ? (institutionChoices.find((o) => o.id === organizationId)?.name ?? "This institution")
    : "The whole record";

  const [overview, attention, timeline, demo] = await Promise.all([
    getStewardOverview(organizationId),
    getStewardAttention(organizationId),
    getCorpusTimeline(organizationId),
    scope.platform ? getDemoSummary() : Promise.resolve(null),
  ]);

  const maxDecade = Math.max(1, ...timeline.map((d) => d.participationsStarting));
  const demoTotal = demo ? demo.people.demo + demo.organizations.demo + demo.contributions.demo + demo.events.demo : 0;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="Steward console"
          description="What the record holds and what needs a human. Counts of records, never scores of people."
        />

        <section aria-labelledby="work-heading" className="mt-8">
          <h2 id="work-heading" className="sr-only">
            Places to work
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ActionTile
              href="/review/import"
              title="Import a list"
              description="Upload graduates from a spreadsheet and decide each row: same person, new person, or skip."
            />
            <ActionTile
              href="/review/outcomes"
              title="Graduate outcomes"
              description="Where your graduates went, by sector, country and year. Export or publish without names."
            />
            <ActionTile
              href="/review/contributions"
              title="Proposed contributions"
              description="Contributions people proposed for their own record, waiting for a steward."
            />
            <ActionTile
              href="/review/names"
              title="Institution names"
              description="Former, other and translated names, with the years each was used."
            />
            {scope.platform ? (
              <>
                <ActionTile
                  href="/review/stewards"
                  title="Institutions and stewards"
                  description="Add an institution and appoint the people who look after it."
                />
                <ActionTile
                  href="/review/claims"
                  title="Claim review queue"
                  description="People asking to link their account to a person record."
                  meta={overview && overview.claimsAwaitingReview > 0 ? `${overview.claimsAwaitingReview} waiting` : undefined}
                />
              </>
            ) : null}
          </div>
        </section>

        <form method="get" className="mt-6 flex flex-wrap items-center gap-3 text-sm">
          <label htmlFor="org" className="text-muted-foreground">
            Showing
          </label>
          <select
            id="org"
            name="org"
            defaultValue={organizationId ?? ""}
            className="rounded-md border border-border-default bg-surface px-2 py-1"
          >
            {scope.platform ? <option value="">The whole record</option> : null}
            {institutionChoices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button type="submit" className="underline underline-offset-2">
            Show
          </button>
          <span className="font-medium text-foreground">{scopeName}</span>
        </form>

        {demo && demoTotal > 0 ? (
          <p className="mt-6 rounded-md border border-border-default bg-surface px-4 py-3 text-sm">
            Demonstration data present: {demo.people.demo} people, {demo.organizations.demo} institutions,{" "}
            {demo.contributions.demo} contributions, {demo.events.demo} events are fictional and will be removed
            before real data goes in.
          </p>
        ) : null}

        <section aria-labelledby="overview-heading" className="mt-10">
          <h2 id="overview-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
            The record
          </h2>
          {overview ? (
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile value={overview.people.total} label="people" emphasis />
              <StatTile value={overview.people.claimed} label="claimed by their person" />
              <StatTile value={overview.organizations.total} label="institutions" />
              <StatTile value={overview.claimsAwaitingReview} label="claims awaiting review" />
              <StatTile value={overview.participations.total} label="participations" />
              <StatTile value={overview.participations.undated} label="without a date" />
              <StatTile value={overview.relationships.total} label="relationships" />
              <StatTile value={overview.contributions.total} label="contributions" />
            </dl>
          ) : (
            <EmptyState className="mt-3" title="The overview could not be read" description="Reload the page to try again." />
          )}
        </section>

        <section aria-labelledby="attention-heading" className="mt-12">
          <h2 id="attention-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
            Needs a human
          </h2>
          {attention ? (
            <div className="mt-3 flex flex-col gap-4">
              <Attention
                title="Possible duplicate people"
                description="Same name once case and spacing are ignored. Nothing is merged automatically."
                section={attention.possibleDuplicates}
                render={(group) => (
                  <li key={group.nameKey}>
                    {group.people.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 ? " · " : null}
                        <Link href={`/people/${p.id}`} className="underline underline-offset-2">
                          {p.displayName}
                        </Link>
                      </span>
                    ))}
                  </li>
                )}
              />
              <Attention
                title="Participations without a date"
                description="Documented belonging that cannot be placed in time yet."
                section={attention.undatedParticipations}
                render={(item) => (
                  <li key={item.id}>
                    <Link href={`/people/${item.personId}`} className="underline underline-offset-2">
                      {item.personDisplayName}
                    </Link>
                    <span className="text-muted-foreground"> · {item.organizationName}</span>
                  </li>
                )}
              />
              <Attention
                title="People with no documented participation"
                description="Records not yet connected to any institution."
                section={attention.peopleWithoutParticipation}
                render={(p) => (
                  <li key={p.id}>
                    <Link href={`/people/${p.id}`} className="underline underline-offset-2">
                      {p.displayName}
                    </Link>
                  </li>
                )}
              />
            </div>
          ) : (
            <EmptyState className="mt-3" title="The lists could not be read" description="Reload the page to try again." />
          )}
        </section>

        <section aria-labelledby="timeline-heading" className="mt-12">
          <h2 id="timeline-heading" className="font-display text-xl font-bold tracking-tight text-foreground">
            The record through time
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">Participations beginning in each decade.</p>
          {timeline.length > 0 ? (
            <ul className="mt-3 flex flex-col gap-1.5">
              {timeline.map((d) => (
                <li key={d.decade} className="grid grid-cols-[4rem_minmax(0,1fr)_6rem] items-center gap-3 text-xs">
                  <span className="tabular-nums text-muted-foreground">{d.decade}s</span>
                  <span className="h-3 rounded-sm bg-surface-sunken">
                    <span
                      className="nk-bar block h-3 rounded-sm bg-accent"
                      style={{ width: `${(d.participationsStarting / maxDecade) * 100}%` }}
                    />
                  </span>
                  <span className="tabular-nums text-foreground">
                    {d.participationsStarting} · {d.peopleStarting} people
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No dated participation yet.</p>
          )}
        </section>
      </Container>
    </main>
  );
}
