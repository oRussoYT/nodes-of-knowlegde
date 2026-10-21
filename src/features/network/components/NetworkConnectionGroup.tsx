import { sectionHeading } from "../copy";
import type { NetworkSection } from "../derive";
import { NetworkConnectionEntry } from "./NetworkConnectionEntry";

// A section of the neighbourhood, grouped by HISTORICAL MEANING (People,
// Institutions, Institutional lineage, Contributions, Events) -- never by
// prestige or "connectedness". The heading is an h3 (under the "Documented
// connections" h2); each connection is a semantic list item. Server Component.
export interface NetworkConnectionGroupProps {
  focalLabel: string;
  section: NetworkSection;
}

export function NetworkConnectionGroup({ focalLabel, section }: NetworkConnectionGroupProps) {
  const headingId = `network-section-${section.key}`;
  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {sectionHeading(section.key)}
      </h3>
      <ul className="mt-3 flex flex-col gap-5">
        {section.connections.map((connection) => (
          <NetworkConnectionEntry key={connection.id} focalLabel={focalLabel} connection={connection} />
        ))}
      </ul>
    </section>
  );
}
