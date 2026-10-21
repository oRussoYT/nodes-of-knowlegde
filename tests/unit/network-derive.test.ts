import { describe, expect, it } from "vitest";

import { buildNetworkView, NETWORK_SECTION_ORDER } from "../../src/features/network/derive";
import type {
  ConnectionFamily,
  NetworkDocument,
  NetworkNodeType,
  ProjectedConnection,
  ProjectedNode,
} from "../../src/features/network/types";

const focal: ProjectedNode = {
  type: "person",
  id: "p1",
  label: "Alice Aardvark",
  secondaryLabel: null,
  href: "/people/p1",
  verificationStatus: "provisional",
};

function conn(id: string, family: ConnectionFamily, nodeType: NetworkNodeType): ProjectedConnection {
  return {
    id,
    family,
    direction: "outgoing",
    node: {
      type: nodeType,
      id: `node-${id}`,
      label: `Node ${id}`,
      secondaryLabel: null,
      href: nodeType === "event" ? null : `/x/${id}`,
      verificationStatus: "provisional",
    },
    kind: null,
    perspective: null,
    temporal: null,
    provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
    source: { type: "participations", id },
    visibility: "visible",
  };
}

function doc(connections: ProjectedConnection[]): NetworkDocument {
  return { focal, connections };
}

describe("buildNetworkView", () => {
  it("reports a dignified empty state for a focal with no connections", () => {
    const view = buildNetworkView(doc([]));
    expect(view.isEmpty).toBe(true);
    expect(view.sections).toEqual([]);
    expect(view.connectionCount).toBe(0);
  });

  it("groups connections by historical meaning, in the fixed reading order", () => {
    const view = buildNetworkView(
      doc([
        conn("a", "relationship", "person"),
        conn("b", "participation", "organization"),
        conn("c", "institutional_relationship", "organization"),
        conn("d", "contribution_attribution", "contribution"),
        conn("e", "event_association", "event"),
      ]),
    );
    expect(view.isEmpty).toBe(false);
    expect(view.connectionCount).toBe(5);
    expect(view.sections.map((s) => s.key)).toEqual([
      "institutional_lineage",
      "people",
      "institutions",
      "contributions",
      "events",
    ]);
  });

  it("routes institutional relationships to the lineage section, not the institutions section", () => {
    const view = buildNetworkView(
      doc([conn("b", "participation", "organization"), conn("c", "institutional_relationship", "organization")]),
    );
    const lineage = view.sections.find((s) => s.key === "institutional_lineage");
    const institutions = view.sections.find((s) => s.key === "institutions");
    expect(lineage?.connections.map((c) => c.id)).toEqual(["c"]);
    expect(institutions?.connections.map((c) => c.id)).toEqual(["b"]);
  });

  it("only renders non-empty sections", () => {
    const view = buildNetworkView(doc([conn("a", "relationship", "person")]));
    expect(view.sections.map((s) => s.key)).toEqual(["people"]);
  });

  it("preserves the read model's order within a section (never re-ranks)", () => {
    const view = buildNetworkView(
      doc([
        conn("first", "relationship", "person"),
        conn("second", "relationship", "person"),
        conn("third", "relationship", "person"),
      ]),
    );
    const people = view.sections.find((s) => s.key === "people");
    expect(people?.connections.map((c) => c.id)).toEqual(["first", "second", "third"]);
  });

  it("declares every section key in a fixed order", () => {
    expect(NETWORK_SECTION_ORDER).toEqual([
      "institutional_lineage",
      "people",
      "institutions",
      "contributions",
      "events",
    ]);
  });
});
