// OpenAlex lookup for imported graduates (ROTEIRO etapa 4). Pure parts
// (normalize, explain) are unit-tested; the fetch is a thin adapter.
//
// Never a score: each candidate carries the REASONS it was proposed, which the
// steward reads before accepting or rejecting. A candidate with no name reason
// is not proposed at all.

export type ExternalReason =
  | "same_name"
  | "alternative_name"
  | "affiliated_with_importing_institution"
  | "affiliated_around_graduation";

export interface ExternalAffiliation {
  institution: string;
  years: number[];
}

export interface ExternalCandidate {
  externalId: string;
  displayName: string;
  orcid: string | null;
  lastKnownInstitution: string | null;
  lastKnownCountry: string | null;
  /** Sector as OpenAlex classifies the institution (education, company, government, ...). */
  lastKnownType: string | null;
  affiliations: ExternalAffiliation[];
  worksCount: number | null;
  alternatives: string[];
  reasons: ExternalReason[];
}

export interface LookupRow {
  givenName: string;
  familyName: string;
  graduationYear: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Case-, accent- and spacing-insensitive name key ("José  Silva" = "jose silva"). */
export function nameKey(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Normalizes one OpenAlex author object; null if unusable. */
export function normalizeOpenAlexAuthor(raw: unknown): Omit<ExternalCandidate, "reasons"> | null {
  if (!isRecord(raw)) return null;
  const externalId = typeof raw.id === "string" ? raw.id : null;
  const displayName = typeof raw.display_name === "string" ? raw.display_name : null;
  if (!externalId || !displayName) return null;

  const affiliations: ExternalAffiliation[] = Array.isArray(raw.affiliations)
    ? raw.affiliations
        .filter(isRecord)
        .map((a) => {
          const inst = isRecord(a.institution) && typeof a.institution.display_name === "string" ? a.institution.display_name : null;
          const years = Array.isArray(a.years) ? a.years.filter((y): y is number => Number.isInteger(y)) : [];
          return inst ? { institution: inst, years: [...years].sort((x, y) => x - y) } : null;
        })
        .filter((a): a is ExternalAffiliation => a !== null)
    : [];

  const last = Array.isArray(raw.last_known_institutions) && isRecord(raw.last_known_institutions[0]) ? raw.last_known_institutions[0] : null;

  return {
    externalId,
    displayName,
    orcid: typeof raw.orcid === "string" && raw.orcid ? raw.orcid : null,
    lastKnownInstitution: last && typeof last.display_name === "string" ? last.display_name : null,
    lastKnownCountry: last && typeof last.country_code === "string" ? last.country_code : null,
    lastKnownType: last && typeof last.type === "string" ? last.type : null,
    affiliations,
    worksCount: typeof raw.works_count === "number" ? raw.works_count : null,
    alternatives: Array.isArray(raw.display_name_alternatives)
      ? raw.display_name_alternatives.filter((n): n is string => typeof n === "string")
      : [],
  };
}

/** Why a candidate might be this graduate. Empty name reasons = not proposed. */
export function explainCandidate(
  row: LookupRow,
  candidate: Omit<ExternalCandidate, "reasons">,
  importingInstitution: string | null,
): ExternalReason[] {
  const reasons: ExternalReason[] = [];
  const full = nameKey(`${row.givenName} ${row.familyName}`);
  if (nameKey(candidate.displayName) === full) {
    reasons.push("same_name");
  } else if (candidate.alternatives.some((alt) => nameKey(alt) === full)) {
    reasons.push("alternative_name");
  }
  if (reasons.length === 0) return [];

  if (importingInstitution) {
    const target = nameKey(importingInstitution);
    const there = candidate.affiliations.filter((a) => nameKey(a.institution) === target);
    if (there.length > 0) {
      reasons.push("affiliated_with_importing_institution");
      if (row.graduationYear !== null) {
        const gy = row.graduationYear;
        if (there.some((a) => a.years.some((y) => y >= gy - 8 && y <= gy + 1))) {
          reasons.push("affiliated_around_graduation");
        }
      }
    }
  }
  return reasons;
}

/** Turns an OpenAlex /authors response into explained candidates, strongest
 * explanations first (more reasons first, then alphabetical) -- at most 5. */
export function proposeFromOpenAlex(
  response: unknown,
  row: LookupRow,
  importingInstitution: string | null,
): ExternalCandidate[] {
  if (!isRecord(response) || !Array.isArray(response.results)) return [];
  const out: ExternalCandidate[] = [];
  for (const raw of response.results) {
    const candidate = normalizeOpenAlexAuthor(raw);
    if (!candidate) continue;
    const reasons = explainCandidate(row, candidate, importingInstitution);
    if (reasons.length === 0) continue;
    out.push({ ...candidate, reasons });
  }
  return out
    .sort((a, b) => b.reasons.length - a.reasons.length || a.displayName.localeCompare(b.displayName))
    .slice(0, 5);
}

export const REASON_LABELS: Record<ExternalReason, string> = {
  same_name: "Same name",
  alternative_name: "Matches one of their other names",
  affiliated_with_importing_institution: "Affiliated with this institution",
  affiliated_around_graduation: "…around the graduation year",
};

/** Network adapter. Returns null on any failure (the steward can retry). */
export async function searchOpenAlexAuthors(row: LookupRow, signal?: AbortSignal): Promise<unknown | null> {
  const params = new URLSearchParams({ search: `${row.givenName} ${row.familyName}`, "per-page": "10" });
  const mailto = process.env.OPENALEX_MAILTO;
  if (mailto) params.set("mailto", mailto);
  try {
    const response = await fetch(`https://api.openalex.org/authors?${params.toString()}`, {
      signal,
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}
