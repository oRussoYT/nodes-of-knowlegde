import { describe, expect, it } from "vitest";

import {
  buildContributionProjectionView,
  buildOrganizationContributorGroups,
  buildPersonContributorGroups,
  contributionScope,
  describeContributionProvenance,
  narrativeFacet,
} from "../../src/features/contribution/derive";
import type {
  Contribution,
  ContributionAttributionEntry,
  OrganizationContributor,
  PersonContributor,
} from "../../src/features/contribution/types";

const prov = { sourceType: "imported_historical", verificationStatus: "provisional" } as const;

function temporal(over: Partial<Contribution["temporal"]> = {}): Contribution["temporal"] {
  return {
    startDate: "1980-01-01",
    startPrecision: "year",
    endDate: null,
    endPrecision: null,
    isApproximate: false,
    isOngoing: true,
    dateIsUnknown: false,
    dateIsUncertain: false,
    ...over,
  };
}

describe("contributionScope", () => {
  it("derives the scope through the shared Many-Clocks kernel", () => {
    expect(contributionScope(temporal()).label).toBe("1980 – present");
    expect(contributionScope(temporal({ isOngoing: false, isApproximate: true })).label).toBe("c. 1980");
    const unknown = contributionScope(temporal({ startDate: null, startPrecision: null, isOngoing: false, dateIsUnknown: true }));
    expect(unknown.isUnknown).toBe(true);
    expect(unknown.label).toBe("Date unknown");
  });
});

describe("describeContributionProvenance", () => {
  it("re-exports the shared provenance kernel labels", () => {
    const d = describeContributionProvenance("imported_historical", "provisional");
    expect(d.sourceLabel).toBe("Imported from historical records");
    expect(d.statusLabel).toBe("Awaiting review");
  });
});

describe("narrativeFacet", () => {
  it("finds a facet by kind, or returns undefined when absent", () => {
    const contribution = {
      narrative: [{ kind: "overview", body: "x", provenance: prov }],
    } as unknown as Contribution;
    expect(narrativeFacet(contribution, "overview")?.body).toBe("x");
    expect(narrativeFacet(contribution, "legacy")).toBeUndefined();
  });
});

describe("contributor grouping (equal dignity, by capacity)", () => {
  it("groups people by capacity in first-encounter order, never by prestige", () => {
    const people: PersonContributor[] = [
      { id: "1", person: { id: "a", displayName: "A" }, capacity: { key: "field_observation", label: "Field observation" }, attributionNote: null, provenance: prov },
      { id: "2", person: { id: "b", displayName: "B" }, capacity: { key: "coordination", label: "Coordination" }, attributionNote: null, provenance: prov },
      { id: "3", person: { id: "c", displayName: "C" }, capacity: { key: "field_observation", label: "Field observation" }, attributionNote: null, provenance: prov },
    ];
    const groups = buildPersonContributorGroups(people);
    expect(groups.map((g) => g.heading)).toEqual(["Field observation", "Coordination"]);
    expect(groups[0]?.entries.length).toBe(2);
  });

  it("groups organizations by capacity too", () => {
    const orgs: OrganizationContributor[] = [
      { id: "1", organization: { id: "o", name: "O", shortName: null }, capacity: { key: "funding", label: "Funding" }, attributionNote: null, provenance: prov },
    ];
    expect(buildOrganizationContributorGroups(orgs).map((g) => g.heading)).toEqual(["Funding"]);
    expect(buildOrganizationContributorGroups([])).toEqual([]);
  });
});

describe("buildContributionProjectionView", () => {
  const entry: ContributionAttributionEntry = {
    attributionId: "pc1",
    capacity: { key: "field_observation", label: "Field observation" },
    attributionNote: null,
    attributionProvenance: prov,
    contribution: { id: "c1", title: "T", kind: { key: "long_term_monitoring", label: "Long-term monitoring" }, temporal: temporal(), provenance: prov },
  };

  it("reports an honest empty state and a flat count, never a ranked list", () => {
    expect(buildContributionProjectionView([]).isEmpty).toBe(true);
    const view = buildContributionProjectionView([entry]);
    expect(view.isEmpty).toBe(false);
    expect(view.count).toBe(1);
    expect(view.entries[0]?.contribution.id).toBe("c1");
  });
});
