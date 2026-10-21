import { describe, expect, it } from "vitest";

import { relationshipsCopy } from "../../src/features/relationships/copy";

describe("relationshipsCopy", () => {
  it("has an honest empty state, never social / engagement language", () => {
    expect(relationshipsCopy.empty.title.toLowerCase()).toContain("no relationships");
    const text = JSON.stringify(relationshipsCopy).toLowerCase();
    for (const term of ["people you may know", "grow your", "suggest", "follow", "connect", "endorse", "popular"]) {
      expect(text).not.toContain(term);
    }
  });

  it("contains no PDBFF/institution-specific language (Node Independence)", () => {
    const text = JSON.stringify(relationshipsCopy).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "forest", "manaus", "mateiro"]) {
      expect(text).not.toContain(term);
    }
  });
});
