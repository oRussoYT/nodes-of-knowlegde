import { afterEach, describe, expect, it } from "vitest";

import { aiIsOn, buildPrompt, parseExtraction } from "../../src/features/record-candidates/ai";

const caps = [{ key: "researcher", label: "Researcher" }, { key: "other", label: "Other" }];
const kinds = [{ key: "mentorship", label: "Mentorship" }];

describe("AI reading of a document", () => {
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("is off until a key is set", () => {
    delete process.env.ANTHROPIC_API_KEY;
    expect(aiIsOn()).toBe(false);
    process.env.ANTHROPIC_API_KEY = "  ";
    expect(aiIsOn()).toBe(false);
  });

  it("asks only for what the document states, with allowed keys", () => {
    const p = buildPrompt("Ana Field", caps, kinds);
    expect(p).toContain("Ana Field");
    expect(p).toContain("researcher, other");
    expect(p).toContain("do not guess");
  });

  it("keeps only well-formed items and never invents keys", () => {
    const answer = `Here you go:
{"periods":[
  {"organizationName":"INPA","capacity":"researcher","startYear":1994,"endYear":1990,"quote":"worked at INPA"},
  {"organizationName":"Camp 41","capacity":"wizard","startYear":"1988"},
  {"capacity":"researcher"}
],
"colleagues":[
  {"givenName":"Rui","familyName":"Boat","relationshipKind":"mentorship","startYear":1991},
  {"givenName":"Solo","familyName":"","relationshipKind":"mentorship"},
  {"givenName":"Eva","familyName":"Leaf","relationshipKind":"rivalry"}
]}`;
    const r = parseExtraction(answer, caps, kinds);
    expect(r.periods).toEqual([
      { organizationName: "INPA", capacity: "researcher", startYear: 1990, endYear: 1994, isOngoing: false, summary: null, quote: "worked at INPA" },
      { organizationName: "Camp 41", capacity: "other", startYear: 1988, endYear: null, isOngoing: false, summary: null, quote: null },
    ]);
    expect(r.colleagues.map((c) => c.familyName)).toEqual(["Boat"]);
  });

  it("survives an answer that is not JSON", () => {
    expect(parseExtraction("sorry", caps, kinds)).toEqual({ periods: [], colleagues: [] });
    expect(parseExtraction("{broken", caps, kinds)).toEqual({ periods: [], colleagues: [] });
  });
});
