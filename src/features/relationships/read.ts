// Server-only read of a person's relationships. Plain async function, called
// directly from the biography Server Component -- the same pattern as the
// biography/timeline/participation reads. Wraps
// public.get_person_relationships (the authorization + visibility boundary);
// fails closed to null on any error, missing, or unrecognizable result.

import { createClient } from "@/lib/supabase/server";

import { parseRelationshipDocument } from "./parse";
import type { RelationshipDocument } from "./types";

export async function getPersonRelationships(personId: string): Promise<RelationshipDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_person_relationships", { p_person_id: personId });

  if (error || data === null || data === undefined) {
    return null;
  }

  return parseRelationshipDocument(data);
}
