// AI reading of a document (a CV, a thesis page, a field roster, a photo of
// a list) into PROPOSALS -- never into facts. The model only suggests; every
// item goes to the review queue labelled "Extracted by AI", with the file
// attached so the steward can check it. Uses the Anthropic Messages API over
// fetch (no extra dependency). Off until ANTHROPIC_API_KEY is set.

import { askClaude, claudeIsOn } from "@/lib/ai/claude";

import type { Option } from "./parse";

export const AI_MAX_BYTES = 10 * 1024 * 1024;
export const AI_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp", "text/plain"] as const;

export interface ExtractedPeriod {
  organizationName: string;
  capacity: string;
  startYear: number | null;
  endYear: number | null;
  isOngoing: boolean;
  summary: string | null;
  quote: string | null;
}

export interface ExtractedColleague {
  givenName: string;
  familyName: string;
  relationshipKind: string;
  startYear: number | null;
  endYear: number | null;
  summary: string | null;
  quote: string | null;
}

export interface Extraction {
  periods: ExtractedPeriod[];
  colleagues: ExtractedColleague[];
}

export function aiIsOn(): boolean {
  return claudeIsOn();
}

export function buildPrompt(personName: string, capacities: Option[], kinds: Option[]): string {
  return [
    `You help a scientific-history archive. Read the attached document and list only what it states about ${personName}:`,
    "1) periods at institutions (where, role, years) and 2) people they worked with (name, kind of bond, years).",
    "Rules: do not guess; leave a year null when the document does not give it; copy a short exact quote (max 200 characters) that supports each item.",
    `Allowed role keys: ${capacities.map((c) => c.key).join(", ")}.`,
    `Allowed bond keys: ${kinds.map((k) => k.key).join(", ")}.`,
    'Answer with JSON only, no prose: {"periods":[{"organizationName":"","capacity":"","startYear":null,"endYear":null,"isOngoing":false,"summary":"","quote":""}],',
    '"colleagues":[{"givenName":"","familyName":"","relationshipKind":"","startYear":null,"endYear":null,"summary":"","quote":""}]}',
  ].join("\n");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
function text(v: unknown, max: number): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim().slice(0, max) : null;
}
function yr(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isInteger(n) && n >= 1500 && n <= 2100 ? n : null;
}
function years(a: unknown, b: unknown): { start: number | null; end: number | null } {
  let start = yr(a);
  let end = yr(b);
  if (start !== null && end !== null && end < start) [start, end] = [end, start];
  if (start === null && end !== null) start = end;
  return { start, end };
}

/** Reads the model's answer, keeping only well-formed items with allowed keys. */
export function parseExtraction(answer: string, capacities: Option[], kinds: Option[]): Extraction {
  const start = answer.indexOf("{");
  const end = answer.lastIndexOf("}");
  let raw: unknown = null;
  try {
    raw = start >= 0 && end > start ? JSON.parse(answer.slice(start, end + 1)) : null;
  } catch {
    raw = null;
  }
  if (!isRecord(raw)) return { periods: [], colleagues: [] };
  const capKeys = new Set(capacities.map((c) => c.key));
  const kindKeys = new Set(kinds.map((k) => k.key));
  const periods: ExtractedPeriod[] = Array.isArray(raw.periods)
    ? raw.periods.filter(isRecord).flatMap((p) => {
        const org = text(p.organizationName, 300);
        if (!org) return [];
        const y = years(p.startYear, p.endYear);
        const capacity = typeof p.capacity === "string" && capKeys.has(p.capacity) ? p.capacity : capKeys.has("other") ? "other" : null;
        if (!capacity) return [];
        return [{ organizationName: org, capacity, startYear: y.start, endYear: y.end, isOngoing: p.isOngoing === true && y.end === null && y.start !== null, summary: text(p.summary, 300), quote: text(p.quote, 200) }];
      })
    : [];
  const colleagues: ExtractedColleague[] = Array.isArray(raw.colleagues)
    ? raw.colleagues.filter(isRecord).flatMap((c) => {
        const given = text(c.givenName, 120);
        const family = text(c.familyName, 120);
        const kind = typeof c.relationshipKind === "string" && kindKeys.has(c.relationshipKind) ? c.relationshipKind : null;
        if (!given || !family || !kind) return [];
        const y = years(c.startYear, c.endYear);
        return [{ givenName: given, familyName: family, relationshipKind: kind, startYear: y.start, endYear: y.end, summary: text(c.summary, 300), quote: text(c.quote, 200) }];
      })
    : [];
  return { periods: periods.slice(0, 40), colleagues: colleagues.slice(0, 40) };
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Calls the model. Null when it is off, unreachable or answers nothing usable. */
export async function readDocumentWithAi(file: { bytes: Uint8Array; type: string }, prompt: string): Promise<string | null> {
  if (!aiIsOn()) return null;
  const source =
    file.type === "text/plain"
      ? { type: "text", text: new TextDecoder().decode(file.bytes).slice(0, 200_000) }
      : file.type === "application/pdf"
        ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: toBase64(file.bytes) } }
        : { type: "image", source: { type: "base64", media_type: file.type, data: toBase64(file.bytes) } };
  return askClaude([source, { type: "text", text: prompt }], 4000, 90_000);
}
