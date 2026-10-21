import Link from "next/link";

import { buttonVariants } from "@/components/ui/Button";

import { trajectoryCopy } from "../copy";
import type { PersonOverview, TrajectoryView } from "../derive";
import { TrajectoryChart } from "./TrajectoryChart";

// Screen 01 (PRODUTO.md): the band at the top of a person page -- a few facts
// from the record and a compact trajectory, with a door into the full
// trajectory. Facts, not a score: nothing is ranked or compared to anyone.
export function PersonOverviewBand({
  personId,
  overview,
  trajectory,
}: {
  personId: string;
  overview: PersonOverview;
  trajectory: TrajectoryView;
}) {
  // Honest absence: a person with nothing documented yet gets no band of
  // zeros -- the sections below carry their own dignified empty states.
  const hasAnything =
    trajectory.lanes.length > 0 ||
    trajectory.undated.length > 0 ||
    overview.documentedAlongside > 0 ||
    overview.mentoredBy > 0 ||
    overview.mentored > 0;
  if (!hasAnything) {
    return null;
  }

  const span =
    overview.firstYear !== null && overview.lastYear !== null ? `${overview.firstYear}–${overview.lastYear}` : "—";
  const facts = [
    { value: String(overview.institutions), label: trajectoryCopy.overview.institutions },
    { value: String(overview.documentedAlongside), label: trajectoryCopy.overview.alongside },
    { value: String(overview.mentoredBy), label: trajectoryCopy.overview.mentoredBy },
    { value: String(overview.mentored), label: trajectoryCopy.overview.mentored },
    { value: span, label: trajectoryCopy.overview.span },
  ];

  return (
    <section aria-label={trajectoryCopy.heading} className="mt-8">
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col-reverse rounded-md border border-border-default bg-surface px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{fact.label}</dt>
            <dd className="text-lg font-semibold tabular-nums text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>

      {trajectory.lanes.length > 0 ? (
        <div className="mt-6">
          <TrajectoryChart view={trajectory} compact />
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">{trajectoryCopy.overview.note}</p>
        <Link href={`/people/${personId}/trajectory`} className={buttonVariants({ emphasis: "secondary", size: "sm" })}>
          {trajectoryCopy.overview.openTrajectory}
        </Link>
      </div>
    </section>
  );
}
