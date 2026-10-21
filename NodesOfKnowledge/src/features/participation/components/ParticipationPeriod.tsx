import { formatTemporal, type TemporalValue } from "@/features/shared/temporal";

// Renders the belonging PERIOD honestly, from the shared Many-Clocks kernel:
// the period string ("1992 – present", "c. 1990", "Date unknown") plus a short
// parenthetical note that keeps approximation and uncertainty distinct and
// visible. Undated reads calmly as "Date unknown", never hidden. The period is
// secondary to the capacity heading above it, so it is muted. Server Component.
export function ParticipationPeriod({ temporal }: { temporal: TemporalValue }) {
  const descriptor = formatTemporal(temporal);
  return (
    <p className="mt-0.5 text-sm text-muted-foreground">
      <span>{descriptor.label}</span>
      {descriptor.certaintyNote ? (
        <span className="ml-2 text-xs text-muted-foreground">({descriptor.certaintyNote})</span>
      ) : null}
    </p>
  );
}
