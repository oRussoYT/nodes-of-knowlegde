import { describe, expect, it } from "vitest";

import { callFromAi, callsFromGrantsGov, daysLeft, matchReasons, pageText, parseCallForm, parseCalls } from "../../src/features/funding/parse";

function form(fields: Record<string, string | string[]>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) for (const x of Array.isArray(v) ? v : [v]) f.append(k, x);
  return f;
}

describe("calls and grants", () => {
  it("reads calls and says why they match", () => {
    const [c] = parseCalls([
      { id: "1", title: "Amazon grant", url: "https://x.org", funder: "CNPq", reasons: { sharedThemes: ["Forest fragmentation"], country: "BR", careerStage: "early_career" } },
      { id: "2" },
    ]);
    expect(matchReasons(c!)).toEqual(["Shares the theme Forest fragmentation", "Open to applicants in BR", "For early-career researchers"]);
    const [g] = parseCalls([{ id: "1", title: "T", url: "https://x", reasons: { sharedThemes: [{ label: "Ants", people: 3 }], country: "any" } }]);
    expect(matchReasons(g!)).toEqual(["Shares the theme Ants (3 people)", "Open to any country"]);
  });

  it("counts the days to the deadline", () => {
    expect(daysLeft("2026-11-07", new Date(Date.UTC(2026, 9, 28)))).toBe(10);
    expect(daysLeft(null)).toBeNull();
  });

  it("validates the steward form", () => {
    const ok = parseCallForm(form({ title: "A call", funder: "CNPq", url: "https://cnpq.br/x", themes: "ants, bees", eligibleCountries: "br", careerStages: ["student", "nope"] }));
    expect(ok.ok && ok.payload).toEqual(expect.objectContaining({ themes: ["ants", "bees"], eligibleCountries: ["BR"], careerStages: ["student"] }));
    expect(parseCallForm(form({ title: "A call", funder: "CNPq", url: "https://cnpq.br/x", themes: "" })).ok).toBe(false);
    expect(parseCallForm(form({ title: "A call", funder: "CNPq", url: "cnpq.br", themes: "x" })).ok).toBe(false);
    expect(parseCallForm(form({ title: "A call", funder: "CNPq", url: "https://a", themes: "x", eligibleCountries: "Brazil" })).ok).toBe(false);
  });

  it("imports Grants.gov hits with their dates and link", () => {
    const calls = callsFromGrantsGov({ data: { oppHits: [{ id: 123, number: "NSF-1", title: "Tropical forests", agency: "NSF", openDate: "01/15/2026", closeDate: "03/31/2027" }, { title: "no id" }] } }, "tropical forest");
    expect(calls).toEqual([
      expect.objectContaining({ title: "Tropical forests", funder: "NSF", url: "https://www.grants.gov/search-results-detail/123", opensOn: "2026-01-15", closesOn: "2027-03-31", themes: ["tropical forest"], externalId: "123", source: "grants_gov" }),
    ]);
    expect(callsFromGrantsGov(null, "x")).toEqual([]);
  });

  it("keeps only what the AI read safely", () => {
    expect(pageText("<p>Hi <script>x()</script><b>there</b>&amp; you</p>")).toBe("Hi there & you");
    const c = callFromAi({ title: "Call", funder: "FAPEAM", opensOn: "2027-01-01", closesOn: "2026-01-01", themes: ["ants"], eligibleCountries: ["BR", "Brazil"], careerStages: ["any", "x"] }, "https://f.br/c");
    expect(c).toEqual(expect.objectContaining({ opensOn: null, closesOn: "2026-01-01", eligibleCountries: ["BR"], careerStages: ["any"], source: "ai_page" }));
    expect(callFromAi({ title: "No funder" }, "https://x")).toBeNull();
  });
});
