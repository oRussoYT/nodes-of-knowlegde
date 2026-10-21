import { describe, expect, it } from "vitest";

import { buildInstitutionParticipationView, describeInstitutionProvenance, institutionPeriod, narrativeFacet } from "../../src/features/institution/derive";
import type { InstitutionParticipationDocument, InstitutionParticipationEntry, Organization } from "../../src/features/institution/types";

function org(over: Partial<Organization> = {}): Organization {
  return {
    id: "o1",
    name: "Alpha",
    shortName: null,
    type: null,
    status: "active",
    founding: null,
    closure: null,
    location: null,
    website: null,
    provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
    names: [],
    externalIdentifiers: [],
    narrative: [],
    ...over,
  };
}

describe("institutionPeriod", () => {
  it("an active institution with a founding reads as ongoing", () => {
    expect(institutionPeriod(org({ status: "active", founding: { date: "1979-01-01", precision: "year", isApproximate: false } }))).toBe("1979 – present");
  });
  it("a founding with a closure reads as a lifespan", () => {
    expect(institutionPeriod(org({ status: "closed", founding: { date: "1979-01-01", precision: "year", isApproximate: false }, closure: { date: "1995-01-01", precision: "year" } }))).toBe("1979 – 1995");
  });
  it("an approximate founding keeps the circa marker", () => {
    expect(institutionPeriod(org({ status: "active", founding: { date: "1979-01-01", precision: "year", isApproximate: true } }))).toBe("c. 1979 – present");
  });
  it("a known founding on a non-active institution with no closure reads as Founded", () => {
    expect(institutionPeriod(org({ status: "historical", founding: { date: "1979-01-01", precision: "year", isApproximate: false } }))).toBe("Founded 1979");
  });
  it("a known closure with an unknown founding is still shown honestly", () => {
    expect(institutionPeriod(org({ status: "historical", founding: null, closure: { date: "1995-01-01", precision: "year" } }))).toBe("Closed 1995");
  });
  it("an entirely unknown period is null (absence, not fabrication)", () => {
    expect(institutionPeriod(org({ status: "status_unknown" }))).toBeNull();
  });
});

describe("narrativeFacet", () => {
  it("finds a facet by kind, or undefined when absent", () => {
    const o = org({ narrative: [{ kind: "legacy", body: "Its legacy.", provenance: { sourceType: "admin_entered", verificationStatus: "verified_admin" } }] });
    expect(narrativeFacet(o, "legacy")?.body).toBe("Its legacy.");
    expect(narrativeFacet(o, "introduction")).toBeUndefined();
  });
});

describe("buildInstitutionParticipationView", () => {
  function entry(id: string, capacityLabel: string, startDate: string | null): InstitutionParticipationEntry {
    return {
      id,
      capacity: { key: capacityLabel.toLowerCase(), label: capacityLabel },
      person: { id: `per-${id}`, displayName: `Person ${id}` },
      summary: null,
      temporal: { startDate, startPrecision: startDate ? "year" : null, endDate: null, endPrecision: null, isApproximate: false, isOngoing: false, dateIsUnknown: startDate === null, dateIsUncertain: false },
      provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
    };
  }
  function doc(entries: InstitutionParticipationEntry[]): InstitutionParticipationDocument {
    return { organizationId: "o1", participations: entries };
  }

  it("is empty for none", () => {
    expect(buildInstitutionParticipationView(doc([])).isEmpty).toBe(true);
  });

  it("groups people by capacity, ordered by earliest involvement (not prestige)", () => {
    const view = buildInstitutionParticipationView(
      doc([entry("1", "Technician", "1980-01-01"), entry("2", "Director", "1985-01-01"), entry("3", "Technician", "1990-01-01")]),
    );
    // Technician first (earliest 1980), though "Director" might rank higher by prestige.
    expect(view.groups.map((g) => g.heading)).toEqual(["Technician", "Director"]);
    expect(view.groups[0]?.entries.map((e) => e.id)).toEqual(["1", "3"]);
    expect(view.count).toBe(3);
  });
});

describe("describeInstitutionProvenance", () => {
  it("labels source and verification identically to the platform kernel", () => {
    expect(describeInstitutionProvenance("imported_historical", "provisional")).toEqual({
      sourceLabel: "Imported from historical records",
      statusLabel: "Awaiting review",
    });
  });
});
