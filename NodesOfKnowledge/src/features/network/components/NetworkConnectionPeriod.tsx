import { formatTemporal, type TemporalValue } from "@/features/shared/temporal";

// The period of a single projected connection, rendered through the shared
// Many-Clocks kernel so a connection is dated with the same honesty as every
// other engine. A null temporal (an attribution that carries no period) renders
// nothing rather than inventing a date; an unknown period renders "Date
// unknown" rather than a timeless claim. Server Component.
export function NetworkConnectionPeriod({ temporal }: { temporal: TemporalValue | null }) {
  if (temporal === null) {
    return null;
  }
  const descriptor = formatTemporal(temporal);
  return (
    <p className="mt-1 text-sm text-muted-foreground">
      <span>{descriptor.label}</span>
      {descriptor.certaintyNote ? <span> · {descriptor.certaintyNote}</span> : null}
    </p>
  );
}
