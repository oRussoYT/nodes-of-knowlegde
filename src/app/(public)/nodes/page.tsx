import type { Metadata } from "next";
import Link from "next/link";

import { pageTitle } from "@/config/site";
import { PLAN_LABELS, nodeLabel } from "@/features/nodes/parse";
import { listNodes } from "@/features/nodes/read";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: pageTitle("Nodes"),
};

const nf = new Intl.NumberFormat("en");

// Nodes of Knowledge: one platform, many Nodes. Lists the active Nodes with
// their counts (never names), alphabetically.
export default async function NodesPage() {
  const nodes = await listNodes();

  return (
    <main id="main-content" tabIndex={-1} className="mx-auto max-w-[76rem] px-5 py-16 sm:px-10">
      <p className="text-sm font-medium text-muted-foreground">Nodes of Knowledge</p>
      <h1 className="mt-3 font-display text-5xl font-bold leading-[0.95] tracking-[-0.03em] text-foreground sm:text-7xl">
        One record. Many Nodes.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
        Each Node is an institution or a project with its own people, history and stewards — all in one connected
        record of who produced knowledge, with whom, where and when. One account works across every Node.
      </p>

      {nodes.length === 0 ? (
        <p className="mt-10 text-muted-foreground">No Nodes yet.</p>
      ) : (
        <ul className="mt-10 grid gap-5 md:grid-cols-2">
          {nodes.map((node) => {
            const cover = node.coverPhoto ?? "/photos/aerial";
            return (
              <li key={node.slug}>
                <Link
                  href={`/n/${node.slug}`}
                  className="nk-tile group relative block overflow-hidden rounded-3xl bg-nk-ink text-nk-bone focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- decorative cover, already compressed (public/photos) */}
                  <img src={`${cover}-960.jpg`} alt="" className="h-48 w-full object-cover opacity-70 transition-transform duration-700 group-hover:scale-105" />
                  <div className="p-6">
                    <p className="font-display text-4xl font-extrabold tracking-tight">{nodeLabel(node)}</p>
                    <p className="mt-1 text-[15px] text-[#c3c8b6]">{node.name}</p>
                    <p className="mt-4 text-sm text-[#c3c8b6]">
                      {nf.format(node.counts.people)} people · {nf.format(node.counts.institutions)} institutions ·{" "}
                      {PLAN_LABELS[node.plan]}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
