import { describe, expect, it } from "vitest";

import { idsParam, pairSentences, parseConflictCheck, readIds, untied } from "../../src/features/integrity/parse";
import { interpretationError, parseInterpretations, visibleInterpretations } from "../../src/features/interpretations/parse";
import { envelope, identifierUrls, isUuid } from "../../src/features/public-api/envelope";
import { coaCsv, otherSupportText, parseSupportDraft, readSupportForm } from "../../src/features/support/parse";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";

describe("signed interpretations", () => {
  const items = parseInterpretations([
    { id: "1", author: "Ana", body: "A long reading.", status: "published", isMine: false },
    { id: "2", author: "Me", body: "Mine, waiting.", status: "proposed", isMine: true },
    { id: "3", author: "Other", body: "Someone else's, waiting.", status: "proposed", isMine: false },
    { id: "4", author: "Steward sees", body: "Waiting.", status: "proposed", canDecide: true },
    { bad: true },
  ]);
  it("keeps the author's name and the status", () => {
    expect(items).toHaveLength(4);
    expect(items[0]).toMatchObject({ author: "Ana", status: "published" });
  });
  it("shows the published ones, the reader's own, and the ones a steward decides", () => {
    expect(visibleInterpretations(items).map((i) => i.id)).toEqual(["1", "2", "4"]);
  });
  it("explains a refusal in plain words", () => {
    expect(interpretationError("write_interpretation: an interpretation is signed -- add your name to your profile first")).toMatch(/Add your name/);
  });
});

describe("declaring support and ties", () => {
  const draft = parseSupportDraft({
    personId: A,
    name: "Paula",
    appointments: [{ organization: "INPA", role: "Researcher", startYear: 2010, ongoing: true }],
    advisees: [{ personId: B, name: "Quinn, Jr.", affiliation: "USP", startYear: 2015, endYear: 2019 }],
    coauthors: [{ personId: C, name: "Rosa", affiliation: null, lastYear: 2025, works: 2 }],
    support: [
      { id: "s1", kind: "grant", status: "current", title: "Fragments II", funder: "NSF", role: "PI", startYear: 2024, endYear: 2027, effortMonths: 1.5 },
      { id: "s2", kind: "grant", status: "pending", title: "Edges", funder: "CNPq" },
      { id: "s3", kind: "in_kind", status: "current", title: "Field camp", funder: "INPA" },
    ],
  });
  it("reads the draft", () => {
    expect(draft?.support).toHaveLength(3);
    expect(draft?.advisees[0].name).toBe("Quinn, Jr.");
  });
  it("writes Other Support in the funder's order", () => {
    const text = otherSupportText(draft!);
    expect(text.indexOf("ACTIVE")).toBeLessThan(text.indexOf("Fragments II"));
    expect(text.indexOf("PENDING")).toBeLessThan(text.indexOf("Edges"));
    expect(text).toMatch(/IN-KIND CONTRIBUTIONS\n {2}1\. Field camp — from INPA/);
    expect(text).toMatch(/Researcher, INPA \(2010–present\)/);
  });
  it("makes a COA spreadsheet, quoting names with commas", () => {
    const csv = coaCsv(draft!).split("\n");
    expect(csv[0]).toBe("Table,Name,Organizational affiliation,Last active");
    expect(csv[1]).toBe('Advisees,"Quinn, Jr.",USP,2019');
    expect(csv[2]).toBe("Co-authors,Rosa,,2025");
  });
  it("checks the form", () => {
    const get = (v: Record<string, string>) => (k: string) => v[k] ?? "";
    expect(readSupportForm(get({ title: "x" })).ok).toBe(false);
    expect(readSupportForm(get({ title: "Grant", startYear: "2020", endYear: "2019" })).ok).toBe(false);
    expect(readSupportForm(get({ title: "Grant", effortMonths: "13" })).ok).toBe(false);
    const ok = readSupportForm(get({ title: "Grant", startYear: "2020", effortMonths: "1,5", kind: "nonsense" }));
    expect(ok).toEqual(expect.objectContaining({ ok: true }));
    if (ok.ok) expect(ok.value).toMatchObject({ kind: "grant", effortMonths: "1.5", startYear: "2020", endYear: null });
  });
});

describe("checking ties", () => {
  it("reads at most 15 distinct ids from the address", () => {
    expect(readIds(`${A},${B},${A},nope`)).toEqual([A, B]);
    expect(idsParam([A, B])).toBe(`${A},${B}`);
  });
  const check = parseConflictCheck({
    people: [
      { personId: A, name: "Paula" },
      { personId: B, name: "Quinn" },
      { personId: C, name: "Rosa" },
    ],
    pairs: [
      {
        a: { personId: A, name: "Paula" },
        b: { personId: B, name: "Quinn" },
        bonds: [{ kind: "Mentorship", startYear: 2005, status: "provisional" }],
        sharedWorks: [{ id: "w1", title: "Paper", year: 2021 }, { id: "w2", title: "Older", year: 2018 }],
        sharedPlaces: [{ organization: "Station", fromYear: 2005, toYear: 2010 }],
      },
    ],
  });
  it("says what links each pair, with years", () => {
    expect(pairSentences(check.pairs[0])).toEqual([
      "Mentorship, 2005 (not yet confirmed)",
      "2 works together, the latest in 2021",
      "Both at Station, 2005–2010",
    ]);
  });
  it("names who has no documented tie", () => {
    expect(untied(check).map((p) => p.name)).toEqual(["Rosa"]);
  });
});

describe("public API", () => {
  it("wraps data with its source and a note", () => {
    expect(envelope([1], "https://x.test")).toMatchObject({ source: "https://x.test", data: [1] });
    expect(isUuid(A)).toBe(true);
    expect(isUuid("1; drop")).toBe(false);
  });
  it("links ROR and Wikidata ids", () => {
    expect(identifierUrls({ ror: "04xyz", wikidata: "Q123" })).toEqual({ ror: "https://ror.org/04xyz", wikidata: "https://www.wikidata.org/wiki/Q123" });
    expect(identifierUrls({ ror: "https://ror.org/04xyz", wikidata: "not-q" })).toEqual({ ror: "https://ror.org/04xyz", wikidata: null });
  });
});
