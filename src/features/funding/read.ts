import { createClient } from "@/lib/supabase/server";

import { parseCalls, type FundingCall } from "./parse";

export async function listCalls(query: string | null): Promise<FundingCall[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_funding_calls", query ? { p_query: query } : {});
  return error ? [] : parseCalls(data);
}

export async function getMyFundingMatches(): Promise<{ linked: boolean; matches: FundingCall[] }> {
  const supabase = await createClient();
  const { data: me } = await supabase.rpc("my_linked_person");
  if (typeof me !== "string") return { linked: false, matches: [] };
  const { data, error } = await supabase.rpc("funding_matches_for", { p_person_id: me });
  return { linked: true, matches: error ? [] : parseCalls(data) };
}

export async function getNodeFundingMatches(slug: string): Promise<FundingCall[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("node_funding_matches", { p_slug: slug });
  return error ? null : parseCalls(data);
}
