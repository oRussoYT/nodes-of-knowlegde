import { describe, expect, it } from "vitest";

import { getNavItemsByGroup } from "../../src/lib/navigation/select";
import type { NavItem } from "../../src/lib/navigation/types";

const fixture: NavItem[] = [
  { id: "a", label: "A", href: "/a", groups: ["public-primary"], availability: { status: "available" } },
  {
    id: "b",
    label: "B",
    href: "/b",
    groups: ["protected-primary", "user-menu"],
    availability: { status: "available" },
  },
  { id: "c", label: "C", groups: ["user-menu"], availability: { status: "planned" } },
];

describe("getNavItemsByGroup", () => {
  it("returns only entries tagged with the requested group, in config order", () => {
    expect(getNavItemsByGroup("public-primary", fixture).map((i) => i.id)).toEqual(["a"]);
  });

  it("returns an entry that belongs to multiple groups from each group's selector", () => {
    expect(getNavItemsByGroup("protected-primary", fixture).map((i) => i.id)).toEqual(["b"]);
    expect(getNavItemsByGroup("user-menu", fixture).map((i) => i.id)).toEqual(["b", "c"]);
  });

  it("does not mutate the input array", () => {
    const before = [...fixture];
    getNavItemsByGroup("user-menu", fixture);
    expect(fixture).toEqual(before);
  });

  it("defaults to the real navigationConfig when no items array is passed", () => {
    expect(getNavItemsByGroup("public-primary").length).toBeGreaterThan(0);
  });
});
