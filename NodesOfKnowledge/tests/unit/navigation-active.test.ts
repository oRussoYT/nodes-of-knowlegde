import { describe, expect, it } from "vitest";

import { isNavItemActive } from "../../src/lib/navigation/active";
import type { NavItem } from "../../src/lib/navigation/types";

function item(overrides: Partial<NavItem> = {}): NavItem {
  return {
    id: "test",
    label: "Test",
    href: "/account",
    groups: ["protected-primary"],
    availability: { status: "available" },
    ...overrides,
  };
}

describe("isNavItemActive", () => {
  it("matches an exact pathname", () => {
    expect(isNavItemActive("/account", item())).toBe(true);
  });

  it("matches a deeper pathname under href by default (prefix match)", () => {
    expect(isNavItemActive("/account/security", item())).toBe(true);
  });

  it("does not match an unrelated pathname that merely shares a prefix string", () => {
    // "/account" must not match "/accounting" — segment-boundary check, not substring.
    expect(isNavItemActive("/accounting", item())).toBe(false);
  });

  it("does not match a sibling or parent path", () => {
    expect(isNavItemActive("/member", item())).toBe(false);
    expect(isNavItemActive("/", item())).toBe(false);
  });

  it("respects exactMatch, rejecting deeper paths", () => {
    expect(isNavItemActive("/account/security", item({ exactMatch: true }))).toBe(false);
    expect(isNavItemActive("/account", item({ exactMatch: true }))).toBe(true);
  });

  it("also matches any configured matchPaths entry", () => {
    const withExtra = item({ href: "/member", matchPaths: ["/dashboard"] });
    expect(isNavItemActive("/dashboard", withExtra)).toBe(true);
    expect(isNavItemActive("/dashboard/widgets", withExtra)).toBe(true);
  });

  it("is never active without an href, regardless of pathname", () => {
    expect(isNavItemActive("/anything", item({ href: undefined }))).toBe(false);
  });

  it("is never active when planned (unavailable), even if href happens to be set", () => {
    const planned = item({ href: "/about", availability: { status: "planned" } });
    expect(isNavItemActive("/about", planned)).toBe(false);
  });
});
