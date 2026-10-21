import { describe, expect, it } from "vitest";

import {
  describePathwayStepRelation,
  describePathwaySummary,
  revelationCopy,
  revelationSourceRecordLabel,
} from "../../src/features/revelation/copy";
import type { PathwayStep, PersonPathwayDocument } from "../../src/features/revelation/types";

function pnode(type: PathwayStep["from"]["type"], id: string, label: string): PathwayStep["from"] {
  return { type, id, label, secondaryLabel: null, href: `/${type}/${id}`, verificationStatus: "provisional" };
}
function step(category: PathwayStep["category"], label: string): PathwayStep {
  return {
    source: { type: "participations", id: "s1" },
    category, label,
    from: pnode("person", "p1", "Ana Alpha"),
    to: pnode("organization", "o1", "Org Xavier"),
    temporal: {
      startDate: "1980-01-01", startPrecision: "year", endDate: null, endPrecision: null,
      isApproximate: false, isOngoing: false, dateIsUnknown: false, dateIsUncertain: false,
    },
    provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
  };
}
function doc(): PersonPathwayDocument {
  return {
    fromId: "p1", from: pnode("person", "p1", "Ana Alpha"),
    toId: "c1", to: pnode("contribution", "c1", "Contribution Kappa"),
    targetResolved: true, found: true, stepCount: 3, steps: [],
  };
}

describe("describePathwaySummary (endpoint rule)", () => {
  it("states the literal chain and its length, never 'A is connected to B'", () => {
    expect(describePathwaySummary(doc())).toBe(
      "A documented chain of 3 steps connects Ana Alpha and Contribution Kappa.",
    );
  });
});

describe("describePathwayStepRelation", () => {
  it("reads a step structurally by category and vocabulary label", () => {
    expect(describePathwayStepRelation(step("participation", "Researcher"))).toBe(
      "documented participation (researcher)",
    );
    expect(describePathwayStepRelation(step("institutional_relationship", "Succession"))).toBe(
      "documented institutional relationship (succession)",
    );
    expect(describePathwayStepRelation(step("event", "Expedition"))).toBe(
      "documented event (expedition)",
    );
  });
});

describe("revelationSourceRecordLabel (M8.6 sources)", () => {
  it("labels contribution-attribution and event-association records", () => {
    expect(revelationSourceRecordLabel("person_contributions")).toBe("contribution attribution record");
    expect(revelationSourceRecordLabel("organization_events")).toBe("event association record");
    expect(revelationSourceRecordLabel("relationships")).toBe("relationship record");
  });
});

describe("revelationCopy.personPathway (endpoint rule + no-metric)", () => {
  it("frames the chain honestly and states the endpoint rule and no-ranking discipline", () => {
    const c = revelationCopy.personPathway;
    expect(c.whatThisShows.toLowerCase()).toContain("not a connection between its ends");
    expect(c.limits.toLowerCase()).toContain("not a connection between its endpoints");
    expect(c.limits.toLowerCase()).toContain("never ordered or scored by length");
    expect(c.noChain.description.toLowerCase()).toContain("not a claim that the two are unrelated");
  });

  it("never asserts the endpoints are connected, and carries no metric/ranking vocabulary", () => {
    const text = JSON.stringify([
      revelationCopy.personPathway,
      describePathwaySummary(doc()),
      describePathwayStepRelation(step("participation", "Researcher")),
    ]).toLowerCase();
    for (const term of [
      "is connected to",
      "are connected",
      "closeness",
      "closest",
      "nearest",
      "strongest",
      "strength",
      "tie ",
      "shortest",
      "importance",
      "important",
      "influential",
      "central",
      "similar",
      "recommend",
      "popular",
      "ranking",
      "most connected",
      "significance",
      "prominent",
    ]) {
      expect(text).not.toContain(term);
    }
  });

  it("contains no PDBFF/institution-specific language (Node Independence)", () => {
    const text = JSON.stringify(revelationCopy.personPathway).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "manaus", "mateiro"]) {
      expect(text).not.toContain(term);
    }
  });
});
