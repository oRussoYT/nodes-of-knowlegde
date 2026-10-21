import { describe, expect, it } from "vitest";

import { SITE_DESCRIPTION, SITE_NAME, pageTitle } from "../../src/config/site";

// Structural checks on the single source of deployment identity. Deliberately
// not content-locked to the current product name: a future Node rebrands by
// changing src/config/site.ts, and only a broken invariant (empty identity,
// or pageTitle no longer deriving from SITE_NAME) should fail this file.
describe("site config", () => {
  it("exposes a non-empty product name and description", () => {
    expect(SITE_NAME.trim().length).toBeGreaterThan(0);
    expect(SITE_DESCRIPTION.trim().length).toBeGreaterThan(0);
  });

  it("derives page titles as '<section> — <SITE_NAME>'", () => {
    expect(pageTitle("Log in")).toBe(`Log in — ${SITE_NAME}`);
  });

  it("always includes the product name in a page title", () => {
    expect(pageTitle("Anything")).toContain(SITE_NAME);
  });
});
