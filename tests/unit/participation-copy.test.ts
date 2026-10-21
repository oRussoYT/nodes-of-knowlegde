import { describe, expect, it } from "vitest";

import { participationCopy } from "../../src/features/participation/copy";

describe("participationCopy", () => {
  it("has honest empty-state copy, never engagement filler", () => {
    expect(participationCopy.empty.title.toLowerCase()).toContain("no participation");
    const text = JSON.stringify(participationCopy).toLowerCase();
    expect(text).not.toContain("complete your");
    expect(text).not.toContain("get started");
  });

  it("contains no PDBFF/institution-specific language (Node Independence)", () => {
    const text = JSON.stringify(participationCopy).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "forest", "manaus", "mateiro"]) {
      expect(text).not.toContain(term);
    }
  });
});
