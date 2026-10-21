import { describe, expect, it } from "vitest";

import { buildParticipationView, describeParticipationProvenance } from "../../src/features/participation/derive";
import type { Participation, ParticipationDocument } from "../../src/features/participation/types";

function pa(id: string, org: { id: string; name: string }, startDate: string | null): Participation {
  return {
    id,
    organization: { id: org.id, name: org.name, shortName: null },
    capacity: { key: "researcher", label: "Researcher" },
    summary: null,
    temporal: {
      startDate,
      startPrecision: startDate ? "year" : null,
      endDate: null,
      endPrecision: null,
      isApproximate: false,
      isOngoing: false,
      dateIsUnknown: startDate === null,
      dateIsUncertain: false,
    },
    provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
  };
}

function doc(participations: Participation[]): ParticipationDocument {
  return { personId: "p1", participations };
}

const alpha = { id: "org-a", name: "Alpha Station" };
const beta = { id: "org-b", name: "Beta Institute" };

describe("buildParticipationView", () => {
  it("is empty for no participations", () => {
    const view = buildParticipationView(doc([]));
    expect(view.isEmpty).toBe(true);
    expect(view.affiliations).toEqual([]);
  });

  it("groups participations by organization (a map of belonging, not a chronological feed)", () => {
    // Input arrives chronologically ordered (as the read model returns it).
    const view = buildParticipationView(
      doc([pa("1", alpha, "1987-01-01"), pa("2", beta, "1990-01-01"), pa("3", alpha, "1992-01-01")]),
    );
    expect(view.isEmpty).toBe(false);
    expect(view.affiliations.length).toBe(2);
    expect(view.affiliations.map((group) => group.organizationName)).toEqual(["Alpha Station", "Beta Institute"]);
    // Two capacities/periods at Alpha stay together, in order (sequential + concurrent belongings preserved).
    expect(view.affiliations[0]?.participations.map((p) => p.id)).toEqual(["1", "3"]);
    expect(view.affiliations[1]?.participations.map((p) => p.id)).toEqual(["2"]);
    expect(view.participationCount).toBe(3);
  });

  it("orders affiliation groups by earliest involvement, not alphabetically", () => {
    // Beta is encountered first (earliest 1985) though it sorts later by name.
    const view = buildParticipationView(doc([pa("1", beta, "1985-01-01"), pa("2", alpha, "1990-01-01")]));
    expect(view.affiliations.map((group) => group.organizationName)).toEqual(["Beta Institute", "Alpha Station"]);
  });

  it("keeps an undated belonging (never dropped), grouped under its organization", () => {
    const view = buildParticipationView(doc([pa("1", alpha, "1987-01-01"), pa("2", beta, null)]));
    expect(view.participationCount).toBe(2);
    const beta_group = view.affiliations.find((group) => group.organizationName === "Beta Institute");
    expect(beta_group?.participations.length).toBe(1);
    expect(beta_group?.participations[0]?.temporal.dateIsUnknown).toBe(true);
  });
});

describe("describeParticipationProvenance", () => {
  it("labels source and verification in plain language, identical to the platform kernel", () => {
    expect(describeParticipationProvenance("imported_historical", "provisional")).toEqual({
      sourceLabel: "Imported from historical records",
      statusLabel: "Awaiting review",
    });
    expect(describeParticipationProvenance("admin_entered", "verified_admin").statusLabel).toBe("Verified by an administrator");
    expect(describeParticipationProvenance("self_reported", "disputed").statusLabel).toBe("Disputed");
  });
});
