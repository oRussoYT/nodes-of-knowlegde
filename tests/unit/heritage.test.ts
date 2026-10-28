import { describe, expect, it } from "vitest";

import { describeSpan, fileView, heritageFileProblem, parseHeritageForm, parseItem, parseItems } from "../../src/features/heritage/parse";

const P = "e3000000-0000-4000-8000-000000000010";
const KINDS = ["photo", "expedition", "species"];

function form(fields: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
}

describe("history items: form", () => {
  it("accepts a photo with people, place and coordinates", () => {
    const r = parseHeritageForm(
      form({ kind: "photo", title: "Camp 41 kitchen", startYear: "1987", latitude: "-2,40", longitude: "-59.9", sourceNote: "Album", personId: [P, P, "x"], personRole: "pictured", restricted: "on" }),
      KINDS,
    );
    expect(r.ok && r.payload).toEqual(
      expect.objectContaining({ kind: "photo", startYear: 1987, latitude: -2.4, longitude: -59.9, visibility: "restricted", links: [{ personId: P, role: "pictured" }] }),
    );
  });

  it("refuses what it cannot keep honestly", () => {
    expect(parseHeritageForm(form({ kind: "ufo", title: "x y", sourceNote: "s" }), KINDS).ok).toBe(false);
    expect(parseHeritageForm(form({ kind: "photo", title: "x y", sourceNote: "" }), KINDS).ok).toBe(false);
    expect(parseHeritageForm(form({ kind: "photo", title: "x y", sourceNote: "s", latitude: "-2.4" }), KINDS).ok).toBe(false);
    expect(parseHeritageForm(form({ kind: "photo", title: "x y", sourceNote: "s", latitude: "95", longitude: "1" }), KINDS).ok).toBe(false);
    expect(parseHeritageForm(form({ kind: "photo", title: "x y", sourceNote: "s", externalUrl: "ftp://a" }), KINDS).ok).toBe(false);
    expect(parseHeritageForm(form({ kind: "photo", title: "x y", sourceNote: "s", startYear: "1990", endYear: "1980" }), KINDS).ok).toBe(false);
  });
});

describe("history items: reading", () => {
  it("parses items and drops malformed ones", () => {
    const list = parseItems([
      { id: "1", kind: "species", kindLabel: "Species", title: "Bearded saki", scientificName: "Chiropotes", sourceNote: "Survey", reviewStatus: "accepted", links: [{ id: "l", personId: P, personName: "Ana" }, {}] },
      { id: "2", kind: "photo", title: "No source" },
    ]);
    expect(list).toHaveLength(1);
    expect(list[0]!.links).toHaveLength(1);
    expect(list[0]!.verificationStatus).toBe("provisional");
    expect(parseItem(null)).toBeNull();
  });

  it("describes spans and file views", () => {
    expect(describeSpan({ startYear: 1987, endYear: 1990, isOngoing: false })).toBe("1987–1990");
    expect(describeSpan({ startYear: 1979, endYear: null, isOngoing: true })).toBe("since 1979");
    expect(describeSpan({ startYear: null, endYear: null, isOngoing: false })).toBe("");
    expect(fileView("u/1-a.JPG")).toBe("image");
    expect(fileView("u/1-a.m4a")).toBe("audio");
    expect(fileView("u/1-a.pdf")).toBe("pdf");
    expect(fileView(null)).toBeNull();
  });

  it("checks files", () => {
    expect(heritageFileProblem({ type: "audio/mpeg", size: 1000 })).toBeNull();
    expect(heritageFileProblem({ type: "video/mp4", size: 1000 })).not.toBeNull();
    expect(heritageFileProblem({ type: "image/png", size: 51 * 1024 * 1024 })).not.toBeNull();
  });
});
