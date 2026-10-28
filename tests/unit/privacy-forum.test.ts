import { describe, expect, it } from "vitest";

import { checkPost, parseThread, parseThreads, when } from "../../src/features/forum/parse";
import { parseHeritageForm } from "../../src/features/heritage/parse";
import { parsePrivacy } from "../../src/features/privacy/read";

const C = "ea000000-0000-4000-8000-000000000020";

function form(fields: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
}

describe("privacy", () => {
  it("reads consent safely", () => {
    expect(parsePrivacy({ limitRevelations: true, isSelf: false })).toEqual({ limitRevelations: true, isSelf: false, viewerIsSteward: false });
    expect(parsePrivacy(null).limitRevelations).toBe(false);
  });

  it("community material needs its community and keeps its labels", () => {
    expect(parseHeritageForm(form({ kind: "oral_history", title: "Story", sourceNote: "s", visibility: "community" }), ["oral_history"]).ok).toBe(false);
    const r = parseHeritageForm(form({ kind: "oral_history", title: "Story", sourceNote: "s", visibility: "community", communityOrganizationId: C, careLabel: ["tk_secret_sacred", "BAD LABEL"] }), ["oral_history"]);
    expect(r.ok && r.payload).toEqual(expect.objectContaining({ visibility: "community", communityOrganizationId: C, careLabels: ["tk_secret_sacred"] }));
  });
});

describe("forum", () => {
  it("tells members from non-members", () => {
    expect(parseThreads(null)).toBeNull();
    expect(parseThreads([{ id: "t", title: "Hi there", posts: 2 }, { id: 1 }])).toEqual([{ id: "t", title: "Hi there", author: "A member", posts: 2, lastPostAt: "" }]);
    expect(parseThread({ id: "t", title: "x", posts: [{ id: "p", body: "hello", isMine: true }] })!.posts[0]!.isMine).toBe(true);
  });

  it("checks messages and shows times in UTC", () => {
    expect(checkPost("Hi", "x").ok).toBe(false);
    expect(checkPost(null, "  ").ok).toBe(false);
    expect(checkPost("Hello", "x").ok).toBe(true);
    expect(when("2026-10-28T21:05:00Z")).toBe("28 Oct 2026, 21:05 UTC");
  });
});
