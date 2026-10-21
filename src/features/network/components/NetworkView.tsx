import { Divider } from "@/components/ui/Divider";
import { EmptyState } from "@/components/ui/EmptyState";

import { networkCopy } from "../copy";
import { buildNetworkView } from "../derive";
import type { NetworkDocument } from "../types";
import { NetworkConnectionGroup } from "./NetworkConnectionGroup";
import { NetworkFocalHeader } from "./NetworkFocalHeader";
import { NetworkLimitsNote } from "./NetworkLimitsNote";
import { ReservedNetworkVisualization } from "./ReservedNetworkVisualization";

// The complete Knowledge Network reading experience for one focal record: the
// focal band, the documented connections grouped by historical meaning (or a
// dignified honest empty state), a reserved visual-map surface, and the honest
// limits-of-this-view note. Textual and fully usable without any diagram. The
// four /network routes each read their own bounded model and compose this.
// Server Component.
export interface NetworkViewProps {
  document: NetworkDocument;
  whatThisShows: string;
}

export function NetworkView({ document, whatThisShows }: NetworkViewProps) {
  const view = buildNetworkView(document);

  return (
    <>
      <NetworkFocalHeader
        focal={document.focal}
        connectionCount={view.connectionCount}
        whatThisShows={whatThisShows}
      />

      <Divider />

      {view.isEmpty ? (
        <div className="mt-8">
          <EmptyState title={networkCopy.empty.title} description={networkCopy.empty.description} />
        </div>
      ) : (
        <section aria-labelledby="network-connections-heading" className="mt-8">
          <h2 id="network-connections-heading" className="text-sm font-medium text-foreground">
            {networkCopy.connectionsHeading}
          </h2>
          <div className="mt-4 flex flex-col gap-8">
            {view.sections.map((section) => (
              <NetworkConnectionGroup
                key={section.key}
                focalLabel={document.focal.label}
                section={section}
              />
            ))}
          </div>
        </section>
      )}

      <ReservedNetworkVisualization />

      <NetworkLimitsNote />
    </>
  );
}
