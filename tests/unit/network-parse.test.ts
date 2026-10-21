import { describe, expect, it } from "vitest";

import {
  parseInstitutionalRelationshipDocument,
  parseNetworkDocument,
} from "../../src/features/network/parse";

const focal = {
  type: "person",
  id: "p1",
  label: "Alice Aardvark",
  secondary_label: null,
  href: "/people/p1",
  verification_status: "provisional",
};

const participationConnection = {
  id: "participation:pa1",
  family: "participation",
  direction: "outgoing",
  node: {
    type: "organization",
    id: "o1",
    label: "Institute of Forest History",
    secondary_label: "IFH",
    href: "/institutions/o1",
    verification_status: "provisional",
  },
  kind: { key: "researcher", label: "Researcher" },
  perspective: null,
  temporal: {
    start_date: "1990-01-01",
    start_precision: "year",
    end_date: null,
    end_precision: null,
    is_approximate: false,
    is_ongoing: false,
    date_is_unknown: false,
    date_is_uncertain: false,
  },
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
  source: { type: "participations", id: "pa1" },
  visibility: "visible",
};

const relationshipConnection = {
  id: "relationship:r1",
  family: "relationship",
  direction: "outgoing",
  node: {
    type: "person",
    id: "p2",
    label: "Bob Booker",
    secondary_label: null,
    href: "/people/p2",
    verification_status: "verified_admin",
  },
  kind: { key: "mentorship", label: "Mentorship" },
  perspective: {
    focal_role_label: "Mentor",
    counterpart_role_label: "Student",
    counterpart_role_label_plural: "Students",
  },
  temporal: {
    start_date: "1991-01-01",
    start_precision: "year",
    end_date: null,
    end_precision: null,
    is_approximate: false,
    is_ongoing: false,
    date_is_unknown: false,
    date_is_uncertain: false,
  },
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
  source: { type: "relationships", id: "r1" },
  visibility: "visible",
};

const attributionConnection = {
  id: "person_contribution:pc1",
  family: "contribution_attribution",
  direction: "outgoing",
  node: {
    type: "contribution",
    id: "c1",
    label: "Long-term canopy-monitoring programme",
    secondary_label: "Long-term monitoring",
    href: "/contributions/c1",
    verification_status: "provisional",
  },
  kind: { key: "field_observation", label: "Field observation" },
  perspective: null,
  temporal: null,
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
  source: { type: "person_contributions", id: "pc1" },
  visibility: "visible",
};

const eventConnection = {
  id: "person_event:pe1",
  family: "event_association",
  direction: "undirected",
  node: {
    type: "event",
    id: "e1",
    label: "Canopy census",
    secondary_label: "Fieldwork",
    href: null,
    verification_status: "provisional",
  },
  kind: null,
  perspective: null,
  temporal: {
    start_date: "1990-06-01",
    start_precision: "month",
    end_date: null,
    end_precision: null,
    is_approximate: false,
    is_ongoing: false,
    date_is_unknown: false,
    date_is_uncertain: false,
  },
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
  source: { type: "person_events", id: "pe1" },
  visibility: "visible",
};

