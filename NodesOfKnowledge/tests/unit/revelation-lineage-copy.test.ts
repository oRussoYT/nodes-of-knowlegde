import { describe, expect, it } from "vitest";

import { describeLineageStep, revelationCopy } from "../../src/features/revelation/copy";
import type { LineageStep } from "../../src/features/revelation/types";

describe("revelationCopy lineage sections", () => {
  it("states the institutional descent is documented, not the true one, and order not causation", () => {
    const c = revelationCopy.organizationLineage;
    expect(c.whatThisShows.toLowerCase()).toContain("not what caused");
    expect(c.limits.toLowerCase()).toContain("documented descent, not the true one");
    expect(c.limits.toLowerCase()).toContain("silence in the record");
  });

  it("states the mentorship lineage is documented, records who mentored whom, and stops there", () => {
    const c = revelationCopy.personMentorshipLineage;
    expect(c.whatThisShows.toLowerCase()).toContain("who mentored whom");
    expect(c.limits.toLowerCase()).toContain("documented mentorship lineage, not the true one");
  });

  it("contains no interpretation, metric, ranking, similarity, or causation vocabulary", () => {
    const text = JSON.stringify([
      revelationCopy.organizationLineage,
      revelationCopy.personMentorshipLineage,
    ]).toLowerCase();
    for (const term of [
      "school",
      "tradition",
      "influence",
      "transmission",
      "inherit",
      "importance",
      "important",
      "central",
      "prestige",
      "similar",
      "recommend",
      "ranking",
      "popular",
      "top ",
      "most connected",
      "evolution", // reader copy says "descent"/"succession", never the interpretive "evolution"
    ]) {
      expect(text).not.toContain(term);
    }
  });

  it("contains no PDBFF/institution-specific language (Node Independence)", () => {
    const text = JSON.stringify([
      revelationCopy.organizationLineage,
      revelationCopy.personMentorshipLineage,
    ]).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "manaus", "mateiro"]) {
      expect(text).not.toContain(term);
    }
  });
});

function lineageStep(sourceRole: string, fromLabel: string, toLabel: string): LineageStep {
  return {
    source: { type: "relationships", id: "s1" },
    kind: { key: "mentorship", label: "Mentorship", sourceRole },
    from: {
      type: "person",
      id: "f",
      label: fromLabel,
      secondaryLabel: null,
      href: "/people/f",
      verificationStatus: "provisional",
    },
    to: {
      type: "person",
      id: "t",
      label: toLabel,
      secondaryLabel: null,
      href: "/people/t",
      verificationStatus: "provisional",
    },
    temporal: {
      startDate: null,
      startPrecision: null,
      endDate: null,
      endPrecision: null,
      isApproximate: false,
      isOngoing: false,
      dateIsUnknown: true,
      dateIsUncertain: false,
    },
    provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
    direction: "upstream",
    depth: 1,
  };
}

describe("describeLineageStep", () => {
  it("reads a step directionally from the vocabulary's source-role label", () => {
    expect(describeLineageStep(lineageStep("Mentor", "A Mentor", "A Student"))).toBe(
      "A Mentor is a documented mentor of A Student.",
    );
    expect(describeLineageStep(lineageStep("Predecessor", "Old Station", "New Institute"))).toBe(
      "Old Station is a documented predecessor of New Institute.",
    );
  });
});
