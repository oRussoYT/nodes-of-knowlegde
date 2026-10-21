// Defensive parsers for the steward console read functions. Pure; unit-tested.
// Fail closed: an unrecognizable document becomes null (the page then shows an
// honest "could not be read" state); malformed list items are dropped.

import type {
  AttentionDuplicateGroup,
  AttentionPerson,
  AttentionSection,
  AttentionUndated,
  CorpusDecade,
  CountMap,
  DemoSummary,
  StewardAttention,
  StewardOverview,
  StewardScope,
} from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  return null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function counts(value: unknown): CountMap {
  const out: CountMap = {};
  if (!isRecord(value)) return out;
  for (const [key, raw] of Object.entries(value)) {
    const n = num(raw);
    if (n !== null) out[key] = n;
  }
  return out;
}

function nums<K extends string>(value: unknown, keys: readonly K[]): Record<K, number> | null {
  if (!isRecord(value)) return null;
  const out = {} as Record<K, number>;
  for (const key of keys) {
    const n = num(value[key]);
    if (n === null) return null;
    out[key] = n;
  }
  return out;
}

export function parseStewardOverview(input: unknown): StewardOverview | null {
  if (!isRecord(input)) return null;
  const people = nums(input.people, ["total", "merged", "claimed", "deceased"] as const);
  const organizations = nums(input.organizations, ["total"] as const);
  const participations = nums(input.participations, ["total", "undated", "approximate", "unconfirmed", "ongoing"] as const);
  const relationships = nums(input.relationships, ["total"] as const);
  const contributions = nums(input.contributions, ["total"] as const);
  const claimsAwaitingReview = num(input.claimsAwaitingReview);
  if (!people || !organizations || !participations || !relationships || !contributions || claimsAwaitingReview === null) {
    return null;
  }
  const rawPeople = input.people as Record<string, unknown>;
  const rawOrgs = input.organizations as Record<string, unknown>;
  return {
    people: { ...people, byVerification: counts(rawPeople.byVerification), bySource: counts(rawPeople.bySource) },
    organizations: { ...organizations, byVerification: counts(rawOrgs.byVerification) },
    participations,
    relationships,
    contributions,
    claimsAwaitingReview,
  };
}

function section<T>(value: unknown, item: (raw: unknown) => T | null): AttentionSection<T> | null {
  if (!isRecord(value)) return null;
  const total = num(value.total);
  if (total === null || !Array.isArray(value.items)) return null;
  const items: T[] = [];
  for (const raw of value.items) {
    const parsed = item(raw);
    if (parsed !== null) items.push(parsed);
  }
  return { total, items };
}

function person(raw: unknown): AttentionPerson | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const displayName = str(raw.displayName);
  return id && displayName ? { id, displayName } : null;
}

function undated(raw: unknown): AttentionUndated | null {
  if (!isRecord(raw)) return null;
  const id = str(raw.id);
  const personId = str(raw.personId);
  const personDisplayName = str(raw.personDisplayName);
  const organizationId = str(raw.organizationId);
  const organizationName = str(raw.organizationName);
  const capacity = str(raw.capacity);
  if (!id || !personId || !personDisplayName || !organizationId || !organizationName || !capacity) return null;
  return { id, personId, personDisplayName, organizationId, organizationName, capacity };
}

function duplicateGroup(raw: unknown): AttentionDuplicateGroup | null {
  if (!isRecord(raw)) return null;
  const nameKey = str(raw.nameKey);
  if (!nameKey || !Array.isArray(raw.people)) return null;
  const people = raw.people.map(person).filter((p): p is AttentionPerson => p !== null);
  return people.length > 1 ? { nameKey, people } : null;
}

export function parseStewardAttention(input: unknown): StewardAttention | null {
  if (!isRecord(input)) return null;
  const peopleWithoutParticipation = section(input.peopleWithoutParticipation, person);
  const undatedParticipations = section(input.undatedParticipations, undated);
  const possibleDuplicates = section(input.possibleDuplicates, duplicateGroup);
  if (!peopleWithoutParticipation || !undatedParticipations || !possibleDuplicates) return null;
  return { peopleWithoutParticipation, undatedParticipations, possibleDuplicates };
}

export function parseCorpusTimeline(input: unknown): CorpusDecade[] {
  if (!Array.isArray(input)) return [];
  const out: CorpusDecade[] = [];
  for (const row of input) {
    if (!isRecord(row)) continue;
    const decade = num(row.decade);
    const participationsStarting = num(row.participations_starting);
    const peopleStarting = num(row.people_starting);
    if (decade === null || participationsStarting === null || peopleStarting === null) continue;
    out.push({ decade, participationsStarting, peopleStarting });
  }
  return out.sort((a, b) => a.decade - b.decade);
}

export function parseDemoSummary(input: unknown): DemoSummary | null {
  if (!isRecord(input)) return null;
  const keys = ["demo", "real"] as const;
  const people = nums(input.people, keys);
  const organizations = nums(input.organizations, keys);
  const contributions = nums(input.contributions, keys);
  const events = nums(input.events, keys);
  if (!people || !organizations || !contributions || !events) return null;
  return { people, organizations, contributions, events };
}

export function parseStewardScope(input: unknown): StewardScope {
  if (!isRecord(input)) return { platform: false, organizations: [] };
  const organizations = Array.isArray(input.organizations)
    ? input.organizations
        .filter(isRecord)
        .map((o) => ({ id: str(o.id), name: str(o.name) }))
        .filter((o): o is { id: string; name: string } => o.id !== null && o.name !== null)
    : [];
  return { platform: input.platform === true, organizations };
}
