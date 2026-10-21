import { describe, expect, it } from "vitest";

import { isPlausibleToken, parseConfirmation } from "../../src/features/confirm/parse";
import { parsePublicProgramme, parsePublicProgrammes, programmePath } from "../../src/features/programmes/parse";
import { describeReason, parseSuggestions } from "../../src/features/suggestions/parse";

describe("confirmation", () => {
  it("accepts only long hexadecimal tokens", () => {
    expect(isPlausibleToken("a".repeat(64))).toBe(true);
    expect(isPlausibleToken("short")).toBe(false);
    expect(isPlausibleToken("../../etc/passwd" + "a".repeat(60))).toBe(false);
  });

  it("parses what the record says about one person", () => {
    const view = parseConfirmation({
      displayName: "Gia Ronde", institution: "Confirm University", degree: "PhD", programme: "Ecology", graduationYear: 2014,
      destination: { institution: "Delta Labs", country: "CA", asOfYear: 2024 }, answered: false, response: null,
    });
    expect(view?.destination?.institution).toBe("Delta Labs");
    expect(view?.answered).toBe(false);
  });

  it("fails closed for an invalid link", () => {
    expect(parseConfirmation(null)).toBeNull();
  });
});

describe("public programmes", () => {
  it("parses aggregates and never needs a name", () => {
    const page = parsePublicProgramme({
      organizationId: "o1", organizationName: "Confirm University", programme: "Ecology", graduates: 12, known: 7,
      firstYear: 2010, lastYear: 2024, demo: 0,
      bySector: [{ sector: "education", people: 5 }], byCountry: [{ country: "BR", people: 4 }],
      byDecade: [{ decade: 2010, graduates: 12 }], destinations: [{ institution: "Delta Labs", people: 2 }, { institution: "", people: 1 }],
    });
    expect(page?.known).toBe(7);
    expect(page?.destinations).toEqual([{ institution: "Delta Labs", people: 2 }]);
  });

  it("fails closed when unpublished (null)", () => {
    expect(parsePublicProgramme(null)).toBeNull();
  });

  it("lists programmes and builds safe addresses", () => {
    expect(parsePublicProgrammes([{ organization_id: "o1", organization_name: "U", programme: "Ecology & Evolution", graduates: 3 }, {}])).toHaveLength(1);
    expect(programmePath("o1", "Ecology & Evolution")).toBe("/programmes/o1/Ecology%20%26%20Evolution");
  });
});

describe("suggestions", () => {
  it("keeps only suggestions that say why", () => {
    const doc = parseSuggestions({
      personId: "me", optedOut: false,
      suggestions: [
        { personId: "p1", displayName: "Pat Peer", reasons: [{ kind: "same_place_same_time", institution: "Elsewhere College", fromYear: 2002, toYear: 2004 }] },
        { personId: "p2", displayName: "No Reason", reasons: [{ kind: "similarity_score", value: 0.9 }] },
      ],
    });
    expect(doc.linked).toBe(true);
    expect(doc.suggestions.map((s) => s.personId)).toEqual(["p1"]);
  });

  it("describes reasons in plain words", () => {
    expect(describeReason({ kind: "same_place_same_time", institution: "Elsewhere College", fromYear: 2002, toYear: 2004 }))
      .toBe("Both documented at Elsewhere College in 2002–2004");
    expect(describeReason({ kind: "same_mentor", mentor: "Max Mentor" })).toBe("Also trained by Max Mentor");
  });

  it("is empty and unlinked on an unreadable result", () => {
    expect(parseSuggestions(null)).toEqual({ linked: false, optedOut: false, suggestions: [] });
  });
});
