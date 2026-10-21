import { describe, expect, it } from "vitest";

import { buildTimelineView, describeEventProvenance } from "../../src/features/timeline/derive";
import type { TimelineDocument, TimelineEvent } from "../../src/features/timeline/types";

function ev(id: string, startDate: string | null): TimelineEvent {
  return {
    id,
    kind: { key: "other", label: "Event" },
    title: `Event ${id}`,
    summary: null,
    place: null,
    temporal: {
      startDate,
      startPrecision: startDate ? "year" : null,
      endDate: null,
      endPrecision: null,
      isApproximate: false,
      isOngoing: false,
      dateIsUnknown: startDate === null,
      dateIsUncertain: false,
    },
    provenance: { sourceType: "imported_historical", verificationStatus: "provisional" },
  };
}

function doc(events: TimelineEvent[]): TimelineDocument {
  return { personId: "p1", events };
}

describe("buildTimelineView", () => {
  it("is empty for no events", () => {
    const view = buildTimelineView(doc([]));
    expect(view.isEmpty).toBe(true);
    expect(view.periods).toEqual([]);
  });

  it("does not group a single-decade timeline (a short timeline stays uncluttered)", () => {
    const view = buildTimelineView(doc([ev("a", "1987-01-01"), ev("b", "1988-01-01")]));
    expect(view.grouped).toBe(false);
    expect(view.periods.length).toBe(1);
    expect(view.periods[0]?.label).toBe("");
    expect(view.periods[0]?.events.length).toBe(2);
  });

  it("groups by decade when spanning two or more decades (a long timeline stays orientable)", () => {
    const view = buildTimelineView(doc([ev("a", "1987-01-01"), ev("b", "1995-01-01")]));
    expect(view.grouped).toBe(true);
    expect(view.periods.map((period) => period.label)).toEqual(["1980s", "1990s"]);
  });

  it("places undated events in a final Date unknown group, never dropped", () => {
    const view = buildTimelineView(doc([ev("a", "1987-01-01"), ev("u", null)]));
    const last = view.periods[view.periods.length - 1];
    expect(last?.label).toBe("Date unknown");
    expect(last?.events.length).toBe(1);
    expect(view.eventCount).toBe(2);
  });
});

describe("describeEventProvenance", () => {
  it("labels source and verification in plain language", () => {
    expect(describeEventProvenance("imported_historical", "provisional")).toEqual({
      sourceLabel: "Imported from historical records",
      statusLabel: "Awaiting review",
    });
    expect(describeEventProvenance("admin_entered", "verified_admin").statusLabel).toBe("Verified by an administrator");
    expect(describeEventProvenance("self_reported", "disputed").statusLabel).toBe("Disputed");
  });
});
