import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { pageTitle } from "@/config/site";
import { COUNTRY_POINTS } from "@/features/map/countries";
import { busiestYear, yearBars } from "@/features/observatory/parse";
import { getObservatory, getObservatoryMore } from "@/features/observatory/read";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const o = await getObservatory(slug);
  return { title: pageTitle(o ? `${o.node.shortName ?? o.node.name} Observatory` : "Observatory") };
}

const nf = new Intl.NumberFormat("en");

// The Observatory of a Node (ROTEIRO fase 2, etapa H): its numbers, how they
// changed, and where the people who passed through went next. Public and
// aggregate: no person is named, nothing is ranked.
export default async function ObservatoryPage({ params }: Props) {
  const { slug } = await params;
  const o = await getObservatory(slug);
  if (!o) notFound();
  const more = await getObservatoryMore(slug);
  const label = o.node.shortName ?? o.node.name;
  const t = o.totals;
  const W = 720;
  const H = 160;
  const bars = yearBars(o.byYear.map((y) => ({ year: y.year, value: y.active })), W, H);
  const peak = busiestYear(o.byYear);
  const first = o.byYear[0]?.year;
  const last = o.byYear[o.byYear.length - 1]?.year;

  const tiles = [
    { v: t.people, l: "people documented" },
    { v: t.institutions, l: "institutions in the Node" },
    { v: t.works, l: "works" },
    { v: t.bonds, l: "documented bonds" },
    { v: t.historyItems, l: "history items" },
    { v: t.peopleWhoWentOn, l: "went on to other institutions" },
    { v: t.institutionsReached, l: "institutions reached" },
    { v: t.countriesReached, l: "countries reached" },
  ];

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[76rem] px-5 py-14 sm:px-10">
      <p className="text-sm text-muted-foreground">
        <Link href={`/n/${o.node.slug}`} className="underline underline-offset-2">
          {label}
        </Link>{" "}
        · Observatory
      </p>
      <h1 className="mt-3 font-display text-5xl font-extrabold tracking-tight text-foreground">The {label} Observatory</h1>
      <p className="mt-3 max-w-prose text-muted-foreground">
        What the record holds for this Node{t.firstYear ? ` since ${t.firstYear}` : ""}, how it changed year by year, and where knowledge travelled with the people who passed through.
      </p>

      <dl className="mt-10 grid gap-4 sm:grid-cols-4">
        {tiles.map((s) => (
          <div key={s.l} className="flex flex-col-reverse gap-2 rounded-2xl border border-border-default bg-surface px-5 py-5">
            <dt className="text-sm text-muted-foreground">{s.l}</dt>
            <dd className="font-display text-4xl font-bold leading-none tabular-nums text-foreground">{nf.format(s.v)}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="years-heading" className="mt-14">
        <h2 id="years-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">
          People active each year
        </h2>
        {bars.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No dated periods yet.</p>
        ) : (
          <>
            {peak ? (
              <p className="mt-2 text-sm text-muted-foreground">
                The record places the most people here in {peak.year}: {peak.active}.
              </p>
            ) : null}
            <svg viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`People active each year, ${first} to ${last}`} className="mt-4 block h-auto w-full">
              {bars.map((b) => (
                <rect key={b.year} x={b.x} y={b.y} width={b.w} height={b.h} rx={Math.min(2, b.w / 3)} className="fill-accent">
                  <title>{`${b.year}: ${b.value}`}</title>
                </rect>
              ))}
              <line x1={0} x2={W} y1={H} y2={H} className="stroke-border-default" />
              <text x={0} y={H + 14} className="fill-muted-foreground text-[11px]">
                {first}
              </text>
              <text x={W} y={H + 14} textAnchor="end" className="fill-muted-foreground text-[11px]">
                {last}
              </text>
            </svg>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground">See the numbers</summary>
              <table className="mt-2 text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pr-6 font-normal">Year</th>
                    <th className="pr-6 font-normal">Active</th>
                    <th className="font-normal">Arrived</th>
                  </tr>
                </thead>
                <tbody>
                  {o.byYear.map((y) => (
                    <tr key={y.year}>
                      <td className="pr-6 tabular-nums">{y.year}</td>
                      <td className="pr-6 tabular-nums">{y.active}</td>
                      <td className="tabular-nums">{y.arrived}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          </>
        )}
      </section>

      <div className="mt-14 grid gap-10 lg:grid-cols-2">
        <section aria-labelledby="diffusion-heading">
          <h2 id="diffusion-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">
            Where knowledge travelled
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Kinds of institutions people went to after their time here.</p>
          {o.diffusionByKind.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Not documented yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {o.diffusionByKind.map((k) => (
                <li key={k.kind} className="flex justify-between gap-3 border-b border-border-default pb-2">
                  <span>{k.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {k.people} {k.people === 1 ? "person" : "people"} · {k.institutions} {k.institutions === 1 ? "institution" : "institutions"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {o.diffusionByCountry.length > 0 ? (
            <>
              <h3 className="mt-6 text-sm font-medium text-foreground">Countries</h3>
              <ul className="mt-2 flex flex-wrap gap-2 text-sm">
                {o.diffusionByCountry.map((c) => (
                  <li key={c.countryCode} className="rounded-full border border-border-default px-3 py-1">
                    {COUNTRY_POINTS[c.countryCode]?.name ?? c.countryCode} <span className="text-muted-foreground">{c.people}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </section>

        <section aria-labelledby="decades-heading">
          <h2 id="decades-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">
            Works by decade
          </h2>
          {o.worksByDecade.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No dated works yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2 text-sm">
              {o.worksByDecade.map((d) => (
                <li key={d.decade} className="flex justify-between border-b border-border-default pb-2">
                  <span>{d.decade}s</span>
                  <span className="tabular-nums text-muted-foreground">{d.works}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {more ? (
        <div className="mt-14 grid gap-10 lg:grid-cols-3">
          <section aria-labelledby="stay-heading">
            <h2 id="stay-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">
              How long people stayed
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">Median length of a dated period here, by the decade it began.</p>
            {more.stayByDecade.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Not enough dated periods yet.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2 text-sm">
                {more.stayByDecade.map((d) => (
                  <li key={d.decade} className="flex justify-between border-b border-border-default pb-2">
                    <span>{d.decade}s</span>
                    <span className="tabular-nums text-muted-foreground">
                      {d.medianYears === null ? "—" : `${d.medianYears} ${d.medianYears === 1 ? "year" : "years"}`} · {d.periods} periods
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="themes-heading">
            <h2 id="themes-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">
              Themes
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">What people of this Node say they work on (alphabetical).</p>
            {more.themes.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">No themes stated yet.</p>
            ) : (
              <ul className="mt-4 flex flex-wrap gap-2 text-sm">
                {more.themes.map((t) => (
                  <li key={t.label} className="rounded-full border border-border-default px-3 py-1">
                    {t.label} <span className="text-muted-foreground">{t.people}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="shape-heading">
            <h2 id="shape-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">
              Shape of the community
            </h2>
            <dl className="mt-4 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
              <dt className="text-muted-foreground">Bonds between its people</dt>
              <dd className="tabular-nums">{nf.format(more.bondsInside)}</dd>
              <dt className="text-muted-foreground">People with at least one documented bond</dt>
              <dd className="tabular-nums">{nf.format(more.peopleWithBonds)}</dd>
              <dt className="text-muted-foreground">Generations of advisors and advisees</dt>
              <dd className="tabular-nums">{more.mentorGenerations}</dd>
            </dl>
            {more.bridges.length > 0 ? (
              <>
                <h3 className="mt-5 text-sm font-medium text-foreground">Bridges to other Nodes</h3>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {more.bridges.map((b) => (
                    <li key={b.slug}>
                      <Link href={`/n/${b.slug}/observatory`} className="underline underline-offset-2">
                        {b.name}
                      </Link>{" "}
                      <span className="text-muted-foreground">· {b.people} {b.people === 1 ? "person" : "people"} in both</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </div>
      ) : null}

      {o.institutionsReachedList.length > 0 ? (
        <section aria-labelledby="reached-heading" className="mt-14">
          <h2 id="reached-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">
            Institutions reached
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">Alphabetical. The number is how many people from this Node the record later places there.</p>
          <ul className="mt-4 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {o.institutionsReachedList.map((i) => (
              <li key={i.id} className="flex justify-between gap-3">
                <span>{i.name}</span>
                <span className="tabular-nums text-muted-foreground">{i.people}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="method-heading" className="mt-14">
        <h2 id="method-heading" className="text-sm font-medium text-foreground">
          How these are counted
        </h2>
        <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
          {o.method.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
