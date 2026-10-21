import { describe, expect, it } from "vitest";

import { parseParticipationDocument } from "../../src/features/participation/parse";

const validParticipation = {
  id: "pa1",
  organization: { id: "org-a", name: "Alpha Station", short_name: "ALFA" },
  capacity: { key: "researcher", label: "Researcher" },
  summary: null,
  temporal: {
    start_date: "1987-01-01",
    start_precision: "year",
    end_date: "1991-01-01",
    end_precision: "year",
    is_approximate: false,
    is_ongoing: false,
    date_is_unknown: false,
    date_is_uncertain: false,
  },
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
};

describe("parseParticipationDocument", () => {
  it("parses a valid document and maps snake_case to camelCase", () => {
    const parsed = parseParticipationDocument({ person_id: "p1", participations: [validParticipation] });
    expect(parsed?.personId).toBe("p1");
    expect(parsed?.participations.length).toBe(1);
    expect(parsed?.participations[0]?.organization.name).toBe("Alpha Station");
    expect(parsed?.participations[0]?.organization.shortName).toBe("ALFA");
    expect(parsed?.participations[0]?.capacity.label).toBe("Researcher");
    expect(parsed?.participations[0]?.temporal.endPrecision).toBe("year");
    expect(parsed?.participations[0]?.provenance.sourceType).toBe("imported_historical");
  });

  it("accepts a null organization short_name", () => {
    const p = { ...validParticipation, organization: { id: "org-b", name: "Beta Institute", short_name: null } };
    const parsed = parseParticipationDocument({ person_id: "p1", participations: [p] });
    expect(parsed?.participations[0]?.organization.shortName).toBeNull();
  });

  it("returns an empty participations array for a person with none", () => {
    expect(parseParticipationDocument({ person_id: "p1", participations: [] })?.participations).toEqual([]);
  });

  it("returns null for non-record input or a missing person_id / participations", () => {
    expect(parseParticipationDocument(null)).toBeNull();
    expect(parseParticipationDocument({ participations: [] })).toBeNull();
    expect(parseParticipationDocument({ person_id: "p1" })).toBeNull();
  });

  it("drops a malformed participation but keeps the rest (fail-closed per participation)", () => {
    const parsed = parseParticipationDocument({
      person_id: "p1",
      participations: [validParticipation, { id: "bad" }, { ...validParticipation, id: "pa2" }],
    });
    expect(parsed?.participations.length).toBe(2);
    expect(parsed?.participations.map((p) => p.id)).toEqual(["pa1", "pa2"]);
  });

  it("drops a participation missing its organization or capacity", () => {
    const noOrg = { ...validParticipation, id: "x", organization: { id: "o", name: "   " } };
    const noCap = { ...validParticipation, id: "y", capacity: { key: "researcher" } };
    expect(parseParticipationDocument({ person_id: "p1", participations: [noOrg, noCap] })?.participations.length).toBe(0);
  });

  it("drops a participation with an invalid provenance vocabulary value", () => {
    const bad = { ...validParticipation, id: "z", provenance: { source_type: "made_up", verification_status: "provisional" } };
    expect(parseParticipationDocument({ person_id: "p1", participations: [bad] })?.participations.length).toBe(0);
  });
});
