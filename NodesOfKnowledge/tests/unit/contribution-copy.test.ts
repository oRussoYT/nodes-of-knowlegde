import { describe, expect, it } from "vitest";

import { contributionCopy, NARRATIVE_FACET_LABELS } from "../../src/features/contribution/copy";

describe("contributionCopy", () => {
  it("uses calm, evidence-aware language, never ranking, impact, or achievement", () => {
    const text = JSON.stringify({ contributionCopy, NARRATIVE_FACET_LABELS }).toLowerCase();
    for (const term of [
      "achievement",
      "impact",
      "top contributor",
      "innovation score",
      "productivity",
      "high impact",
      "breakthrough",
      "successful intervention",
      "world-changing",
      "key player",
      "leaderboard",
      "ranking",
      "score",
      "citation count",
    ]) {
      expect(text).not.toContain(term);
    }
  });

  it("makes uncertainty and absence honest, never a failure or an engagement prompt", () => {
    const text = JSON.stringify(contributionCopy).toLowerCase();
    for (const term of ["complete your", "complete this profile", "get started", "our mission", "world-class", "trusted by", "sign up"]) {
      expect(text).not.toContain(term);
    }
    expect(contributionCopy.overview.absent.description.toLowerCase()).toContain("has not yet been recorded");
    // The collective / unnamed state is representable and honest.
    expect(contributionCopy.contributors.absent.description.toLowerCase()).toContain("collective");
    expect(contributionCopy.significance.absent.description.toLowerCase()).toContain("never derived from prominence");
  });

  it("labels every narrative facet", () => {
    expect(NARRATIVE_FACET_LABELS.overview).toBe("Overview");
    expect(NARRATIVE_FACET_LABELS.context).toBe("Historical context");
    expect(NARRATIVE_FACET_LABELS.significance).toBe("Significance");
    expect(NARRATIVE_FACET_LABELS.legacy).toBe("Legacy");
  });

  it("contains no PDBFF/institution-specific language (Node Independence)", () => {
    const text = JSON.stringify({ contributionCopy, NARRATIVE_FACET_LABELS }).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "manaus", "mateiro", "forest"]) {
      expect(text).not.toContain(term);
    }
  });
});
