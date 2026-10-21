import { describe, expect, it } from "vitest";

import { parsePublicPeople, parsePublicPersonPage } from "../../src/features/public-person/parse";

const participation = {
  person_id: "p1",
  participations: [
    {
      id: "x1",
      organization: { id: "o1", name: "Public Field Station", short_name: "PFS" },
      capacity: { key: "researcher", label: "Researcher" },
      summary: null,
      temporal: {
        start_date: "1985-01-01", start_precision: "year", end_date: "1990-01-01", end_precision: "year",
        is_approximate: false, is_ongoing: false, date_is_unknown: false, date_is_uncertain: false,
      },
      provenance: { source_type: "imported_historical", verification_status: "provisional" },
    },
  ],
};

describe("parsePublicPersonPage", () => {
  it("parses the narrow public projection and reuses the participation shape", () => {
    const page = parsePublicPersonPage({
      person: { id: "p1", displayName: "Historic Figure", isDeceased: true, isDemo: false, isClaimed: false, publishedAt: "2026-10-17T00:00:00Z" },
      participation,
    });
    expect(page?.person.displayName).toBe("Historic Figure");
    expect(page?.person.isDeceased).toBe(true);
    expect(page?.participation.participations[0].organization.name).toBe("Public Field Station");
  });

  it("fails closed when the page is not public (null) or malformed", () => {
    expect(parsePublicPersonPage(null)).toBeNull();
    expect(parsePublicPersonPage({ person: { id: "p1" }, participation })).toBeNull();
  });

  it("refuses a participation document that belongs to another person", () => {
    expect(
      parsePublicPersonPage({ person: { id: "p2", displayName: "Someone Else" }, participation }),
    ).toBeNull();
  });
});

describe("parsePublicPeople", () => {
  it("parses the directory and drops malformed rows", () => {
    expect(
      parsePublicPeople([{ id: "p1", display_name: "Historic Figure", is_demo: true }, { id: 3 }]),
    ).toEqual([{ id: "p1", displayName: "Historic Figure", isDemo: true }]);
  });
});
