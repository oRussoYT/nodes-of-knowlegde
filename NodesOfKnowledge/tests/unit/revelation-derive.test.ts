import { describe, expect, it } from "vitest";

import { buildPersonCohortsView } from "../../src/features/revelation/derive";
import type { Cohort, PersonCohortsDocument } from "../../src/features/revelation/types";

function cohort(orgId: string, orgLabel: string): Cohort {
  return {
    organization: {
      type: "organization",
      id: orgId,
      label: orgLabel,
      secondaryLabel: null,
      href: `/institutions/${orgId}`,
      verificationStatus: "provisional",
    },
    focalParticipations: [],
    members: [
      {
        person: {
          type: "person",
          id: "m1",
          label: "A Member",
          secondaryLabel: null,
          href: "/people/m1",
          verificationStatus: "provisional",
        },
        capacity: { key: "researcher", label: "Researcher" },
        temporal: {
          startDate: "1990-01-01",
          startPrecision: "year",
          endDate: null,
          endPrecision: null,
          isApproximate: false,
          isOngoing: true,
          dateIsUnknown: false,
          dateIsUncertain: false,
        },
        provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
        source: { type: "participations", id: "part1" },
      },
    ],
  };
}

describe("buildPersonCohortsView", () => {
  it("treats a null document as an honest absence (never an error)", () => {
    const view = buildPersonCohortsView(null);
    expect(view.isEmpty).toBe(true);
    expect(view.cohorts).toEqual([]);
  });

  it("treats an empty cohorts array as an honest absence", () => {
    const doc: PersonCohortsDocument = { personId: "p1", cohorts: [] };
    const view = buildPersonCohortsView(doc);
    expect(view.isEmpty).toBe(true);
  });

  it("preserves the read model's cohort order exactly (no re-ranking)", () => {
    const doc: PersonCohortsDocument = {
      personId: "p1",
      cohorts: [cohort("o0", "Aardvark Institute"), cohort("o1", "Alpha Institute")],
    };
    const view = buildPersonCohortsView(doc);
    expect(view.isEmpty).toBe(false);
    expect(view.cohorts.map((c) => c.organization.id)).toEqual(["o0", "o1"]);
  });
});
