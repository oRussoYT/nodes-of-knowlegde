// Parser for get_confirmation. Pure; unit-tested; fails closed.

export interface ConfirmationView {
  displayName: string;
  institution: string | null;
  degree: string | null;
  programme: string | null;
  graduationYear: number | null;
  destination: { institution: string; country: string | null; asOfYear: number | null } | null;
  answered: boolean;
  response: "confirmed" | "corrected" | "declined" | null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
const str = (v: unknown) => (typeof v === "string" ? v : null);
const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : null);

export function parseConfirmation(input: unknown): ConfirmationView | null {
  if (!isRecord(input) || typeof input.displayName !== "string") return null;
  const d = isRecord(input.destination) && typeof input.destination.institution === "string" ? input.destination : null;
  const response = input.response === "confirmed" || input.response === "corrected" || input.response === "declined" ? input.response : null;
  return {
    displayName: input.displayName,
    institution: str(input.institution),
    degree: str(input.degree),
    programme: str(input.programme),
    graduationYear: int(input.graduationYear),
    destination: d ? { institution: d.institution as string, country: str(d.country), asOfYear: int(d.asOfYear) } : null,
    answered: input.answered === true,
    response,
  };
}

/** A token as it may appear in a link: letters and digits only, 48–128 long. */
export function isPlausibleToken(token: string): boolean {
  return /^[0-9a-f]{48,128}$/i.test(token);
}
