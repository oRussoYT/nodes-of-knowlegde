import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { formatTemporal } from "@/features/shared/temporal";
import { cn } from "@/lib/ui/cn";

import { trajectoryCopy } from "../copy";
import { percentOf, type TrajectorySegment, type TrajectoryView } from "../derive";

function segmentTitle(lane: string, segment: TrajectorySegment): string {
  const end = segment.isOngoing ? trajectoryCopy.ongoing : String(segment.endYear);
  const range = segment.startYear === segment.endYear && !segment.isOngoing ? `${segment.startYear}` : `${segment.startYear} – ${end}`;
  const notes = [
    segment.isApproximate ? trajectoryCopy.approximate : null,
    segment.isUncertain ? trajectoryCopy.uncertain : null,
  ].filter(Boolean);
  return `${lane} · ${segment.capacityLabel} · ${segment.isApproximate ? "c. " : ""}${range}${notes.length ? ` (${notes.join(", ")})` : ""}`;
}

// Screen 10 (PRODUTO.md): lanes through time. One lane per institution, one
// bar per documented participation. Approximate bars are hatched, unconfirmed
// bars are outlined, ongoing bars run to the present -- the same four
// non-conflated temporal concepts the rest of the record keeps. Pure CSS (no
// chart library), accessible as a list. Server Component.
export function TrajectoryChart({
  view,
  compact = false,
  linkInstitutions = true,
}: {
  view: TrajectoryView;
  compact?: boolean;
  /** Off on public pages, where institution pages still need an account. */
  linkInstitutions?: boolean;
}) {
  if (view.lanes.length === 0) {
    return view.undated.length === 0 ? (
      <EmptyState title={trajectoryCopy.empty.title} description={trajectoryCopy.empty.description} />
    ) : (
      <UndatedList view={view} />
    );
  }

  return (
    <div>
      <ul aria-label={trajectoryCopy.lanesLabel} className="flex flex-col gap-2">
        {view.lanes.map((lane) => (
          <li key={lane.organizationId} className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
            {linkInstitutions ? (
              <Link
                href={`/institutions/${lane.organizationId}`}
                className="truncate text-xs text-muted-foreground underline-offset-2 hover:underline"
                title={lane.organizationName}
              >
                {lane.organizationName}
              </Link>
            ) : (
              <span className="truncate text-xs text-muted-foreground" title={lane.organizationName}>
                {lane.organizationName}
              </span>
            )}
            <div className={cn("relative rounded-sm bg-surface-sunken", compact ? "h-3" : "h-5")}>
              {lane.segments.map((segment) => {
                const left = percentOf(segment.startYear, view);
                const width = Math.max(percentOf(segment.endYear + 1, view) - left, 1.5);
                const title = segmentTitle(lane.organizationName, segment);
                return (
                  <span
                    key={segment.participationId}
                    role="img"
                    aria-label={title}
                    title={title}
                    className={cn(
                      "absolute inset-y-0 rounded-sm",
                      segment.isUncertain ? "border-2 border-accent bg-transparent" : "bg-accent",
                      segment.isApproximate && !segment.isUncertain && "opacity-60",
                    )}
                    style={{ left: `${left}%`, width: `${width}%` }}
                  />
                );
              })}
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 grid grid-cols-[7rem_minmax(0,1fr)] gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]" aria-hidden="true">
        <span />
        <div className="relative h-4 text-[10px] text-muted-foreground">
          {view.ticks.map((tick) => (
            <span key={tick} className="absolute -translate-x-1/2" style={{ left: `${percentOf(tick, view)}%` }}>
              {tick}
            </span>
          ))}
        </div>
      </div>

      {!compact && view.undated.length > 0 ? <UndatedList view={view} /> : null}
    </div>
  );
}

function UndatedList({ view }: { view: TrajectoryView }) {
  return (
    <div className="mt-6">
      <h3 className="text-xs font-medium text-foreground">{trajectoryCopy.undatedTitle}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{trajectoryCopy.undatedDescription}</p>
      <ul className="mt-2 flex flex-col gap-1 text-sm">
        {view.undated.map((p) => (
          <li key={p.id}>
            {p.organization.name} · {p.capacity.label} · {formatTemporal(p.temporal).label}
          </li>
        ))}
      </ul>
    </div>
  );
}
