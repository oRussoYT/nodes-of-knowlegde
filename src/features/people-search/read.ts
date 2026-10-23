import { createClient } from "@/lib/supabase/server";

import { parseSearchResults, type PersonSearchResult } from "./parse";

/** Signed-in search by a person's or an institution's name (alphabetical). */
export async function searchPeople(query: string): Promise<PersonSearchResult[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_people", { p_query: query || null });
  return error ? [] : parseSearchResults(data);
}
