import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { pageTitle } from "@/config/site";
import { span } from "@/features/cv/parse";
import { PrintButton } from "@/features/cv/PrintButton";
import { getPersonCv } from "@/features/cv/read";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const metadata: Metadata = {
  title: pageTitle("Record as a CV"),
};

// A person's record laid out as a CV, to print or save as PDF. Everything is
// what the record holds, with its status; nothing is added.
export default async function CvPage({ params }: { params: Promise<{ personId: string }> }) {
  const { personId } = await params;
  if (!UUID.test(personId)) notFound();
  const cv = await getPersonCv(personId);
  if (!cv) notFound();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-3xl px-6 py-12 print:py-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/people/${cv.id}`} className="text-sm underline underline-offset-2">
          Back to the page
        </Link>
        <PrintButton />
      </div>
      <h1 className="mt-6 font-display text-4xl font-bold tracking-tight text-foreground">{cv.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {cv.orcid ? (
          <>
            ORCID{" "}
            <a href={cv.orcid} className="underline underline-offset-2">
              {cv.orcid.replace("https://orcid.org/", "")}
            </a>{" "}
            ·{" "}
          </>
        ) : null}
        From the Nodes of Knowledge record, {today}. {cv.verificationStatus === "provisional" ? "Provisional: not yet confirmed by the person." : ""}
      </p>
      {cv.topics.length > 0 ? <p className="mt-3 text-foreground">Works on: {cv.topics.join(", ")}</p> : null}

      <section aria-labelledby="cv-periods" className="mt-10">
        <h2 id="cv-periods" className="border-b border-border-default pb-1 font-display text-xl font-bold text-foreground">
          Positions and studies
        </h2>
        {cv.periods.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">None recorded.</p> : null}
        <ul className="mt-3 flex flex-col gap-3">
          {cv.periods.map((p, i) => (
            <li key={`${p.organizationId}-${i}`} className="grid gap-1 sm:grid-cols-[8rem_1fr]">
              <span className="tabular-nums text-muted-foreground">{span(p)}</span>
              <span>
                <strong className="font-medium text-foreground">{p.organization}</strong>
                {p.role ? <span className="text-foreground"> — {p.role}</span> : null}
                {p.status !== "confirmed" ? <span className="text-xs text-muted-foreground"> (provisional)</span> : null}
                {p.note ? <span className="block text-xs text-muted-foreground">{p.note}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="cv-works" className="mt-10">
        <h2 id="cv-works" className="border-b border-border-default pb-1 font-display text-xl font-bold text-foreground">
          Works ({cv.works.length})
        </h2>
        <ol className="mt-3 flex flex-col gap-2 text-sm">
          {cv.works.map((w) => (
            <li key={w.id} className="grid gap-1 sm:grid-cols-[4rem_1fr]">
              <span className="tabular-nums text-muted-foreground">{w.year ?? "n.d."}</span>
              <span className="text-foreground">
                {w.url ? (
                  <a href={w.url} className="underline underline-offset-2">
                    {w.title}
                  </a>
                ) : (
                  w.title
                )}
                {w.kind ? <span className="text-muted-foreground"> · {w.kind}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {cv.bonds.length > 0 ? (
        <section aria-labelledby="cv-bonds" className="mt-10">
          <h2 id="cv-bonds" className="border-b border-border-default pb-1 font-display text-xl font-bold text-foreground">
            Documented bonds
          </h2>
          <ul className="mt-3 flex flex-col gap-1 text-sm">
            {cv.bonds.map((b) => (
              <li key={b.personId + (b.kind ?? "")}>
                {b.name}
                {b.kind ? <span className="text-muted-foreground"> — {b.kind}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
