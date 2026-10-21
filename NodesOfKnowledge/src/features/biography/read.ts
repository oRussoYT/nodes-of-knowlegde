// Server-only read of a person's Scientific Biography. Plain async function
// (not a Server Action), called directly from the biography Server Component
// -- the same pattern as src/features/review/queue.ts and
// src/features/identity/status.ts.
//
// Wraps public.get_person_biography (supabase/migrations/
// 20260803090000_add_scientific_biography_foundation.sql) -- itself the
// authorization + visibility boundary (SECURITY DEFINER, authenticated-only,
// conservative withholding). This module performs NO authorization of its
// own; it fails closed to null (the page renders an honest not-found) on any
// error, missing, or unrecognizable result.

import { createClient } from "@/lib/supabase/server";

import { parseBiographyDocument } from "./parse";
import type { BiographyDocument } from "./types";

export async function getPersonBiography(personId: string): Promise<BiographyDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_person_biography", { p_person_id: personId });

  if (error || data === null || data === undefined) {
    return null;
  }

  return parseBiographyDocument(data);
}
