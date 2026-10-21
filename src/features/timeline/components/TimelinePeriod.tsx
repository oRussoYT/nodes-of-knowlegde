import type { TimelineEvent as TimelineEventModel } from "../types";
import { TimelineEvent } from "./TimelineEvent";

// A period group: an optional decade heading ("1980s") or the "Date unknown"
// group, followed by its events as an ordered (chronological) list. When the
// group is unlabeled (a short, single-decade timeline) the events sit directly
// under the section, so events take heading level 3; under a decade heading
// they take level 4. Server Component.
export interface TimelinePeriodProps {
  label: string;
  events: TimelineEventModel[];
  eventHeadingLevel: 3 | 4;
}

export function TimelinePeriod({ label, events, eventHeadingLevel }: TimelinePeriodProps) {
  return (
    <div>
      {label ? (
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h3>
      ) : null}
      <ol className={label ? "mt-3 flex flex-col gap-6" : "flex flex-col gap-6"}>
        {events.map((event) => (
          <TimelineEvent key={event.id} event={event} headingLevel={eventHeadingLevel} />
        ))}
      </ol>
    </div>
  );
}
