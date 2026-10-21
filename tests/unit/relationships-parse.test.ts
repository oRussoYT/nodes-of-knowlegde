import { describe, expect, it } from "vitest";

import { parseRelationshipDocument } from "../../src/features/relationships/parse";

const validRelationship = {
  id: "r1",
  kind: { key: "mentorship", label: "Mentorship", is_directional: true },
  counterpart: { id: "c1", display_name: "Alice Aardvark" },
  perspective: {
    person_role_label: "Student",
    counterpart_role_label: "Mentor",
    counterpart_role_label_plural: "Mentors",
    direction: "incoming",
  },
  narrative: "Alice mentored them in the field.",
  temporal: {
    start_date: "1987-01-01",
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

describe("parseRelationshipDocument", () => {
  it("parses a valid document and maps snake_case to camelCase", () => {
    const parsed = parseRelationshipDocument({ person_id: "p1", relationships: [validRelationship] });
    expect(parsed?.personId).toBe("p1");
    expect(parsed?.relationships.length).toBe(1);
    const r = parsed?.relationships[0];
    expect(r?.kind.isDirectional).toBe(true);
    expect(r?.counterpart.displayName).toBe("Alice Aardvark");
    expect(r?.perspective.counterpartRoleLabel).toBe("Mentor");
    expect(r?.perspective.counterpartRoleLabelPlural).toBe("Mentors");
    expect(r?.perspective.direction).toBe("incoming");
    expect(r?.narrative).toBe("Alice mentored them in the field.");
    expect(r?.provenance.sourceType).toBe("imported_historical");
  });

  it("accepts a null narrative (an honest missing state)", () => {
    const parsed = parseRelationshipDocument({ person_id: "p1", relationships: [{ ...validRelationship, narrative: null }] });
    expect(parsed?.relationships[0]?.narrative).toBeNull();
  });

  it("returns an empty relationships array for a person with none", () => {
    expect(parseRelationshipDocument({ person_id: "p1", relationships: [] })?.relationships).toEqual([]);
  });

  it("returns null for non-record input or a missing person_id / relationships", () => {
    expect(parseRelationshipDocument(null)).toBeNull();
    expect(parseRelationshipDocument({ relationships: [] })).toBeNull();
    expect(parseRelationshipDocument({ person_id: "p1" })).toBeNull();
  });

  it("drops a malformed relationship but keeps the rest (fail-closed per relationship)", () => {
    const parsed = parseRelationshipDocument({
      person_id: "p1",
      relationships: [validRelationship, { id: "bad" }, { ...validRelationship, id: "r2" }],
    });
    expect(parsed?.relationships.length).toBe(2);
    expect(parsed?.relationships.map((r) => r.id)).toEqual(["r1", "r2"]);
  });

  it("drops a relationship with an invalid direction, provenance, counterpart, or perspective", () => {
    const badDirection = { ...validRelationship, id: "a", perspective: { ...validRelationship.perspective, direction: "sideways" } };
    const badProvenance = { ...validRelationship, id: "b", provenance: { source_type: "made_up", verification_status: "provisional" } };
    const noCounterpart = { ...validRelationship, id: "c", counterpart: { id: "c", display_name: "   " } };
    const noPerspective = { ...validRelationship, id: "d", perspective: { direction: "incoming" } };
    expect(
      parseRelationshipDocument({ person_id: "p1", relationships: [badDirection, badProvenance, noCounterpart, noPerspective] })?.relationships.length,
    ).toBe(0);
  });
});
