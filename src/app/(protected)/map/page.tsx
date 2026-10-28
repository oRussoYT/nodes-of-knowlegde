import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { MapView, type Dot } from "@/features/map/components/MapView";
import { COUNTRY_POINTS } from "@/features/map/countries";
import { yearSentence } from "@/features/map/parse";
import { getMapPlaces, getMapToday, getMovements } from "@/features/map/read";
import { isCurrentUserSteward } from "@/features/review/authorization";

// Maps (ROTEIRO fase 2, etapa G): the map in time, where people are today,
// and movements between places. Counts of records; never a ranking.
export const metadata: Metadata = {
  title: pageTitle("Map"),
};

type View = "time" | "today" | "movements";

export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const view: View = raw.view === "today" || raw.view === "movements" ? raw.view : "time";
  const yearRaw = typeof raw.year === "string" && /^\d{4}$/.test(raw.year) ? Number(raw.year) : null;
  const doc = await getMapPlaces(view === "time" ? yearRaw : null);
  const year = view === "time" ? (yearRaw ?? doc.years.max ?? new Date().getUTCFullYear()) : null;
  const timeDoc = view === "time" && yearRaw === null && year !== null ? await getMapPlaces(year) : doc;
  const today = view === "today" ? await getMapToday() : [];
  const movements = view === "movements" ? await getMovements() : [];
  const isSteward = await isCurrentUserSteward();

  const placeDots: Dot[] = timeDoc.places.map((p) => ({
    id: p.id,
    href: `/institutions/${p.id}`,
    label: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    count: view === "time" ? p.people : view === "today" ? p.people : p.everPeople,
  }));
  const countryDots: Dot[] = today.flatMap((c) => {
    const pt = COUNTRY_POINTS[c.countryCode];
    return pt ? [{ id: `c-${c.countryCode}`, href: `/map?view=today#c-${c.countryCode}`, label: pt.name, latitude: pt.lat, longitude: pt.lon, count: c.people }] : [];
  });
  const tab = (v: View, label: string) => (
    <Link
      href={v === "time" ? "/map" : `/map?view=${v}`}
      aria-current={view === v ? "page" : undefined}
      className={`rounded-full border px-3 py-1 text-sm ${view === v ? "border-foreground bg-foreground text-background" : "border-border-default text-foreground"}`}
    >
      {label}
    </Link>
  );
  const listed = (view === "today" ? [...placeDots.filter((d) => d.count > 0), ...countryDots] : placeDots).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="shell">
        <PageHeader
          title="Map"
          description="Where the people of this history were, year by year; where they are today; and how they moved between places."
          action={
            isSteward ? (
              <Link href="/review/locations" className="text-sm underline underline-offset-2">
                Place institutions on the map
              </Link>
            ) : undefined
          }
        />

        <nav aria-label="Map views" className="mt-6 flex flex-wrap gap-2">
          {tab("time", "In time")}
          {tab("today", "Today")}
          {tab("movements", "Movements")}
        </nav>

        {view === "time" ? (
          <form method="get" className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            <label htmlFor="year" className="text-muted-foreground">
              Year
            </label>
            <input
              id="year"
              name="year"
              type="number"
              min={doc.years.min ?? 1900}
              max={doc.years.max ?? 2100}
              defaultValue={year ?? ""}
              className="w-28 rounded-md border border-border-default bg-surface px-2 py-1.5"
            />
            <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
              Show
            </button>
            {year !== null ? (
              <span className="flex gap-3">
                <Link href={`/map?year=${year - 1}`} className="underline underline-offset-2">
                  ← {year - 1}
                </Link>
                <Link href={`/map?year=${year + 1}`} className="underline underline-offset-2">
                  {year + 1} →
                </Link>
              </span>
            ) : null}
          </form>
        ) : null}

        {timeDoc.places.length === 0 && countryDots.length === 0 ? (
          <EmptyState
            className="mt-8"
            title="No institution is on the map yet"
            description={isSteward ? "Place institutions on the map: find their locations in ROR or enter them by hand." : "Stewards are placing institutions on the map."}
          />
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
            <div>
              {view === "time" ? <p className="mb-3 font-display text-xl font-bold tracking-tight text-foreground">{yearSentence(timeDoc)}</p> : null}
              <MapView
                dots={view === "today" ? [...placeDots, ...countryDots] : placeDots}
                items={view === "time" ? timeDoc.items : []}
                movements={movements}
                title={view === "movements" ? "Movements between institutions" : view === "today" ? "Where people are today" : `The record in ${year}`}
              />
              {timeDoc.withoutLocation > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">{timeDoc.withoutLocation} institutions are not on the map yet (no location recorded).</p>
              ) : null}
            </div>
            <aside aria-label="Places" className="text-sm">
              {view === "movements" ? (
                <ul className="flex flex-col gap-2">
                  {movements.length === 0 ? <li className="text-muted-foreground">No movements between located institutions yet.</li> : null}
                  {movements.map((m) => (
                    <li key={`${m.fromId}-${m.toId}`}>
                      <Link href={`/institutions/${m.fromId}`} className="underline underline-offset-2">
                        {m.fromName}
                      </Link>{" "}
                      →{" "}
                      <Link href={`/institutions/${m.toId}`} className="underline underline-offset-2">
                        {m.toName}
                      </Link>
                      <span className="text-muted-foreground">
                        {" "}
                        · {m.people} {m.people === 1 ? "person" : "people"}
                        {m.firstYear ? ` · ${m.firstYear === m.lastYear ? m.firstYear : `${m.firstYear}–${m.lastYear}`}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <ul className="flex flex-col gap-1">
                  {listed.map((d) => (
                    <li key={d.id} id={d.id} className="flex justify-between gap-3">
                      {d.id.startsWith("c-") ? (
                        <span>{d.label}</span>
                      ) : (
                        <Link href={d.href} className="underline underline-offset-2">
                          {d.label}
                        </Link>
                      )}
                      <span className="tabular-nums text-muted-foreground">{d.count}</span>
                    </li>
                  ))}
                </ul>
              )}
              {view === "today" ? <p className="mt-3 text-xs text-muted-foreground">Countries: latest confirmed destination of each graduate. Institutions: people with an ongoing period there.</p> : null}
            </aside>
          </div>
        )}
      </Container>
    </main>
  );
}
