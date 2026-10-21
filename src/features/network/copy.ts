// Centralized, honest, Node-neutral copy for the Knowledge Network surfaces,
// and the DETERMINISTIC derivation of each connection's one-sentence
// explanation. No AI-generated prose (a connection reads only from what its
// canonical assertion supports); no social/engagement language ("people you may
// know", "grow your network", suggestions); no metric, ranking, prestige,
// popularity, influence, or "most connected" language anywhere. Unit-tested for
// Node-neutrality and the absence of that vocabulary.
//
// The network states plainly that it shows DOCUMENTED connections, not the
// totality of scientific history, and that absence is never proof no connection
// exists.

import type { NetworkSectionKey } from "./derive";
import type { NetworkNodeType, ProjectedConnection } from "./types";

export const networkCopy = {
  index: {
    title: "Knowledge Network",
    intro:
      "The Knowledge Network connects the records preserved on this platform — " +
      "people, institutions, contributions, and events — through the explicit, " +
      "evidence-bearing assertions that link them. Begin at a person, an " +
      "institution, or a contribution to read its documented connections.",
    howToReadHeading: "How to read the network",
    howToRead:
      "Every connection shown is drawn from a specific documented record, carries " +
      "its own provenance and date where known, and links back to the connected " +
      "record. The network infers no relationships: a connection appears only " +
      "where an explicit assertion supports it.",
    startHeading: "Start reading",
    startHint: "Find a record in the directories, then open its network from its page.",
  },
  focal: {
    person: {
      title: "Person network",
      whatThisShows:
        "The documented connections linking this person to the institutions, " +
        "people, contributions, and events preserved on this platform.",
    },
    organization: {
      title: "Institution network",
      whatThisShows:
        "The documented connections linking this institution to other " +
        "institutions, people, contributions, and events preserved on this platform.",
    },
    contribution: {
      title: "Contribution network",
      whatThisShows:
        "The documented connections linking this contribution to the people, " +
        "institutions, and events preserved on this platform.",
    },
  },
  sectionHeadings: {
    institutional_lineage: "Institutional lineage",
    people: "People",
    institutions: "Institutions",
    contributions: "Contributions",
    events: "Events",
  } satisfies Record<NetworkSectionKey, string>,
  connectionsHeading: "Documented connections",
  empty: {
    title: "No documented connections yet",
    description:
      "No connections have been recorded for this record yet. This is an honest " +
      "absence, not a claim that none exist — the network shows only connections " +
      "supported by an explicit record.",
  },
  limitsHeading: "Limits of this view",
  limits:
    "This view shows documented connections drawn from the records preserved on " +
    "this platform. It is not a complete picture of scientific history. " +
    "Connections appear only where an explicit, evidence-bearing record supports " +
    "them; some connections may be undocumented, and some may be withheld. " +
    "Absence from this view is never proof that no connection exists.",
  eventNodeNote: "This event does not have its own reading page yet.",
} as const;

/** Count phrase for the focal record, honest and un-ranked. */
export function connectionCountLabel(count: number): string {
  if (count === 0) return "No documented connections";
  if (count === 1) return "1 documented connection";
  return `${count} documented connections`;
}

export function sectionHeading(key: NetworkSectionKey): string {
  return networkCopy.sectionHeadings[key];
}

/** Human phrase for the canonical table an edge is projected from, used in the
 * provenance disclosure so a reader learns which canonical engine the
 * connection was projected from. Deterministic; never cites the network itself. */
export function sourceRecordLabel(type: string): string {
  switch (type) {
    case "participations":
      return "participation record";
    case "relationships":
      return "relationship record";
    case "person_contributions":
    case "organization_contributions":
      return "contribution attribution record";
    case "person_events":
    case "organization_events":
    case "contribution_events":
      return "event association record";
    case "organization_relationships":
      return "institutional relationship record";
    default:
      return "documented record";
  }
}

export function nodeTypeNoun(type: NetworkNodeType): string {
  switch (type) {
    case "person":
      return "person";
    case "organization":
      return "institution";
    case "contribution":
      return "contribution";
    case "event":
      return "event";
  }
}

function lower(value: string): string {
  return value.toLowerCase();
}

function article(word: string): string {
  return /^[aeiou]/i.test(word.trim()) ? "an" : "a";
}

/**
 * Deterministic one-sentence explanation of a single connection, from the focal
 * record's perspective. Uses ONLY data the canonical assertion supplies (the
 * focal and counterpart labels, the family, the direction, and the kind/role
 * labels). Never strengthens a weak assertion: a provisional or disputed
 * connection reads as a plain statement of what is recorded, and dates are
 * carried by the separate period line, not asserted here. No AI, no inference.
 */
export function describeConnection(focalLabel: string, connection: ProjectedConnection): string {
  const node = connection.node.label;

  switch (connection.family) {
    case "participation": {
      const capacity = connection.kind ? lower(connection.kind.label) : "participant";
      if (connection.direction === "incoming") {
        // Focal is the institution; the node is the person who belonged to it.
        return `${node} participated in ${focalLabel} as ${article(capacity)} ${capacity}.`;
      }
      // Focal is the person; the node is the institution they belonged to.
      return `${focalLabel} participated in ${node} as ${article(capacity)} ${capacity}.`;
    }

    case "relationship":
    case "institutional_relationship": {
      const perspective = connection.perspective;
      if (perspective === null) {
        return `${focalLabel} and ${node} are connected by a documented ${
          connection.family === "relationship" ? "relationship" : "institutional relationship"
        }.`;
      }
      if (connection.direction === "symmetric") {
        return `${focalLabel} and ${node} were ${lower(perspective.counterpartRoleLabelPlural)}.`;
      }
      // Directional: counterpartRoleLabel is the NODE's role from the focal's
      // perspective (the inverse label), so this reads correctly from either end.
      return `${node} was ${focalLabel}'s ${lower(perspective.counterpartRoleLabel)}.`;
    }

    case "contribution_attribution": {
      const capacity = connection.kind ? ` (${lower(connection.kind.label)})` : "";
      if (connection.direction === "incoming") {
        // Focal is the contribution; the node is a contributor to it.
        return `${node} contributed to ${focalLabel}${capacity}.`;
      }
      // Focal is a contributor; the node is the contribution they helped make.
      return `${focalLabel} contributed to ${node}${capacity}.`;
    }

    case "event_association": {
      if (connection.node.type === "event") {
        return `${focalLabel} is associated with the documented event “${node}”.`;
      }
      // Focal is the event; the node is a participant/associated record.
      return `${node} is associated with the documented event “${focalLabel}”.`;
    }
  }
}
