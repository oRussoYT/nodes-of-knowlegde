import { describe, expect, it } from "vitest";

import {
  describeParticipationHere,
  revelationCopy,
  revelationSourceRecordLabel,
} from "../../src/features/revelation/copy";

describe("describeParticipationHere", () => {
  it("states a documented participation from the record's capacity, never a relationship", () => {
    expect(describeParticipationHere("Cara Stone", { key: "researcher", label: "Researcher" })).toBe(
      "Cara Stone participated here as a researcher.",
    );
  });

  it("uses the honest article before a vowel-initial capacity", () => {
    expect(describeParticipationHere("Ada Overlap", { key: "intern", label: "Intern" })).toBe(
      "Ada Overlap participated here as an intern.",
    );
  });

  it("works for the focal anchor subject", () => {
    expect(describeParticipationHere("This person", { key: "field_assistant", label: "Field assistant" })).toBe(
      "This person participated here as a field assistant.",
    );
  });
});

describe("revelationSourceRecordLabel", () => {
  it("names the canonical record a member decomposes to", () => {
    expect(revelationSourceRecordLabel("participations")).toBe("participation record");
    expect(revelationSourceRecordLabel("unknown_table")).toBe("documented record");
  });
});

describe("revelationCopy", () => {
  it("states plainly that co-presence is documented, not an asserted relationship", () => {
    const whatThisShows = revelationCopy.personCohorts.whatThisShows.toLowerCase();
    expect(whatThisShows).toContain("documented co-presence");
    expect(whatThisShows).toContain("not a record that they knew one another");
  });

  it("states plainly that the cohort is the documented cohort, not the true one, and that absence is not proof", () => {
    const limits = revelationCopy.personCohorts.limits.toLowerCase();
    expect(limits).toContain("documented cohort, not the true one");
    expect(limits).toContain("absence");
  });

  it("contains no metric, ranking, recommendation, similarity, or social/engagement language", () => {
    const text = JSON.stringify(revelationCopy).toLowerCase();
    for (const term of [
      "recommend",
      "suggest",
      "popular",
      "ranking",
      "leaderboard",
      "centrality",
      "prestige",
      "influence",
      "similar",
      "most connected",
      "important",
      "top ",
      "trending",
      "you may know",
    ]) {
      expect(text).not.toContain(term);
    }
  });

  it("contains no PDBFF/institution-specific language (Node Independence)", () => {
    const text = JSON.stringify(revelationCopy).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "manaus", "mateiro"]) {
      expect(text).not.toContain(term);
    }
  });
});
