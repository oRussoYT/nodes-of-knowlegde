// Pure presentation derivation for the Knowledge Network: grouping a flat,
// deterministically-ordered one-hop neighbourhood into sections by HISTORICAL
// MEANING (people, institutions, institutional lineage, contributions, events),
// plus honest counts. No I/O, no JSX, no ranking. Unit-tested.
//
// The read model already orders connections (family, then chronology undated-
// last, then label, then id), and this preserves that order within each
// section -- so groups read historically, never by prestige or "connectedness".
// The engine ranks no connection above another; a section's position is fixed
// reading order, not importance.

import type { NetworkDocument, ProjectedConnection } from "./types";

export type NetworkSectionKey =
  | "institutional_lineage"
  | "people"
  | "institutions"
  | "contributions"
  | "events";

/** Fixed reading order of sections. Only non-empty sections are rendered. On an
 * institution page lineage leads; on a person page it is simply absent. */
export const NETWORK_SECTION_ORDER: readonly NetworkSectionKey[] = [
  "institutional_lineage",
  "people",
  "institutions",
  "contributions",
  "events",
];

export interface NetworkSection {
  key: NetworkSectionKey;
  connections: ProjectedConnection[];
}

export interface NetworkView {
  isEmpty: boolean;
  sections: NetworkSection[];
  connectionCount: number;
}

function sectionOf(connection: ProjectedConnection): NetworkSectionKey {
  if (connection.family === "institutional_relationship") {
    return "institutional_lineage";
  }
  switch (connection.node.type) {
    case "person":
      return "people";
    case "organization":
      return "institutions";
    case "contribution":
      return "contributions";
    case "event":
      return "events";
  }
}

export function buildNetworkView(document: NetworkDocument): NetworkView {
  const connections = document.connections;
  if (connections.length === 0) {
    return { isEmpty: true, sections: [], connectionCount: 0 };
  }

  const byKey = new Map<NetworkSectionKey, ProjectedConnection[]>();
  for (const connection of connections) {
    const key = sectionOf(connection);
    const bucket = byKey.get(key);
    if (bucket === undefined) {
      byKey.set(key, [connection]);
    } else {
      bucket.push(connection);
    }
  }

  const sections: NetworkSection[] = [];
  for (const key of NETWORK_SECTION_ORDER) {
    const bucket = byKey.get(key);
    if (bucket !== undefined && bucket.length > 0) {
      sections.push({ key, connections: bucket });
    }
  }

  return { isEmpty: false, sections, connectionCount: connections.length };
}

// Provenance labelling is the platform-shared kernel, re-exported so provenance
// reads identically to every other engine.
export { describeProvenance as describeNetworkProvenance } from "@/features/shared/provenance";
export type { ProvenanceDescriptor as NetworkProvenanceDescriptor } from "@/features/shared/provenance";
