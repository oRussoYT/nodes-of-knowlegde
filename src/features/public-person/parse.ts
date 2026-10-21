// Parser for get_public_person / list_public_people
// (supabase/migrations/20261017120000_add_public_person_pages.sql). Pure;
// unit-tested; fails closed. The participation part reuses the canonical
// participation parser, so a public page and the signed-in page read the
// same shape.

import { parseParticipationDocument } from "@/features/participation/parse";
import type { ParticipationDocument } from "@/features/participation/types";

export interface PublicPerson {
  id: string;
  displayName: string;
  isDeceased: boolean;
  isDemo: boolean;
  isClaimed: boolean;
  publishedAt: string | null;
}

export interface PublicPersonPage {
  person: PublicPerson;
  participation: ParticipationDocument;
}

export interface PublicPersonEntry {
  id: string;
  displayName: string;
  isDemo: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parsePublicPersonPage(input: unknown): PublicPersonPage | null {
  if (!isRecord(input) || !isRecord(input.person)) return null;
  const raw = input.person;
  if (typeof raw.id !== "string" || typeof raw.displayName !== "string" || raw.displayName.trim() === "") return null;
  const participation = parseParticipationDocument(input.participation);
  if (!participation || participation.personId !== raw.id) return null;
  return {
    person: {
      id: raw.id,
      displayName: raw.displayName,
      isDeceased: raw.isDeceased === true,
      isDemo: raw.isDemo === true,
      isClaimed: raw.isClaimed === true,
      publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : null,
    },
    participation,
  };
}

export function parsePublicPeople(input: unknown): PublicPersonEntry[] {
  if (!Array.isArray(input)) return [];
  const out: PublicPersonEntry[] = [];
  for (const row of input) {
    if (!isRecord(row) || typeof row.id !== "string" || typeof row.display_name !== "string") continue;
    out.push({ id: row.id, displayName: row.display_name, isDemo: row.is_demo === true });
  }
  return out;
}
