import { describe, expect, it } from "vitest";

import {
  parseContribution,
  parseOrganizationContributionsDocument,
  parsePersonContributionsDocument,
} from "../../src/features/contribution/parse";

const prov = { source_type: "imported_historical", verification_status: "provisional" };

const fullTemporal = {
  start_date: "1980-01-01",
  start_precision: "year",
  end_date: null,
  end_precision: null,
  is_approximate: false,
  is_ongoing: true,
  date_is_unknown: false,
  date_is_uncertain: false,
};

const validContribution = {
  id: "c1",
  title: "Establishment of long-term monitoring",
  kind: { key: "long_term_monitoring", label: "Long-term monitoring" },
  description: "A decades-long monitoring programme.",
  temporal: fullTemporal,
  place: "Amazonas, Brazil",
  provenance: prov,
  narrative: [{ kind: "overview", body: "A programme that monitored dynamics over decades.", provenance: prov }],
  contributors: {
    people: [
      { id: "pc1", person: { id: "per1", display_name: "Percy Person" }, capacity: { key: "field_observation", label: "Field observation" }, attribution_note: "Led the field observations.", provenance: prov },
    ],
    organizations: [
      { id: "oc1", organization: { id: "org1", name: "Alpha Institute", short_name: "AI" }, capacity: { key: "funding", label: "Funding" }, attribution_note: null, provenance: prov },
    ],
  },
};

describe("parseContribution", () => {
  it("parses a valid contribution and maps snake_case to camelCase", () => {
    const c = parseContribution(validContribution);
    expect(c?.title).toBe("Establishment of long-term monitoring");
    expect(c?.kind?.key).toBe("long_term_monitoring");
    expect(c?.temporal.isOngoing).toBe(true);
    expect(c?.place).toBe("Amazonas, Brazil");
    expect(c?.narrative[0]?.kind).toBe("overview");
    expect(c?.contributors.people[0]?.person.displayName).toBe("Percy Person");
    expect(c?.contributors.people[0]?.capacity.key).toBe("field_observation");
    // Each attribution carries its own provenance (distinct from the record's).
    expect(c?.contributors.people[0]?.provenance.sourceType).toBe("imported_historical");
    expect(c?.contributors.organizations[0]?.organization.name).toBe("Alpha Institute");
    expect(c?.contributors.organizations[0]?.capacity.key).toBe("funding");
  });

  it("tolerates an unresolved kind as an honest null, not a failure", () => {
    const c = parseContribution({ ...validContribution, kind: null });
    expect(c?.kind).toBeNull();
    expect(c?.title).toBe("Establishment of long-term monitoring");
  });

  it("returns null for a non-record, a blank title, or missing provenance", () => {
    expect(parseContribution(null)).toBeNull();
    expect(parseContribution({ ...validContribution, title: "   " })).toBeNull();
    expect(parseContribution({ ...validContribution, provenance: { source_type: "made_up", verification_status: "provisional" } })).toBeNull();
  });

  it("drops malformed narrative facets and contributor attributions but keeps the rest", () => {
    const c = parseContribution({
      ...validContribution,
      narrative: [validContribution.narrative[0], { kind: "bogus", body: "x", provenance: prov }, { kind: "context", body: "   ", provenance: prov }],
      contributors: {
        people: [validContribution.contributors.people[0], { id: "bad", person: { id: "p", display_name: "   " }, capacity: { key: "x", label: "X" }, provenance: prov }],
        organizations: [{ id: "bad", organization: { id: "o", name: "   " }, capacity: { key: "funding", label: "Funding" }, provenance: prov }],
      },
    });
    expect(c?.narrative.length).toBe(1);
    expect(c?.contributors.people.length).toBe(1);
    expect(c?.contributors.organizations.length).toBe(0);
  });

  it("represents a collective contribution with no fabricated person", () => {
    const c = parseContribution({
      ...validContribution,
      contributors: { people: [], organizations: [validContribution.contributors.organizations[0]] },
    });
    expect(c?.contributors.people).toEqual([]);
    expect(c?.contributors.organizations.length).toBe(1);
  });
});

describe("parsePersonContributionsDocument / parseOrganizationContributionsDocument", () => {
  const entry = {
    attribution_id: "pc1",
    capacity: { key: "field_observation", label: "Field observation" },
    attribution_note: "Led the field observations.",
    attribution_provenance: prov,
    contribution: { id: "c1", title: "Establishment of long-term monitoring", kind: { key: "long_term_monitoring", label: "Long-term monitoring" }, temporal: fullTemporal, provenance: prov },
  };

  it("parses the person projection (capacity + attribution provenance + contribution identity)", () => {
    const doc = parsePersonContributionsDocument({ person_id: "per1", contributions: [entry] });
    expect(doc?.personId).toBe("per1");
    expect(doc?.contributions[0]?.capacity.key).toBe("field_observation");
    expect(doc?.contributions[0]?.attributionProvenance.verificationStatus).toBe("provisional");
    expect(doc?.contributions[0]?.contribution.id).toBe("c1");
  });

  it("returns an empty array for none, null for a bad shape, and drops malformed entries", () => {
    expect(parsePersonContributionsDocument({ person_id: "p", contributions: [] })?.contributions).toEqual([]);
    expect(parsePersonContributionsDocument({ contributions: [] })).toBeNull();
    expect(parsePersonContributionsDocument({ person_id: "p", contributions: [{ attribution_id: "x" }] })?.contributions.length).toBe(0);
  });

  it("parses the institution projection symmetrically", () => {
    const doc = parseOrganizationContributionsDocument({ organization_id: "org1", contributions: [entry] });
    expect(doc?.organizationId).toBe("org1");
    expect(doc?.contributions[0]?.contribution.title).toBe("Establishment of long-term monitoring");
  });
});
