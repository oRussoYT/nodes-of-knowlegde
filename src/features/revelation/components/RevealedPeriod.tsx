import { formatTemporal, type TemporalValue } from "@/features/shared/temporal";

// The documented period of a revealed element (a cohort member's participation,
// or the focal person's anchor), rendered through the shared Many-Clocks kernel
// so it is dated with the same honesty as every other engine. An approximate or
// uncertain period carries its certainty note; a period is never sharpened.
// Server Component.
export function RevealedPeriod({ temporal }: { temporal: TemporalValue }) {
  const descriptor = formatTemporal(temporal);
  return (
    <p className="mt-1 text-sm text-muted-foreground">
      <span>{descriptor.label}</span>
      {descriptor.certaintyNote ? <span> · {descriptor.certaintyNote}</span> : null}
    </p>
  );
}
