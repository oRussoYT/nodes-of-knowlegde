import { formatTemporal } from "../temporal";
import type { EventTemporal } from "../types";

// Renders the temporal descriptor honestly: the date string as computed by the
// temporal engine, plus a short parenthetical note that keeps approximation
// and uncertainty distinct and visible. Undated reads calmly as "Date
// unknown" (muted), never hidden. Server Component.
export function TemporalLabel({ temporal }: { temporal: EventTemporal }) {
  const descriptor = formatTemporal(temporal);
  return (
    <p className={descriptor.isUnknown ? "text-sm font-medium text-muted-foreground" : "text-sm font-medium text-foreground"}>
      <span>{descriptor.label}</span>
      {descriptor.certaintyNote ? (
        <span className="ml-2 text-xs font-normal text-muted-foreground">({descriptor.certaintyNote})</span>
      ) : null}
    </p>
  );
}
