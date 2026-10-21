import { describe, expect, it } from "vitest";

import {
  deriveClaimState,
  deriveNarrativeState,
  describeProvenance,
  primaryName,
} from "../../src/features/biography/derive";
import type { BiographyDocument } from "../../src/features/biography/types";

function doc(overrides: Partial<BiographyDocument> = {}): BiographyDocument {
  return {
    personId: "p1",
    identity: { displayName: "Ada Lovelace", givenName: "Ada", familyName: "Lovelace", preferredName: null, isDeceased: false },
    provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
    isClaimed: false,
    withheld: ["date_of_birth", "date_of_death"],
    narrative: null,
    ...overrides,
  };
}

describe("deriveClaimState", () => {
  it("maps each verification status to a calm, honest label and tone", () => {
    expect(deriveClaimState(doc({ provenance: { sourceType: "self_reported", verificationStatus: "verified_self" } })).tone).toBe("success");
    expect(deriveClaimState(doc({ provenance: { sourceType: "admin_entered", verificationStatus: "verified_admin" } })).tone).toBe("success");
    expect(deriveClaimState(doc({ provenance: { sourceType: "self_reported", verificationStatus: "claim_pending" } })).tone).toBe("info");
    // provisional is neutral, never alarming; disputed is a warning, never danger.
    expect(deriveClaimState(doc({ provenance: { sourceType: "imported_historical", verificationStatus: "provisional" } })).tone).toBe("neutral");
    expect(deriveClaimState(doc({ provenance: { sourceType: "admin_entered", verificationStatus: "disputed" } })).tone).toBe("warning");
    expect(deriveClaimState(doc()).label).toBe("Provisional record");
  });

  it("never uses a danger/error tone for any state", () => {
    for (const status of ["provisional", "claim_pending", "verified_self", "verified_admin", "disputed"] as const) {
      expect(deriveClaimState(doc({ provenance: { sourceType: "admin_entered", verificationStatus: status } })).tone).not.toBe("danger");
    }
  });
});

describe("deriveNarrativeState", () => {
  it("is curated when a non-empty narrative is present", () => {
    const state = deriveNarrativeState(doc({ narrative: { body: "A life.", sourceType: "admin_entered", verificationStatus: "provisional" } }));
    expect(state.kind).toBe("curated");
    expect(state.body).toBe("A life.");
  });

  it("is absent when there is no narrative, or a blank one", () => {
    expect(deriveNarrativeState(doc()).kind).toBe("absent");
    expect(deriveNarrativeState(doc({ narrative: { body: "   ", sourceType: "admin_entered", verificationStatus: "provisional" } })).kind).toBe("absent");
  });
});

describe("describeProvenance", () => {
  it("labels every source type and verification status in plain language", () => {
    expect(describeProvenance("self_reported", "verified_self")).toEqual({ sourceLabel: "Self-provided", statusLabel: "Verified by the person" });
    expect(describeProvenance("imported_historical", "provisional").sourceLabel).toBe("Imported from historical records");
    expect(describeProvenance("admin_entered", "disputed").statusLabel).toBe("Disputed");
  });
});

describe("primaryName", () => {
  it("returns the display name", () => {
    expect(primaryName(doc())).toBe("Ada Lovelace");
  });
});
