import { describe, expect, it } from "vitest";

import { excerpt, parseNote, parseNoteForm, proposalFromNote } from "../../src/features/workspace/parse";

const P = "e9000000-0000-4000-8000-000000000010";

function form(fields: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
}

describe("private research space", () => {
  it("validates a note", () => {
    const r = parseNoteForm(form({ title: " Edge birds ", kind: "hypothesis", body: "Maybe…", personId: [P, P, "x"] }));
    expect(r.ok && r.payload).toEqual(expect.objectContaining({ title: "Edge birds", kind: "hypothesis", personIds: [P], id: null }));
    expect(parseNoteForm(form({ title: " " })).ok).toBe(false);
    expect(parseNoteForm(form({ title: "x", kind: "diary" })).ok && (parseNoteForm(form({ title: "x", kind: "diary" })) as { payload: { kind: string } }).payload.kind).toBe("note");
  });

  it("turns an interview into an oral-history proposal with its people", () => {
    const n = parseNote({ id: "n", kind: "interview", title: "Talk with an elder", body: "We spoke about 1979.", people: [{ id: P, displayName: "Elder" }] })!;
    expect(proposalFromNote(n, "u/1-tape.m4a")).toEqual(
      expect.objectContaining({ kind: "oral_history", filePath: "u/1-tape.m4a", links: [{ personId: P, role: "interviewed" }], sourceNote: expect.stringContaining("Interview") }),
    );
    expect(proposalFromNote({ ...n, kind: "note" }, null).kind).toBe("document");
  });

  it("shows short excerpts", () => {
    expect(excerpt("a  b\n c")).toBe("a b c");
    expect(excerpt("x".repeat(200), 10)).toBe("xxxxxxxxx…");
    expect(excerpt(null)).toBe("");
  });
});
