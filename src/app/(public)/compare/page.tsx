import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";
import { pageTitle } from "@/config/site";
import { nodeLabel } from "@/features/nodes/parse";
import { listNodes } from "@/features/nodes/read";
import { compareRows, sharedDestinations } from "@/features/observatory/compare";
import { getObservatory } from "@/features/observatory/read";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: pageTitle("Compare Nodes"),
};

// Comparative history (ROTEIRO fase 2, etapa N): two Nodes side by side,
// from their public Observatories. Counts of records; nobody is ranked.
export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const { a, b } = await searchParams;
  const nodes = await listNodes();
  const [oa, ob] = await Promise.all([a ? getObservatory(a) : null, b ? getObservatory(b) : null]);
  const rows = oa && ob ? compareRows(oa, ob) : [];
  const shared = oa && ob ? sharedDestinations(oa, ob) : [];
  const select = (name: "a" | "b", value: string | undefined) => (
    <select name={name} defaultValue={value ?? ""} aria-label={name === "a" ? "First Node" : "Second Node"} className="rounded-md border border-border-default bg-surface px-3 py-2 text-sm">
      <option value="" disabled>
        Choose a Node
      </option>
      {nodes.map((n) => (
        <option key={n.slug} value={n.slug}>
          {nodeLabel(n)}
        </option>
      ))}
    </select>
  );

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[76rem] px-5 py-14 sm:px-10">
      <h1 className="font-display text-5xl font-extrabold tracking-tight text-foreground">Compare Nodes</h1>
      <p className="mt-3 max-w-prose text-muted-foreground">
        Two histories on the same engine, side by side: how long they have been documented, how many people passed through, and where knowledge travelled.
      </p>

      {nodes.length < 2 ? (
        <p className="mt-8 max-w-prose rounded-md border border-dashed border-border-default px-4 py-4 text-sm text-muted-foreground">
          There is one Node so far. As soon as a second institution joins, its history can be compared here.{" "}
          <Link href="/plans" className="underline underline-offset-2">
            Bring your institution
          </Link>
          .
        </p>
      ) : (
        <form method="get" className="mt-8 flex flex-wrap items-center gap-3">
          {select("a", a)}
          <span className="text-muted-foreground">and</span>
          {select("b", b)}
          <button type="submit" className={buttonVariants({ emphasis: "primary", size: "sm" })}>
            Compare
          </button>
        </form>
      )}

      {oa && ob ? (
        <>
          <table className="mt-10 w-full text-sm">
            <thead>
              <tr className="border-b border-border-default text-left">
                <th className="py-2 pr-4 font-normal text-muted-foreground"> </th>
                <th className="py-2 pr-4 font-display text-lg font-bold">
                  <Link href={`/n/${oa.node.slug}/observatory`} className="underline underline-offset-2">
                    {oa.node.shortName ?? oa.node.name}
                  </Link>
                </th>
                <th className="py-2 font-display text-lg font-bold">
                  <Link href={`/n/${ob.node.slug}/observatory`} className="underline underline-offset-2">
                    {ob.node.shortName ?? ob.node.name}
                  </Link>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b border-border-default">
                  <th scope="row" className="py-2 pr-4 text-left font-normal text-muted-foreground">
                    {r.label}
                  </th>
                  <td className="py-2 pr-4 tabular-nums">{r.a}</td>
                  <td className="py-2 tabular-nums">{r.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {shared.length > 0 ? (
            <section aria-labelledby="shared-heading" className="mt-10">
              <h2 id="shared-heading" className="font-display text-2xl font-bold tracking-tight text-foreground">
                Where both histories meet
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">Institutions the record shows people from both Nodes went on to.</p>
              <ul className="mt-3 flex flex-wrap gap-2 text-sm">
                {shared.map((s) => (
                  <li key={s} className="rounded-full border border-border-default px-3 py-1">
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p className="mt-8 text-xs text-muted-foreground">Each Node&apos;s record is incomplete in its own way; differences can come from what has been documented so far.</p>
        </>
      ) : null}
    </main>
  );
}
