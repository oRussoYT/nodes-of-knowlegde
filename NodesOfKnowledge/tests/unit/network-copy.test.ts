import { describe, expect, it } from "vitest";

import {
  connectionCountLabel,
  describeConnection,
  networkCopy,
  sourceRecordLabel,
} from "../../src/features/network/copy";
import type {
  ConnectionDirection,
  ConnectionFamily,
  ConnectionKindRef,
  ConnectionPerspective,
  NetworkNodeType,
  ProjectedConnection,
} from "../../src/features/network/types";

interface BuildArgs {
  family: ConnectionFamily;
  direction: ConnectionDirection;
  nodeType: NetworkNodeType;
  nodeLabel: string;
  kind?: ConnectionKindRef | null;
  perspective?: ConnectionPerspective | null;
}

function build({ family, direction, nodeType, nodeLabel, kind = null, perspective = null }: BuildArgs): ProjectedConnection {
  return {
    id: "x:1",
    family,
    direction,
    node: {
      type: nodeType,
      id: "n1",
      label: nodeLabel,
      secondaryLabel: null,
      href: nodeType === "event" ? null : "/x/n1",
      verificationStatus: "provisional",
    },
    kind,
    perspective,
    temporal: null,
    provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
    source: { type: "participations", id: "1" },
    visibility: "visible",
  };
}

describe("describeConnection", () => {
  it("describes an outgoing participation from the person's perspective", () => {
    const sentence = describeConnection(
      "Helena Arvoredo",
      build({
        family: "participation",
        direction: "outgoing",
        nodeType: "organization",
        nodeLabel: "Institute of Forest History",
        kind: { key: "researcher", label: "Field ecologist" },
      }),
    );
    expect(sentence).toBe("Helena Arvoredo participated in Institute of Forest History as a field ecologist.");
  });

  it("describes an incoming participation from the institution's perspective", () => {
    const sentence = describeConnection(
      "Institute of Forest History",
      build({
        family: "participation",
        direction: "incoming",
        nodeType: "person",
        nodeLabel: "Helena Arvoredo",
        kind: { key: "intern", label: "Intern" },
      }),
    );
    // article "an" before a vowel-initial capacity, honestly
    expect(sentence).toBe("Helena Arvoredo participated in Institute of Forest History as an intern.");
  });

  it("describes a directional relationship with the counterpart's inverse role", () => {
    const sentence = describeConnection(
      "Alice Aardvark",
      build({
        family: "relationship",
        direction: "outgoing",
        nodeType: "person",
        nodeLabel: "Bob Booker",
        perspective: { focalRoleLabel: "Mentor", counterpartRoleLabel: "Student", counterpartRoleLabelPlural: "Students" },
      }),
    );
    expect(sentence).toBe("Bob Booker was Alice Aardvark's student.");
  });

  it("describes a symmetric relationship without asserting a direction", () => {
    const sentence = describeConnection(
      "Alice Aardvark",
      build({
        family: "relationship",
        direction: "symmetric",
        nodeType: "person",
        nodeLabel: "Carol Carver",
        perspective: {
          focalRoleLabel: "Collaborator",
          counterpartRoleLabel: "Collaborator",
          counterpartRoleLabelPlural: "Collaborators",
        },
      }),
    );
    expect(sentence).toBe("Alice Aardvark and Carol Carver were collaborators.");
  });

  it("describes an institutional succession with the inverse role, never overstated", () => {
    const sentence = describeConnection(
      "Institute of Forest History",
      build({
        family: "institutional_relationship",
        direction: "outgoing",
        nodeType: "organization",
        nodeLabel: "Tropical Ecology Archive",
        perspective: {
          focalRoleLabel: "Predecessor",
          counterpartRoleLabel: "Successor",
          counterpartRoleLabelPlural: "Successors",
        },
      }),
    );
    expect(sentence).toBe("Tropical Ecology Archive was Institute of Forest History's successor.");
  });

  it("describes a contribution attribution with its capacity", () => {
    const sentence = describeConnection(
      "Rafael Campos",
      build({
        family: "contribution_attribution",
        direction: "outgoing",
        nodeType: "contribution",
        nodeLabel: "the long-term canopy-monitoring programme",
        kind: { key: "field_infrastructure", label: "Field infrastructure" },
      }),
    );
    expect(sentence).toBe("Rafael Campos contributed to the long-term canopy-monitoring programme (field infrastructure).");
  });

  it("describes an event association honestly, from either end", () => {
    const fromRecord = describeConnection(
      "Helena Arvoredo",
      build({ family: "event_association", direction: "undirected", nodeType: "event", nodeLabel: "Canopy census" }),
    );
    expect(fromRecord).toBe("Helena Arvoredo is associated with the documented event “Canopy census”.");
  });
});

describe("connectionCountLabel", () => {
  it("is honest and singular/plural correct, never ranked", () => {
    expect(connectionCountLabel(0)).toBe("No documented connections");
    expect(connectionCountLabel(1)).toBe("1 documented connection");
    expect(connectionCountLabel(2)).toBe("2 documented connections");
  });
});

describe("sourceRecordLabel", () => {
  it("names the canonical record an edge is projected from", () => {
    expect(sourceRecordLabel("participations")).toBe("participation record");
    expect(sourceRecordLabel("relationships")).toBe("relationship record");
    expect(sourceRecordLabel("organization_relationships")).toBe("institutional relationship record");
    expect(sourceRecordLabel("person_contributions")).toBe("contribution attribution record");
    expect(sourceRecordLabel("organization_contributions")).toBe("contribution attribution record");
    expect(sourceRecordLabel("contribution_events")).toBe("event association record");
    expect(sourceRecordLabel("unknown_table")).toBe("documented record");
  });
});

describe("networkCopy", () => {
  it("states plainly that the view is documented connections, not the totality of history", () => {
    const limits = networkCopy.limits.toLowerCase();
    expect(limits).toContain("not a complete picture");
    expect(limits).toContain("absence");
  });

  it("contains no metric, ranking, recommendation, or social/engagement language", () => {
    const text = JSON.stringify(networkCopy).toLowerCase();
    for (const term of [
      "recommend",
      "suggest",
      "popular",
      "ranking",
      "leaderboard",
      "centrality",
      "prestige",
      "influence",
      "most connected",
      "top collaborator",
      "people you may know",
      "grow your",
      "endorse",
      "trending",
    ]) {
      expect(text).not.toContain(term);
    }
  });

  it("contains no PDBFF/institution-specific language (Node Independence)", () => {
    const text = JSON.stringify(networkCopy).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "manaus", "mateiro"]) {
      expect(text).not.toContain(term);
    }
  });
});
