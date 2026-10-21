import { describe, expect, it } from "vitest";

import { parseTimelineDocument } from "../../src/features/timeline/parse";

const validEvent = {
  id: "e1",
  kind: { key: "publication", label: "Publication" },
  title: "A paper",
  summary: null,
  place: null,
  temporal: {
    start_date: "1987-01-01",
    start_precision: "year",
    end_date: null,
    end_precision: null,
    is_approximate: false,
    is_ongoing: false,
    date_is_unknown: false,
    date_is_uncertain: false,
  },
  provenance: { source_type: "imported_historical", verification_status: "provisional" },
};

describe("parseTimelineDocument", () => {
  it("parses a valid document and maps snake_case temporal to camelCase", () => {
    const parsed = parseTimelineDocument({ person_id: "p1", events: [validEvent] });
    expect(parsed?.personId).toBe("p1");
    expect(parsed?.events.length).toBe(1);
    expect(parsed?.events[0]?.temporal.startPrecision).toBe("year");
    expect(parsed?.events[0]?.provenance.sourceType).toBe("imported_historical");
    expect(parsed?.events[0]?.kind.label).toBe("Publication");
  });

  it("returns an empty events array for a person with none", () => {
    expect(parseTimelineDocument({ person_id: "p1", events: [] })?.events).toEqual([]);
  });

  it("returns null for non-record input or a missing person_id / events", () => {
    expect(parseTimelineDocument(null)).toBeNull();
    expect(parseTimelineDocument({ events: [] })).toBeNull();
    expect(parseTimelineDocument({ person_id: "p1" })).toBeNull();
  });

  it("drops a malformed event but keeps the rest (fail-closed per event)", () => {
    const parsed = parseTimelineDocument({
      person_id: "p1",
      events: [validEvent, { id: "bad" }, { ...validEvent, id: "e2" }],
    });
    expect(parsed?.events.length).toBe(2);
    expect(parsed?.events.map((event) => event.id)).toEqual(["e1", "e2"]);
  });

  it("drops an event with an invalid provenance vocabulary value", () => {
    const bad = { ...validEvent, id: "e3", provenance: { source_type: "made_up", verification_status: "provisional" } };
    expect(parseTimelineDocument({ person_id: "p1", events: [bad] })?.events.length).toBe(0);
  });
});
