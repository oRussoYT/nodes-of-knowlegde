import { describeEventProvenance } from "../derive";
import type { TimelineEvent as TimelineEventModel } from "../types";
import { EventProvenance } from "./EventProvenance";
import { TemporalLabel } from "./TemporalLabel";

// One timeline event: temporal label, title, generic kind (+ place when
// present), concise historical context, and provenance one gesture away. Not
// a feed item, not a log line -- a piece of history. The heading level is
// supplied so the document outline never skips a level (h3 when flat, h4
// under a decade heading). Server Component.
export interface TimelineEventProps {
  event: TimelineEventModel;
  headingLevel: 3 | 4;
}

export function TimelineEvent({ event, headingLevel }: TimelineEventProps) {
  const Heading = (`h${headingLevel}` as "h3" | "h4");
  const provenance = describeEventProvenance(event.provenance.sourceType, event.provenance.verificationStatus);
  const meta = event.place ? `${event.kind.label} · ${event.place}` : event.kind.label;

  return (
    <li className="border-l border-border-default pl-4">
      <TemporalLabel temporal={event.temporal} />
      <Heading className="mt-1 text-base font-medium text-foreground">{event.title}</Heading>
      <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">{meta}</p>
      {event.summary ? (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">{event.summary}</p>
      ) : null}
      <div className="mt-2">
        <EventProvenance sourceLabel={provenance.sourceLabel} statusLabel={provenance.statusLabel} />
      </div>
    </li>
  );
}
