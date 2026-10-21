// Parser for steward_import_external. Pure; unit-tested; fails closed.

import type { ExternalBatchDocument, ExternalRow, StoredExternalMatch } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
const str = (v: unknown) => (typeof v === "string" ? v : null);
const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);

function match(raw: unknown): StoredExternalMatch | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const externalId = str(raw.externalId);
  const displayName = str(raw.displayName);
  const status = raw.status === "proposed" || raw.status === "accepted" || raw.status === "rejected" ? raw.status : null;
  if (!id || !externalId || !displayName || !status || raw.source !== "openalex") return null;
  const affiliations = Array.isArray(raw.affiliations)
    ? raw.affiliations
        .filter(isRecord)
        .map((a) => ({
          institution: str(a.institution) ?? "",
          years: Array.isArray(a.years) ? a.years.filter((y): y is number => Number.isInteger(y)) : [],
        }))
        .filter((a) => a.institution !== "")
    : [];
  return {
    id,
    source: "openalex",
    externalId,
    displayName,
    orcid: str(raw.orcid),
    lastKnownInstitution: str(raw.lastKnownInstitution),
    lastKnownCountry: str(raw.lastKnownCountry),
    affiliations,
    worksCount: int(raw.worksCount),
    reasons: Array.isArray(raw.reasons) ? raw.reasons.filter((r): r is string => typeof r === "string") : [],
    status,
  };
}

function row(raw: unknown): ExternalRow | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const rowNumber = int(raw.rowNumber);
  const givenName = str(raw.givenName);
  const familyName = str(raw.familyName);
  const status =
    raw.status === "pending" || raw.status === "matched" || raw.status === "created" || raw.status === "skipped" ? raw.status : null;
  if (!id || rowNumber === null || !givenName || !familyName || !status) return null;
  return {
    id,
    rowNumber,
    givenName,
    familyName,
    graduationYear: int(raw.graduationYear),
    status,
    personId: str(raw.personId),
    matches: Array.isArray(raw.matches) ? raw.matches.map(match).filter((m): m is StoredExternalMatch => m !== null) : [],
  };
}

export function parseExternalBatch(input: unknown): ExternalBatchDocument | null {
  if (!isRecord(input) || typeof input.batchId !== "string" || !Array.isArray(input.rows)) return null;
  return {
    batchId: input.batchId,
    rows: input.rows.map(row).filter((r): r is ExternalRow => r !== null).sort((a, b) => a.rowNumber - b.rowNumber),
  };
}
