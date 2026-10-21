import { describe, expect, it } from "vitest";

import { parseBiographyDocument } from "../../src/features/biography/parse";

// Coverage for the defensive parser that turns public.get_person_biography's
// untyped jsonb into a typed BiographyDocument, or null. Fails closed: an
// unrecognizable shape must yield null, never a partially-trusted object.

const validRaw = {
  person_id: "11111111-1111-1111-1111-111111111111",
  identity: {
    display_name: "Ada Lovelace",
    given_name: "Ada",
    family_name: "Lovelace",
    preferred_name: null,
    is_deceased: false,
  },
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
  is_claimed: false,
  withheld: ["date_of_birth", "date_of_death"],
  narrative: null,
};

describe("parseBiographyDocument", () => {
  it("parses a valid document and maps snake_case to camelCase", () => {
    const parsed = parseBiographyDocument(validRaw);
    expect(parsed).not.toBeNull();
    expect(parsed?.personId).toBe("11111111-1111-1111-1111-111111111111");
    expect(parsed?.identity.displayName).toBe("Ada Lovelace");
    expect(parsed?.identity.isDeceased).toBe(false);
    expect(parsed?.provenance.sourceType).toBe("imported_historical");
    expect(parsed?.isClaimed).toBe(false);
    expect(parsed?.withheld).toEqual(["date_of_birth", "date_of_death"]);
    expect(parsed?.narrative).toBeNull();
  });

  it("parses a present narrative with its own provenance", () => {
    const parsed = parseBiographyDocument({
      ...validRaw,
      narrative: { body: "A scientific life.", source_type: "admin_entered", verification_status: "provisional" },
    });
    expect(parsed?.narrative?.body).toBe("A scientific life.");
    expect(parsed?.narrative?.sourceType).toBe("admin_entered");
  });

  it("returns null for non-record input", () => {
    expect(parseBiographyDocument(null)).toBeNull();
    expect(parseBiographyDocument("nope")).toBeNull();
    expect(parseBiographyDocument(42)).toBeNull();
    expect(parseBiographyDocument([validRaw])).toBeNull();
  });

  it("returns null when a required identity field is missing or wrong-typed", () => {
    expect(parseBiographyDocument({ ...validRaw, identity: { ...validRaw.identity, display_name: 123 } })).toBeNull();
    const { is_deceased: _omit, ...identityNoDeceased } = validRaw.identity;
    expect(parseBiographyDocument({ ...validRaw, identity: identityNoDeceased })).toBeNull();
  });

  it("returns null for an invalid provenance source_type or verification_status", () => {
    expect(
      parseBiographyDocument({ ...validRaw, provenance: { source_type: "made_up", verification_status: "provisional" } }),
    ).toBeNull();
    expect(
      parseBiographyDocument({ ...validRaw, provenance: { source_type: "admin_entered", verification_status: "nope" } }),
    ).toBeNull();
  });

  it("returns null for a malformed narrative object (distinct from an absent one)", () => {
    expect(parseBiographyDocument({ ...validRaw, narrative: { body: "  ", source_type: "admin_entered", verification_status: "provisional" } })).toBeNull();
    expect(parseBiographyDocument({ ...validRaw, narrative: { body: "ok", source_type: "bad", verification_status: "provisional" } })).toBeNull();
  });

  it("tolerates a missing/!array withheld list as empty rather than failing", () => {
    const { withheld: _drop, ...noWithheld } = validRaw;
    expect(parseBiographyDocument(noWithheld)?.withheld).toEqual([]);
  });
});
