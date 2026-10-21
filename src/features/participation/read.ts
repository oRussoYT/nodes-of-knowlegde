// Server-only read of a person's participation. Plain async function, called
// directly from the biography Server Component -- the same pattern as
// src/features/biography/read.ts and src/features/timeline/read.ts. Wraps
// public.get_person_participation (the authorization + visibility boundary);
// fails closed to null on any error, missing, or unrecognizable result.

import { createClient } from "@/lib/supabase/server";

import { parseParticipationDocument } from "./parse";
import type { ParticipationDocument } from "./types";

export async function getPersonParticipation(personId: string): Promise<ParticipationDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_person_participation", { p_person_id: personId });

  if (error || data === null || data === undefined) {
    return null;
  }

  return parseParticipationDocument(data);
}
