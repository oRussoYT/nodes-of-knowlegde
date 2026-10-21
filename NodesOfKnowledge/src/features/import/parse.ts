// Defensive parsers for the import read functions. Pure; unit-tested; fail closed.

import type { ImportBatchSummary, ImportCandidate, ImportCandidatesDocument, PendingImportRow } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function candidate(raw: unknown): ImportCandidate | null {
  if (!isRecord(raw)) return null;
  const personId = str(raw.personId);
  const displayName = str(raw.displayName);
  const reason = raw.reason === "same_name" || raw.reason === "same_family_initial" ? raw.reason : null;
  if (!personId || !displayName || !reason) return null;
  return {
    personId,
    displayName,
    reason,
    documentedAtInstitution: raw.documentedAtInstitution === true,
    isDemo: raw.isDemo === true,
  };
}

function pendingRow(raw: unknown): PendingImportRow | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const rowNumber = num(raw.rowNumber);
  const givenName = str(raw.givenName);
  const familyName = str(raw.familyName);
  if (!id || rowNumber === null || !givenName || !familyName) return null;
  const candidates = Array.isArray(raw.candidates)
    ? raw.candidates.map(candidate).filter((c): c is ImportCandidate => c !== null)
    : [];
  return {
    id,
    rowNumber,
    givenName,
    familyName,
    degree: str(raw.degree),
    programme: str(raw.programme),
    graduationYear: num(raw.graduationYear),
    externalRef: str(raw.externalRef),
    candidates,
  };
}

export function parseImportCandidates(input: unknown): ImportCandidatesDocument | null {
  if (!isRecord(input)) return null;
  const batchId = str(input.batchId);
  if (!batchId || !Array.isArray(input.rows)) return null;
  const rows = input.rows.map(pendingRow).filter((r): r is PendingImportRow => r !== null);
  return { batchId, organizationId: str(input.organizationId), rows: rows.sort((a, b) => a.rowNumber - b.rowNumber) };
}

export function parseImportBatches(input: unknown): ImportBatchSummary[] {
  if (!Array.isArray(input)) return [];
  const out: ImportBatchSummary[] = [];
  for (const row of input) {
    if (!isRecord(row)) continue;
    const id = str(row.id);
    const label = str(row.label);
    const createdAt = str(row.created_at);
    const total = num(row.total);
    const pending = num(row.pending);
    const matched = num(row.matched);
    const created = num(row.created);
    const skipped = num(row.skipped);
    if (!id || !label || !createdAt || total === null || pending === null || matched === null || created === null || skipped === null) {
      continue;
    }
    out.push({
      id,
      label,
      organizationId: str(row.organization_id),
      organizationName: str(row.organization_name),
      createdAt,
      total,
      pending,
      matched,
      created,
      skipped,
    });
  }
  return out;
}
