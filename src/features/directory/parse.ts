// Defensive parsers: untyped list_* rows -> typed directory entries, or an
// empty list on an unrecognizable shape. Pure; unit-tested. Fails closed.
// Individual malformed rows are dropped; the rest of the listing still reads.

import type {
  ContributionIndexEntry,
  InstitutionIndexEntry,
  PersonIndexEntry,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}
function asBoolean(value: unknown): boolean {
  return value === true;
}

export function parsePeopleIndex(input: unknown): PersonIndexEntry[] {
  if (!Array.isArray(input)) return [];
  const out: PersonIndexEntry[] = [];
  for (const row of input) {
    if (!isRecord(row)) continue;
    const id = asString(row.id);
    const displayName = asString(row.display_name);
    const verificationStatus = asString(row.verification_status);
    if (!id || !displayName || !verificationStatus) continue;
    out.push({ id, displayName, verificationStatus, isDeceased: asBoolean(row.is_deceased) });
  }
  return out;
}

export function parseInstitutionsIndex(input: unknown): InstitutionIndexEntry[] {
  if (!Array.isArray(input)) return [];
  const out: InstitutionIndexEntry[] = [];
  for (const row of input) {
    if (!isRecord(row)) continue;
    const id = asString(row.id);
    const name = asString(row.name);
    const status = asString(row.status);
    const verificationStatus = asString(row.verification_status);
    if (!id || !name || !status || !verificationStatus) continue;
    out.push({
      id,
      name,
      shortName: asString(row.short_name),
      typeLabel: asString(row.organization_type_label),
      status,
      verificationStatus,
    });
  }
  return out;
}

export function parseContributionsIndex(input: unknown): ContributionIndexEntry[] {
  if (!Array.isArray(input)) return [];
  const out: ContributionIndexEntry[] = [];
  for (const row of input) {
    if (!isRecord(row)) continue;
    const id = asString(row.id);
    const title = asString(row.title);
    const verificationStatus = asString(row.verification_status);
    if (!id || !title || !verificationStatus) continue;
    out.push({
      id,
      title,
      kindLabel: asString(row.contribution_kind_label),
      verificationStatus,
    });
  }
  return out;
}
