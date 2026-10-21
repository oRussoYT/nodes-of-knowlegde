// Server-only read of a person's timeline. Plain async function, called
// directly from the biography Server Component -- the same pattern as
// src/features/biography/read.ts. Wraps public.get_person_timeline (the
// authorization + visibility boundary); fails closed to null on any error,
// missing, or unrecognizable result.

import { createClient } from "@/lib/supabase/server";

import { parseTimelineDocument } from "./parse";
import type { TimelineDocument } from "./types";

export async function getPersonTimeline(personId: string): Promise<TimelineDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_person_timeline", { p_person_id: personId });

  if (error || data === null || data === undefined) {
    return null;
  }

  return parseTimelineDocument(data);
}