describe("parseNetworkDocument", () => {
  it("parses a valid one-hop document and maps snake_case to camelCase", () => {
    const parsed = parseNetworkDocument({
      focal,
      connections: [participationConnection, relationshipConnection, attributionConnection, eventConnection],
    });
    expect(parsed?.focal.id).toBe("p1");
    expect(parsed?.focal.href).toBe("/people/p1");
    expect(parsed?.connections.length).toBe(4);

    const participation = parsed?.connections[0];
    expect(participation?.node.secondaryLabel).toBe("IFH");
    expect(participation?.node.verificationStatus).toBe("provisional");
    expect(participation?.source.type).toBe("participations");
    expect(participation?.source.id).toBe("pa1");
    expect(participation?.id).toBe("participation:pa1");
  });

  it("preserves the discriminated node types", () => {
    const parsed = parseNetworkDocument({
      focal,
      connections: [participationConnection, relationshipConnection, attributionConnection, eventConnection],
    });
    expect(parsed?.connections.map((c) => c.node.type)).toEqual([
      "organization",
      "person",
      "contribution",
      "event",
    ]);
  });

  it("preserves the discriminated connection families and directions", () => {
    const parsed = parseNetworkDocument({
      focal,
      connections: [participationConnection, relationshipConnection, attributionConnection, eventConnection],
    });
    expect(parsed?.connections.map((c) => c.family)).toEqual([
      "participation",
      "relationship",
      "contribution_attribution",
      "event_association",
    ]);
    expect(parsed?.connections.map((c) => c.direction)).toEqual([
      "outgoing",
      "outgoing",
      "outgoing",
      "undirected",
    ]);
  });

  it("maps the relationship perspective (focal + inverse counterpart roles)", () => {
    const parsed = parseNetworkDocument({ focal, connections: [relationshipConnection] });
    const perspective = parsed?.connections[0]?.perspective;
    expect(perspective?.focalRoleLabel).toBe("Mentor");
    expect(perspective?.counterpartRoleLabel).toBe("Student");
    expect(perspective?.counterpartRoleLabelPlural).toBe("Students");
  });

  it("keeps a null temporal for an undated attribution (never invented)", () => {
    const parsed = parseNetworkDocument({ focal, connections: [attributionConnection] });
    expect(parsed?.connections[0]?.temporal).toBeNull();
  });

  it("parses a present temporal through the shared kernel shape", () => {
    const parsed = parseNetworkDocument({ focal, connections: [participationConnection] });
    expect(parsed?.connections[0]?.temporal?.startDate).toBe("1990-01-01");
    expect(parsed?.connections[0]?.temporal?.startPrecision).toBe("year");
  });

  it("accepts a null kind (event associations carry none) and a routeless (null href) node", () => {
    const parsed = parseNetworkDocument({ focal, connections: [eventConnection] });
    expect(parsed?.connections[0]?.kind).toBeNull();
    expect(parsed?.connections[0]?.node.href).toBeNull();
  });

  it("returns an empty connections array for a focal with none, not null", () => {
    expect(parseNetworkDocument({ focal, connections: [] })?.connections).toEqual([]);
  });

  it("drops a malformed connection but keeps the rest (fail-closed per connection)", () => {
    const parsed = parseNetworkDocument({
      focal,
      connections: [participationConnection, { ...relationshipConnection, node: null }, attributionConnection],
    });
    expect(parsed?.connections.length).toBe(2);
    expect(parsed?.connections.map((c) => c.family)).toEqual(["participation", "contribution_attribution"]);
  });

  it("drops a connection with unrecognizable provenance or missing source (no unverified edge)", () => {
    const badProvenance = { ...participationConnection, provenance: { source_type: "nope", verification_status: "nope" } };
    const missingSource = { ...relationshipConnection, source: null };
    const parsed = parseNetworkDocument({ focal, connections: [badProvenance, missingSource, eventConnection] });
    expect(parsed?.connections.length).toBe(1);
    expect(parsed?.connections[0]?.family).toBe("event_association");
  });

  it("returns null for non-record input or a missing focal / connections", () => {
    expect(parseNetworkDocument(null)).toBeNull();
    expect(parseNetworkDocument({ connections: [] })).toBeNull();
    expect(parseNetworkDocument({ focal })).toBeNull();
  });
});

describe("parseInstitutionalRelationshipDocument", () => {
  const rel = {
    id: "orel1",
    kind: { key: "succession", label: "Succession", is_directional: true },
    counterpart: { id: "o2", name: "Tropical Ecology Archive", short_name: "TEA" },
    perspective: {
      organization_role_label: "Predecessor",
      counterpart_role_label: "Successor",
      counterpart_role_label_plural: "Successors",
      direction: "outgoing",
    },
    note: "IFH succeeded TEA.",
    temporal: {
      start_date: "1984-01-01",
      start_precision: "year",
      end_date: null,
      end_precision: null,
      is_approximate: false,
      is_ongoing: false,
      date_is_unknown: false,
      date_is_uncertain: false,
    },
    provenance: { source_type: "imported_historical", verification_status: "provisional" },
  };

  it("parses an institutional relationship with its per-institution perspective", () => {
    const parsed = parseInstitutionalRelationshipDocument({ organization_id: "o1", relationships: [rel] });
    expect(parsed?.organizationId).toBe("o1");
    const r = parsed?.relationships[0];
    expect(r?.counterpart.name).toBe("Tropical Ecology Archive");
    expect(r?.counterpart.shortName).toBe("TEA");
    expect(r?.perspective.counterpartRoleLabel).toBe("Successor");
    expect(r?.perspective.direction).toBe("outgoing");
    expect(r?.note).toBe("IFH succeeded TEA.");
  });

  it("returns null for non-record input or a missing organization_id / relationships", () => {
    expect(parseInstitutionalRelationshipDocument(null)).toBeNull();
    expect(parseInstitutionalRelationshipDocument({ relationships: [] })).toBeNull();
    expect(parseInstitutionalRelationshipDocument({ organization_id: "o1" })).toBeNull();
  });
});
