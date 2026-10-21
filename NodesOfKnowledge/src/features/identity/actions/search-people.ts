"use server";

// Claim-discovery search/browse — see docs/decisions/
// 0008-claim-discovery-security-definer-function.md. Calls the narrow
// search_claimable_people() database function; never queries `people`
// directly (there is no client-reachable grant to do so).

import { createClient } from "@/lib/supabase/server";

import { normalizeSearchQuery } from "../validation";
import type { SearchPeopleActionState } from "./state";

export async function searchPeopleAction(
  _prevState: SearchPeopleActionState,
  formData: FormData,
): Promise<SearchPeopleActionState> {
  const query = normalizeSearchQuery(formData.get("query"));

  const supabase = await createClient();

  // p_query is a free-text string the caller typed — never an id, never
  // account/session data. The function itself is what enforces
  // authentication and eligibility filtering; this action does not
  // duplicate that logic.
  const { data, error } = await supabase.rpc("search_claimable_people", {
    // p_query has SQL DEFAULT NULL: pass undefined (omit) when there is no
    // search term, so PostgreSQL applies that default (== no filter, browse).
    p_query: query.length > 0 ? query : undefined,
  });

  if (error) {
    // Generic, retry-safe message only — never surface the underlying
    // Postgres error text to the client (could reveal schema/internal
    // detail unrelated to what the user typed).
    return {
      status: "error",
      query,
      error: "Something went wrong while searching. Please try again.",
    };
  }

  return {
    status: "success",
    query,
    results: (data ?? []).map((row) => ({ id: row.id, displayName: row.display_name })),
  };
}
