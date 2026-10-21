import { formatTemporal, type TemporalValue } from "@/features/shared/temporal";

// Renders the bond's PERIOD honestly, from the shared Many-Clocks kernel: the
// period string ("1987 – 1998", "c. 1990", "1992 – present", "Date unknown")
// plus a short parenthetical note keeping approximation and uncertainty
// distinct and visible. The period is secondary to the counterpart's name
// above it, so it is muted. Server Component.
export function RelationshipPeriod({ temporal }: { temporal: TemporalValue }) {
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
