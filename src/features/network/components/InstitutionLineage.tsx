import { EmptyState } from "@/components/ui/EmptyState";

import { buildNetworkView } from "../derive";
import type { NetworkDocument } from "../types";
import { NetworkConnectionEntry } from "./NetworkConnectionEntry";

// Institutional lineage, read INLINE on the canonical Institution page (M7
// refinement, ADR-0017): the institution-to-institution relationships
// (predecessor/successor, parent/subordinate, administration, hosting, merger,
// affiliation, partnership, joint operation) that the M6.5 Institution page
// reserved a slot for. This is the one genuinely new documented connection M7
// adds to the canonical reading experience -- everything else (participation,
// contribution, timeline) was already read on the canonical pages. The
// connections are PROJECTED from the canonical organization_relationships rows
// via get_organization_network; a missing relationship is an honest absence,
// never an inferred bond. Server Component.
export function InstitutionLineage({ document }: { document: NetworkDocument | null }) {
  const headingId = "institutional-relationships-heading";
  const section = document
    ? buildNetworkView(document).sections.find((s) => s.key === "institutional_lineage")
    : undefined;
  const focalLabel = document?.focal.label ?? "";

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="text-sm font-medium text-foreground">
        Institutional relationships
      </h2>
      {section ? (
        <ul className="mt-4 flex flex-col gap-5">
          {section.connections.map((connection) => (
            <NetworkConnectionEntry key={connection.id} focalLabel={focalLabel} connection={connection} />
          ))}
        </ul>
      ) : (
        <div className="mt-3">
          <EmptyState
            title="No institutional relationships recorded yet"
            description="No documented predecessor, successor, parent, affiliation, or other institutional relationship has been recorded for this institution yet — an honest absence, not a claim that none exist."
          />
        </div>
      )}
    </section>
  );
}
