import { describe, expect, it } from "vitest";

import { biographyCopy, RESERVED_SECTION_ORDER } from "../../src/features/biography/copy";

// Copy is data; these guard the honest-states contract and Node-neutrality
// (no PDBFF-specific language, no fabricated metrics).

describe("biographyCopy", () => {
  it("reserves exactly the two later-capability sections, in order", () => {
    expect(RESERVED_SECTION_ORDER).toEqual([
      "records",
      "legacy",
    ]);
    for (const key of RESERVED_SECTION_ORDER) {
      expect(biographyCopy.reservedSections[key].title.length).toBeGreaterThan(0);
      expect(biographyCopy.reservedSections[key].description.length).toBeGreaterThan(0);
    }
  });

  it("has honest absence and not-found copy, never marketing filler", () => {
    expect(biographyCopy.narrativeAbsent.title.toLowerCase()).toContain("no biographical narrative");
    expect(biographyCopy.notFound.title.length).toBeGreaterThan(0);
    expect(biographyCopy.withheldNote.toLowerCase()).toContain("not shown");
  });

  it("contains no PDBFF-specific or institution-specific language (Node Independence)", () => {
    const allText = JSON.stringify(biographyCopy).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "forest", "manaus"]) {
      expect(allText).not.toContain(term);
    }
  });

  it("never fabricates a metric or count of domain data", () => {
    const allText = JSON.stringify(biographyCopy);
    expect(allText).not.toMatch(/\b\d[\d,]*\+?\s*(participations?|publications?|projects?|relationships?|collaborators?|records?)\b/i);
  });
});
