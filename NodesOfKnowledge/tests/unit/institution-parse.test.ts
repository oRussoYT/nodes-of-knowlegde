import { describe, expect, it } from "vitest";

import { parseInstitutionParticipationDocument, parseOrganization } from "../../src/features/institution/parse";

const validOrg = {
  id: "org1",
  name: "Alpha Field Station",
  short_name: "AFS",
  type: { key: "field_station", label: "Field station" },
  status: "active",
  founding: { date: "1979-01-01", precision: "year", is_approximate: true },
  closure: null,
  location: "Amazonas, Brazil",
  website: "https://example.test",
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
  names: [
    {
      id: "n1",
      name: "Alpha Research Camp",
      name_type: "former",
      language: null,
      temporal: { start_date: "1979-01-01", start_precision: "year", end_date: "1990-01-01", end_precision: "year" },
      provenance: { source_type: "imported_historical", verification_status: "provisional" },
    },
  ],
  external_identifiers: [
    { id: "x1", scheme: "ror", identifier_value: "https://ror.org/01abc23de", url: null, provenance: { source_type: "imported_historical", verification_status: "provisional" } },
  ],
  narrative: [
    { kind: "introduction", body: "Founded to study forest fragmentation.", provenance: { source_type: "imported_historical", verification_status: "provisional" } },
  ],
};

describe("parseOrganization", () => {
  it("parses a valid institution and maps snake_case to camelCase", () => {
    const org = parseOrganization(validOrg);
    expect(org?.name).toBe("Alpha Field Station");
    expect(org?.type?.label).toBe("Field station");
    expect(org?.status).toBe("active");
    expect(org?.founding?.date).toBe("1979-01-01");
    expect(org?.founding?.isApproximate).toBe(true);
    expect(org?.names[0]?.nameType).toBe("former");
    expect(org?.names[0]?.temporal.endDate).toBe("1990-01-01");
    expect(org?.externalIdentifiers[0]?.scheme).toBe("ror");
    expect(org?.narrative[0]?.kind).toBe("introduction");
  });

  it("keeps a historical/closed institution readable (status + closure parsed)", () => {
    const org = parseOrganization({ ...validOrg, status: "historical", founding: null, closure: { date: "1995-01-01", precision: "year" } });
    expect(org?.status).toBe("historical");
    expect(org?.closure?.date).toBe("1995-01-01");
    expect(org?.founding).toBeNull();
  });

  it("returns null for a missing name, invalid status, or missing provenance", () => {
    expect(parseOrganization(null)).toBeNull();
    expect(parseOrganization({ ...validOrg, name: "   " })).toBeNull();
    expect(parseOrganization({ ...validOrg, status: "bogus" })).toBeNull();
    expect(parseOrganization({ ...validOrg, provenance: { source_type: "made_up", verification_status: "provisional" } })).toBeNull();
  });

  it("drops malformed names, identifiers, and narrative facets but keeps the rest", () => {
    const org = parseOrganization({
      ...validOrg,
      names: [validOrg.names[0], { id: "bad", name: "   ", name_type: "former" }, { id: "n2", name: "X", name_type: "bogus", provenance: validOrg.names[0].provenance }],
      external_identifiers: [{ id: "x2", scheme: "made_up", identifier_value: "y", provenance: validOrg.names[0].provenance }],
      narrative: [{ kind: "bogus", body: "x", provenance: validOrg.names[0].provenance }],
    });
    expect(org?.names.length).toBe(1);
    expect(org?.externalIdentifiers.length).toBe(0);
    expect(org?.narrative.length).toBe(0);
  });

  it("treats an unknown type as an honest null, not a failure", () => {
    const org = parseOrganization({ ...validOrg, type: null });
    expect(org?.type).toBeNull();
    expect(org?.name).toBe("Alpha Field Station");
  });
});

describe("parseInstitutionParticipationDocument", () => {
  const validEntry = {
    id: "p1",
    capacity: { key: "researcher", label: "Researcher" },
    person: { id: "per1", display_name: "Percy Person" },
    summary: null,
    temporal: { start_date: "1980-01-01", start_precision: "year", end_date: null, end_precision: null, is_approximate: false, is_ongoing: false, date_is_unknown: false, date_is_uncertain: false },
    provenance: { source_type: "imported_historical", verification_status: "provisional" },
  };

  it("parses participation projected from the institution (person as counterpart)", () => {
    const doc = parseInstitutionParticipationDocument({ organization_id: "org1", participations: [validEntry] });
    expect(doc?.organizationId).toBe("org1");
    expect(doc?.participations[0]?.person.displayName).toBe("Percy Person");
    expect(doc?.participations[0]?.capacity.label).toBe("Researcher");
  });

  it("returns an empty array for none, and null for a bad shape; drops malformed entries", () => {
    expect(parseInstitutionParticipationDocument({ organization_id: "o", participations: [] })?.participations).toEqual([]);
    expect(parseInstitutionParticipationDocument({ participations: [] })).toBeNull();
    expect(parseInstitutionParticipationDocument({ organization_id: "o", participations: [{ id: "bad" }] })?.participations.length).toBe(0);
  });
});
