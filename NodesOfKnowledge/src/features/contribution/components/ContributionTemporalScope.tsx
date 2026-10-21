import { contributionScope } from "../derive";
import type { TemporalValue } from "@/features/shared/temporal";

// Renders a contribution's temporal scope honestly, from the shared Many-Clocks
// kernel ("1980 – present", "c. 1985", "Date unknown") plus a short certainty
// note. A contribution's scope is its OWN -- never a publication or event date.
// Muted; secondary to the title. Server Component.
export function ContributionTemporalScope({ temporal }: { temporal: TemporalValue }) {
  const descriptor = contributionScope(temporal);
  return (
    <p className="mt-0.5 text-sm text-muted-foreground">
      <span>{descriptor.label}</span>
      {descriptor.certaintyNote ? (
        <span className="ml-2 text-xs text-muted-foreground">({descriptor.certaintyNote})</span>
      ) : null}
    </p>
  );
}
