import { describe, expect, it } from "vitest";

import { buildRelationshipView, describeRelationshipProvenance } from "../../src/features/relationships/derive";
import type { Relationship, RelationshipDirection, RelationshipDocument } from "../../src/features/relationships/types";

function rel(
  id: string,
  opts: {
    counterpartName: string;
    counterpartRolePlural: string;
    counterpartRole?: string;
    direction: RelationshipDirection;
    startDate: string | null;
  },
): Relationship {
  return {
    id,
    kind: { key: "mentorship", label: "Mentorship", isDirectional: opts.direction !== "symmetric" },
    counterpart: { id: `c-${id}`, displayName: opts.counterpartName },
    perspective: {
      personRoleLabel: "Mentor",
      counterpartRoleLabel: opts.counterpartRole ?? "Student",
      counterpartRoleLabelPlural: opts.counterpartRolePlural,
      direction: opts.direction,
    },
    narrative: null,
    temporal: {
      startDate: opts.startDate,
      startPrecision: opts.startDate ? "year" : null,
      endDate: null,
      endPrecision: null,
      isApproximate: false,
      isOngoing: false,
      dateIsUnknown: opts.startDate === null,
      dateIsUncertain: false,
    },
    provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
  };
}

function doc(relationships: Relationship[]): RelationshipDocument {
  return { personId: "p1", relationships };
}

describe("buildRelationshipView", () => {
  it("is empty for no relationships", () => {
    const view = buildRelationshipView(doc([]));
    expect(view.isEmpty).toBe(true);
    expect(view.groups).toEqual([]);
  });

  it("groups by the counterpart's role (who the other person was to this person)", () => {
    const view = buildRelationshipView(
      doc([
        rel("1", { counterpartName: "A", counterpartRolePlural: "Mentors", counterpartRole: "Mentor", direction: "incoming", startDate: "1985-01-01" }),
        rel("2", { counterpartName: "B", counterpartRolePlural: "Students", counterpartRole: "Student", direction: "outgoing", startDate: "1990-01-01" }),
        rel("3", { counterpartName: "C", counterpartRolePlural: "Mentors", counterpartRole: "Mentor", direction: "incoming", startDate: "1995-01-01" }),
      ]),
    );
    expect(view.groups.map((group) => group.heading)).toEqual(["Mentors", "Students"]);
    expect(view.groups[0]?.relationships.map((r) => r.counterpart.displayName)).toEqual(["A", "C"]);
    expect(view.groups[1]?.relationships.map((r) => r.counterpart.displayName)).toEqual(["B"]);
    expect(view.relationshipCount).toBe(3);
  });

  it("orders role groups by earliest involvement, not by prestige (no ranking)", () => {
    // Students group is encountered first (1980) though it would sort after Mentors alphabetically.
    const view = buildRelationshipView(
      doc([
        rel("1", { counterpartName: "B", counterpartRolePlural: "Students", direction: "outgoing", startDate: "1980-01-01" }),
        rel("2", { counterpartName: "A", counterpartRolePlural: "Mentors", counterpartRole: "Mentor", direction: "incoming", startDate: "1990-01-01" }),
      ]),
    );
    expect(view.groups.map((group) => group.heading)).toEqual(["Students", "Mentors"]);
  });

  it("preserves symmetric vs directional direction and keeps an undated relationship (never dropped)", () => {
    const view = buildRelationshipView(
      doc([
        rel("1", { counterpartName: "X", counterpartRolePlural: "Collaborators", counterpartRole: "Collaborator", direction: "symmetric", startDate: "1988-01-01" }),
        rel("2", { counterpartName: "Y", counterpartRolePlural: "Collaborators", counterpartRole: "Collaborator", direction: "symmetric", startDate: null }),
      ]),
    );
    expect(view.groups.length).toBe(1);
    expect(view.groups[0]?.heading).toBe("Collaborators");
    expect(view.groups[0]?.relationships[0]?.perspective.direction).toBe("symmetric");
    expect(view.relationshipCount).toBe(2);
  });
});

describe("describeRelationshipProvenance", () => {
  it("labels source and verification identically to the platform kernel", () => {
    expect(describeRelationshipProvenance("imported_historical", "provisional")).toEqual({
      sourceLabel: "Imported from historical records",
      statusLabel: "Awaiting review",
    });
    expect(describeRelationshipProvenance("nominated_by_other", "disputed").statusLabel).toBe("Disputed");
  });
});
