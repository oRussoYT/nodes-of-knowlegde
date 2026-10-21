import { describe, expect, it } from "vitest";

import { revelationCopy } from "../../src/features/revelation/copy";

describe("revelationCopy.organizationGenerations", () => {
  it("states plainly that co-presence is documented, not an asserted relationship", () => {
    const whatThisShows = revelationCopy.organizationGenerations.whatThisShows.toLowerCase();
    expect(whatThisShows).toContain("documented co-presence");
    expect(whatThisShows).toContain("not a record that they knew one another");
  });

  it("states plainly that the co-presence is documented, not the true one, and that absence is not proof", () => {
    const limits = revelationCopy.organizationGenerations.limits.toLowerCase();
    expect(limits).toContain("documented co-presence, not the true one");
    expect(limits).toContain("absence");
  });

  it("never calls the pattern a 'generation' (Spec Sec.2: that is interpretation, not revelation)", () => {
    const text = JSON.stringify(revelationCopy.organizationGenerations).toLowerCase();
    expect(text).not.toContain("generation");
  });

  it("contains no metric, ranking, similarity, recommendation, or social/engagement language", () => {
    const text = JSON.stringify(revelationCopy.organizationGenerations).toLowerCase();
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
      "community",
      "school",
      "circle",
      "collaborat",
    ]) {
      expect(text).not.toContain(term);
    }
  });

  it("contains no PDBFF/institution-specific language (Node Independence)", () => {
    const text = JSON.stringify(revelationCopy.organizationGenerations).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "manaus", "mateiro"]) {
      expect(text).not.toContain(term);
    }
  });
});
