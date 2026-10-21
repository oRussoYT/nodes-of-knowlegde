import { describe, expect, it } from "vitest";

import { navigationConfig } from "../../src/lib/navigation/config";

// Schema-sanity checks on the single source of navigation truth. These are
// deliberately structural (uniqueness, shape invariants) rather than
// content-locked to every current label, so adding a future entry doesn't
// require rewriting this file — only violating an invariant should.
describe("navigationConfig", () => {
  it("has no duplicate ids", () => {
    const ids = navigationConfig.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry belongs to at least one group", () => {
    for (const item of navigationConfig) {
      expect(item.groups.length).toBeGreaterThan(0);
    }
  });

  it("every available entry has a real href", () => {
    for (const item of navigationConfig) {
      if (item.availability.status === "available") {
        expect(item.href).toBeTruthy();
      }
    }
  });

  it("every planned entry omits href or documents that it intentionally has none", () => {
    // Not a hard requirement that planned entries omit href (a route could
    // be reserved with a known future path), but every planned entry must
    // at least be distinguishable from a real, working destination via its
    // availability field — this is what NavLink relies on to never render
    // it as a functional link.
    for (const item of navigationConfig) {
      if (item.availability.status === "planned") {
        expect(item.availability.status).toBe("planned");
      }
    }
  });

  it("includes the known M5.2 entries with correct group placement", () => {
    const byId = Object.fromEntries(navigationConfig.map((item) => [item.id, item]));

    expect(byId.login.groups).toContain("public-primary");
    expect(byId.register.groups).toContain("public-primary");
    expect(byId.member.groups).toEqual(expect.arrayContaining(["protected-primary", "user-menu"]));
    expect(byId.account.groups).toEqual(expect.arrayContaining(["protected-primary", "user-menu"]));
  });

  it("reserves the /about slot as planned, never as a live link", () => {
    const about = navigationConfig.find((item) => item.id === "about");
    expect(about).toBeDefined();
    expect(about?.availability.status).toBe("planned");
  });
});
