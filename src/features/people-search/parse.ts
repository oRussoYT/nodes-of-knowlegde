// People search results (search_people). Pure parsing -- unit-tested.
// Alphabetical as the database returns them; never ranked.

export interface LastInstitution {
  organizationId: string;
  name: string;
  status: string | null;
  fromYear: number | null;
  toYear: number | null;
  ongoing: boolean;
}

export interface PersonSearchResult {
  id: string;
  displayName: string;
  verificationStatus: string;
  isDeceased: boolean;
  lastInstitution: LastInstitution | null;
  institutionsCount: number;
  worksCount: number;
  hasAccount: boolean;
  acceptsMessages: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function int(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function parseInstitution(raw: unknown): LastInstitution | null {
  if (!isRecord(raw) || typeof raw.organizationId !== "string" || typeof raw.name !== "string") return null;
  return {
    organizationId: raw.organizationId,
    name: raw.name,
    status: typeof raw.status === "string" ? raw.status : null,
    fromYear: int(raw.fromYear),
    toYear: int(raw.toYear),
    ongoing: raw.ongoing === true,
  };
}

export function parseSearchResults(data: unknown): PersonSearchResult[] {
  if (!Array.isArray(data)) return [];
  const out: PersonSearchResult[] = [];
  for (const raw of data) {
    if (!isRecord(raw) || typeof raw.id !== "string" || typeof raw.displayName !== "string") continue;
    out.push({
      id: raw.id,
      displayName: raw.displayName,
      verificationStatus: typeof raw.verificationStatus === "string" ? raw.verificationStatus : "provisional",
      isDeceased: raw.isDeceased === true,
      lastInstitution: parseInstitution(raw.lastInstitution),
      institutionsCount: int(raw.institutionsCount) ?? 0,
      worksCount: int(raw.worksCount) ?? 0,
      hasAccount: raw.hasAccount === true,
      acceptsMessages: raw.acceptsMessages === true,
    });
  }
  return out;
}

const CLOSED = new Set(["closed", "historical", "merged", "absorbed", "succeeded", "dormant"]);

/** "McGill University, 2016–2018", "INPA, since 1985", "Old Institute (closed), 1979–1992". */
export function describeLastInstitution(inst: LastInstitution): string {
  const name = inst.status && CLOSED.has(inst.status) ? `${inst.name} (no longer active)` : inst.name;
  if (inst.ongoing && inst.fromYear) return `${name}, since ${inst.fromYear}`;
  if (inst.fromYear && inst.toYear && inst.toYear !== inst.fromYear) return `${name}, ${inst.fromYear}–${inst.toYear}`;
  if (inst.fromYear) return `${name}, ${inst.fromYear}`;
  return name;
}

/** Search text from the address bar, trimmed and bounded. */
export function cleanQuery(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 100) : "";
}
