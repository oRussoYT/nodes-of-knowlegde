import { describe, expect, it } from "vitest";

import { timelineCopy } from "../../src/features/timeline/copy";

describe("timelineCopy", () => {
  it("has honest empty-state copy, never engagement filler", () => {
    expect(timelineCopy.empty.title.toLowerCase()).toContain("no timeline");
    const text = JSON.stringify(timelineCopy).toLowerCase();
    expect(text).not.toContain("complete your");
    expect(text).not.toContain("get started");
  });

  it("names the undated group honestly", () => {
    expect(timelineCopy.undatedGroupLabel).toBe("Date unknown");
  });

  it("contains no PDBFF/institution-specific language (Node Independence)", () => {
    const text = JSON.stringify(timelineCopy).toLowerCase();
    for (const term of ["pdbff", "netpdbff", "amazon", "forest", "manaus", "mateiro"]) {
      expect(text).not.toContain(term);
    }
  });
});
