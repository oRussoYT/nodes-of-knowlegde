import { formatTemporal, type TemporalValue } from "@/features/shared/temporal";

// Renders a participation period on the institution page honestly, from the
// shared Many-Clocks kernel ("1980 – 1991", "c. 1985", "Date unknown") plus a
// short certainty note. Muted -- secondary to the person's name. Server
// Component.
export function InstitutionPeriod({ temporal }: { temporal: TemporalValue }) {
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
