import { EmptyState } from "@/components/ui/EmptyState";

import { timelineCopy } from "../copy";
import { buildTimelineView } from "../derive";
import type { TimelineDocument } from "../types";
import { TimelinePeriod } from "./TimelinePeriod";

// The Timeline: the historical spine of the Scientific Biography (and, later,
// of any entity). Renders periods (decade-grouped only when the timeline spans
// two or more decades -- otherwise a calm chronological list), with undated
// events in a final honest "Date unknown" group. An empty timeline shows a
// dignified honest state, never fabricated milestones. Node-neutral and
// entity-agnostic: give it any TimelineDocument. Server Component.
export function Timeline({ document }: { document: TimelineDocument | null }) {
  const headingId = "timeline-heading";
  const view = document
    ? buildTimelineView(document)
    : { isEmpty: true as const, grouped: false, periods: [], eventCount: 0 };

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-foreground">
        {timelineCopy.sectionTitle}
      </h2>

      {view.isEmpty ? (
        <div className="mt-3">
          <EmptyState title={timelineCopy.empty.title} description={timelineCopy.empty.description} />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-8">
          {view.periods.map((period) => (
            <TimelinePeriod
              key={period.key}
              label={period.label}
              events={period.events}
              eventHeadingLevel={view.grouped ? 4 : 3}
            />
          ))}
        </div>
      )}
    </section>
  );
}
