// Parser for my_suggestions (PRODUTO.md screen 11). Pure; unit-tested.
// A suggestion always carries its reasons; a suggestion without one is dropped.

export type SuggestionReason =
  | { kind: "same_place_same_time"; institution: string; fromYear: number | null; toYear: number | null }
  | { kind: "same_mentor"; mentor: string };

export interface Suggestion {
  personId: string;
  displayName: string;
  reasons: SuggestionReason[];
}

export interface SuggestionsDocument {
  linked: boolean;
  optedOut: boolean;
  suggestions: Suggestion[];
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);

function reason(raw: unknown): SuggestionReason | null {
  if (!isRecord(raw)) return null;
  if (raw.kind === "same_place_same_time" && typeof raw.institution === "string") {
    return { kind: "same_place_same_time", institution: raw.institution, fromYear: int(raw.fromYear), toYear: int(raw.toYear) };
  }
  if (raw.kind === "same_mentor" && typeof raw.mentor === "string") {
    return { kind: "same_mentor", mentor: raw.mentor };
  }
  return null;
}

export function parseSuggestions(input: unknown): SuggestionsDocument {
  if (!isRecord(input)) return { linked: false, optedOut: false, suggestions: [] };
  const suggestions = Array.isArray(input.suggestions)
    ? input.suggestions
        .filter(isRecord)
        .map((s) => ({
          personId: typeof s.personId === "string" ? s.personId : "",
          displayName: typeof s.displayName === "string" ? s.displayName : "",
          reasons: Array.isArray(s.reasons) ? s.reasons.map(reason).filter((r): r is SuggestionReason => r !== null) : [],
        }))
        .filter((s) => s.personId && s.displayName && s.reasons.length > 0)
    : [];
  return { linked: typeof input.personId === "string", optedOut: input.optedOut === true, suggestions };
}

export function describeReason(r: SuggestionReason): string {
  if (r.kind === "same_mentor") return `Also trained by ${r.mentor}`;
  const years =
    r.fromYear && r.toYear ? (r.fromYear === r.toYear ? ` in ${r.fromYear}` : ` in ${r.fromYear}–${r.toYear}`) : "";
  return `Both documented at ${r.institution}${years}`;
}
