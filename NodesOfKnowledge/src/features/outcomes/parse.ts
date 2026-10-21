// Parsers and CSV writer for the outcomes panel. Pure; unit-tested; fail closed.

import type { OutcomeExportRow, OutcomeFilters, OutcomesDocument } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}
const str = (v: unknown) => (typeof v === "string" ? v : null);
const list = (v: unknown) => (Array.isArray(v) ? v.filter(isRecord) : []);

export function parseOutcomes(input: unknown): OutcomesDocument | null {
  if (!isRecord(input) || !isRecord(input.totals) || !isRecord(input.timeSaved)) return null;
  const organizationId = str(input.organizationId);
  const t = input.totals;
  const graduates = num(t.graduates), found = num(t.found), probable = num(t.probable), needsPerson = num(t.needsPerson);
  if (!organizationId || graduates === null || found === null || probable === null || needsPerson === null) return null;
  const ts = input.timeSaved;
  const f = isRecord(input.filters) ? input.filters : {};
  return {
    organizationId,
    filters: { programme: str(f.programme), fromYear: num(f.fromYear), toYear: num(f.toYear) },
    totals: { graduates, found, probable, needsPerson, demo: num(t.demo) ?? 0 },
    timeSaved: {
      minutesPerPerson: num(ts.minutesPerPerson) ?? 10,
      minutes: num(ts.minutes) ?? 0,
      minutesRemaining: num(ts.minutesRemaining) ?? 0,
      basis: str(ts.basis) ?? "",
    },
    byYear: list(input.byYear).map((r) => ({ year: num(r.year), graduates: num(r.graduates) ?? 0, found: num(r.found) ?? 0 })),
    byProgramme: list(input.byProgramme).map((r) => ({ programme: str(r.programme), graduates: num(r.graduates) ?? 0, found: num(r.found) ?? 0 })),
    byDegree: list(input.byDegree).map((r) => ({ degree: str(r.degree), graduates: num(r.graduates) ?? 0, found: num(r.found) ?? 0 })),
    bySector: list(input.bySector).map((r) => ({ sector: str(r.sector) ?? "unknown", people: num(r.people) ?? 0 })),
    byCountry: list(input.byCountry).map((r) => ({ country: str(r.country), people: num(r.people) ?? 0 })),
    destinations: list(input.destinations)
      .map((r) => ({ institution: str(r.institution) ?? "", people: num(r.people) ?? 0 }))
      .filter((r) => r.institution !== ""),
    programmes: Array.isArray(input.programmes) ? input.programmes.filter((p): p is string => typeof p === "string") : [],
  };
}

export function parseOutcomeExport(input: unknown): OutcomeExportRow[] {
  return list(input)
    .map((r) => ({
      personId: str(r.person_id) ?? "",
      displayName: str(r.display_name) ?? "",
      graduationYear: num(r.graduation_year),
      programme: str(r.programme),
      degree: str(r.degree),
      status: str(r.status) ?? "",
      destinationInstitution: str(r.destination_institution),
      destinationType: str(r.destination_type),
      destinationCountry: str(r.destination_country),
      destinationYear: num(r.destination_year),
      destinationSource: str(r.destination_source),
      confirmedAt: str(r.confirmed_at),
      orcid: str(r.orcid),
      isDemo: r.is_demo === true,
    }))
    .filter((r) => r.personId !== "" && r.displayName !== "");
}

const STATUS_LABEL: Record<string, string> = { found: "Found", probable: "Probable", needs_person: "Needs a person" };

function cell(value: string | number | boolean | null): string {
  const text = value === null ? "" : String(value);
  // Quote when needed; neutralise spreadsheet formulas (=, +, -, @ at the start).
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return /[",\n\r;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV for the institution's own reports, one line per graduate, with provenance. */
export function outcomesToCsv(rows: OutcomeExportRow[]): string {
  const header = [
    "Name", "Graduation year", "Programme", "Degree", "Status", "Destination institution", "Destination sector",
    "Destination country", "As of year", "Source", "Confirmed at", "ORCID", "Demonstration record",
  ];
  const lines = rows.map((r) =>
    [
      r.displayName, r.graduationYear, r.programme, r.degree, STATUS_LABEL[r.status] ?? r.status,
      r.destinationInstitution, r.destinationType, r.destinationCountry, r.destinationYear, r.destinationSource,
      r.confirmedAt, r.orcid, r.isDemo ? "yes" : "no",
    ].map(cell).join(","),
  );
  return "﻿" + [header.map(cell).join(","), ...lines].join("\r\n") + "\r\n";
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  return hours < 10 ? `${hours.toFixed(1).replace(/\.0$/, "")} h` : `${Math.round(hours)} h`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Reads org + filters from URL search params, ignoring anything malformed. */
export function readOutcomeParams(get: (key: string) => string | null): { org: string | null; filters: OutcomeFilters } {
  const org = get("org");
  const year = (v: string | null) => (v && /^\d{4}$/.test(v) ? Number(v) : undefined);
  const programme = get("programme")?.trim();
  return {
    org: org && UUID.test(org) ? org : null,
    filters: { programme: programme || undefined, fromYear: year(get("from")), toYear: year(get("to")) },
  };
}
