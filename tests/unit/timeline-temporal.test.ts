import { describe, expect, it } from "vitest";

import { formatPoint, formatTemporal } from "../../src/features/timeline/temporal";
import type { EventTemporal } from "../../src/features/timeline/types";

function t(over: Partial<EventTemporal> = {}): EventTemporal {
  return {
    startDate: null,
    startPrecision: null,
    endDate: null,
    endPrecision: null,
    isApproximate: false,
    isOngoing: false,
    dateIsUnknown: false,
    dateIsUncertain: false,
    ...over,
  };
}

describe("formatPoint", () => {
  it("formats each precision without inventing precision it does not have", () => {
    expect(formatPoint("1987-06-15", "day")).toBe("15 June 1987");
    expect(formatPoint("1987-06-01", "month")).toBe("June 1987");
    expect(formatPoint("1987-01-01", "year")).toBe("1987");
    expect(formatPoint("1987-01-01", "decade")).toBe("1980s");
  });
});

describe("formatTemporal — the nine temporal states, kept distinct", () => {
  it("1. exact date", () => {
    const d = formatTemporal(t({ startDate: "1987-06-15", startPrecision: "day" }));
    expect(d.label).toBe("15 June 1987");
    expect(d.kind).toBe("exact");
    expect(d.isInterval).toBe(false);
  });

  it("2. month precision", () => {
    const d = formatTemporal(t({ startDate: "1987-06-01", startPrecision: "month" }));
    expect(d.label).toBe("June 1987");
    expect(d.kind).toBe("month");
  });

  it("3. year precision", () => {
    expect(formatTemporal(t({ startDate: "1987-01-01", startPrecision: "year" })).label).toBe("1987");
  });

  it("4. approximate (circa)", () => {
    const d = formatTemporal(t({ startDate: "1987-01-01", startPrecision: "year", isApproximate: true }));
    expect(d.label).toBe("c. 1987");
    expect(d.isApproximate).toBe(true);
    expect(d.certaintyNote).toBe("Approximate date.");
  });

  it("5. date range", () => {
    const d = formatTemporal(t({ startDate: "1987-01-01", startPrecision: "year", endDate: "1991-01-01", endPrecision: "year" }));
    expect(d.label).toBe("1987 – 1991");
    expect(d.kind).toBe("range");
    expect(d.isInterval).toBe(true);
  });

  it("6. approximate range", () => {
    const d = formatTemporal(
      t({ startDate: "1987-01-01", startPrecision: "year", endDate: "1992-01-01", endPrecision: "decade", isApproximate: true }),
    );
    expect(d.label).toBe("c. 1987 – 1990s");
    expect(d.isApproximate).toBe(true);
    expect(d.isInterval).toBe(true);
  });

  it("7. open-ended (present)", () => {
    const d = formatTemporal(t({ startDate: "1987-01-01", startPrecision: "year", isOngoing: true }));
    expect(d.label).toBe("1987 – present");
    expect(d.kind).toBe("ongoing");
    expect(d.isInterval).toBe(true);
  });

  it("8. unknown date (undated) is its own state, never hidden", () => {
    const d = formatTemporal(t({ dateIsUnknown: true }));
    expect(d.label).toBe("Date unknown");
    expect(d.kind).toBe("unknown");
    expect(d.isUnknown).toBe(true);
  });

  it("9. uncertain date (proposed, unconfirmed)", () => {
    const d = formatTemporal(t({ startDate: "1987-01-01", startPrecision: "year", dateIsUncertain: true }));
    expect(d.label).toBe("1987");
    expect(d.isUncertain).toBe(true);
    expect(d.certaintyNote).toBe("Proposed date, not yet confirmed.");
  });

  it("keeps imprecision, approximation, uncertainty, and missing DISTINCT", () => {
    const approx = formatTemporal(t({ startDate: "1987-01-01", startPrecision: "year", isApproximate: true }));
    const uncertain = formatTemporal(t({ startDate: "1987-01-01", startPrecision: "year", dateIsUncertain: true }));
    const unknown = formatTemporal(t({ dateIsUnknown: true }));
    expect(approx.isApproximate && !approx.isUncertain && !approx.isUnknown).toBe(true);
    expect(uncertain.isUncertain && !uncertain.isApproximate && !uncertain.isUnknown).toBe(true);
    expect(unknown.isUnknown && !unknown.isApproximate && !unknown.isUncertain).toBe(true);
    // Approximate + uncertain combine into a distinct note, not a merged concept.
    const both = formatTemporal(t({ startDate: "1987-01-01", startPrecision: "year", isApproximate: true, dateIsUncertain: true }));
    expect(both.certaintyNote).toBe("Approximate and unconfirmed date.");
  });
});
