import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/PageHeader";
import { pageTitle } from "@/config/site";
import { HeritageList } from "@/features/heritage/components/HeritageList";
import { getHeritageCounts, listHeritage } from "@/features/heritage/read";

// "Everything has a history" (ROTEIRO fase 2, etapa F): projects, stations,
// expeditions, collections, species, photos, documents, old maps and oral
// histories. Alphabetical within a kind -- never ranked.
export const metadata: Metadata = {
  title: pageTitle("History"),
};

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const counts = await getHeritageCounts();
  const kind = typeof raw.kind === "string" && counts.some((c) => c.key === raw.kind) ? raw.kind : null;
  const q = typeof raw.q === "string" ? raw.q.trim().slice(0, 100) : "";
  const items = await listHeritage(kind, q || null);
  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${active ? "border-foreground bg-foreground text-background" : "border-border-default text-foreground"}`;

  return (
    <main id="main-content" tabIndex={-1} className="py-16">
      <Container width="content">
        <PageHeader
          title="History"
          description="The projects, stations, expeditions, collections and species of this history — and the photos, documents, maps and voices that keep it. Each item says what documents it."
          action={
            <Link href="/history/new" className={buttonVariants({ emphasis: "primary", size: "sm" })}>
              Add to the history
            </Link>
          }
        />

        <nav aria-label="Kinds" className="mt-6 flex flex-wrap gap-2">
          <Link href="/history" className={chip(kind === null)}>
            All
          </Link>
          {counts.map((c) => (
            <Link key={c.key} href={`/history?kind=${c.key}`} className={chip(kind === c.key)}>
              {c.plural} <span className="opacity-70">{c.count}</span>
            </Link>
          ))}
        </nav>

        <form role="search" method="get" className="mt-4 flex gap-2">
          {kind ? <input type="hidden" name="kind" value={kind} /> : null}
          <label htmlFor="history-q" className="sr-only">
            Search the history
          </label>
          <input
            id="history-q"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="A title, a species, a place"
            className="min-w-0 flex-1 rounded-md border border-border-default bg-surface px-3 py-2 text-sm"
          />
          <button type="submit" className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
            Search
          </button>
        </form>

        <div className="mt-8">
          {items.length === 0 ? (
            <EmptyState
              title={q ? "Nothing found" : "Nothing here yet"}
              description="Add a project, a station, an expedition, a photo or an interview — with what documents it."
            />
          ) : (
            <HeritageList items={items} />
          )}
        </div>
      </Container>
    </main>
  );
}
