import { describe, expect, it } from "vitest";

import { isNodeSlug, nodeLabel, parseMyNodes, parseNodeDetail, parseNodeList } from "@/features/nodes/parse";

const raw = {
  id: "n1",
  slug: "pdbff",
  name: "Biological Dynamics of Forest Fragments Project",
  shortName: "PDBFF",
  tagline: "People behind the experiment",
  description: "Since 1979",
  accentColor: "#d2ff00",
  coverPhoto: "/photos/aerial",
  plan: "pro_bono",
  status: "active",
  counts: { people: 11, institutions: 3, works: 40, members: 2, firstYear: 1979 },
  institutions: [
    { id: "o1", name: "BDFFP", role: "core" },
    { id: "o2", name: "INPA", role: "host" },
    { id: "o3", name: "STRI", role: "weird" },
    { name: "no id" },
  ],
  isMember: true,
};

describe("knowledge nodes", () => {
  it("validates slugs", () => {
    expect(isNodeSlug("pdbff")).toBe(true);
    expect(isNodeSlug("cocha-cashu")).toBe(true);
    expect(isNodeSlug("Bad Slug")).toBe(false);
    expect(isNodeSlug("../x")).toBe(false);
  });

  it("parses a Node page", () => {
    const node = parseNodeDetail(raw);
    expect(node?.counts).toEqual({ people: 11, institutions: 3, works: 40, members: 2, firstYear: 1979 });
    expect(node?.institutions.map((i) => i.role)).toEqual(["core", "host", "core"]);
    expect(node?.isMember).toBe(true);
    expect(nodeLabel(node!)).toBe("PDBFF");
  });

  it("drops unsafe cover photos and colours", () => {
    const node = parseNodeDetail({ ...raw, coverPhoto: "https://evil.example/x", accentColor: "red" });
    expect(node?.coverPhoto).toBeNull();
    expect(node?.accentColor).toBeNull();
  });

  it("parses lists and memberships", () => {
    expect(parseNodeList([raw, { slug: "Bad Slug", name: "x" }])).toHaveLength(1);
    expect(parseNodeDetail(null)).toBeNull();
    expect(parseMyNodes([{ slug: "pdbff", name: "BDFFP", shortName: "PDBFF" }, { slug: 1 }])).toEqual([
      { slug: "pdbff", name: "BDFFP", shortName: "PDBFF", joinedAt: null },
    ]);
  });
});
