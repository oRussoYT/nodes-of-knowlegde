// Server-only reads. The database decides who may see what; all fail closed.

import { createClient } from "@/lib/supabase/server";

import {
  parseContributionOptions,
  parseMyCandidates,
  parseQueue,
  type ContributionOptions,
  type MyCandidate,
  type QueueCandidate,
} from "./parse";

export async function getContributionOptions(): Promise<ContributionOptions> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_contribution_options");
  return error ? { kinds: [], capacities: [] } : parseContributionOptions(data);
}

export async function listMyCandidates(): Promise<MyCandidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_contribution_candidates");
  return error ? [] : parseMyCandidates(data);
}

export async function listCandidateQueue(): Promise<QueueCandidate[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_list_contribution_candidates");
  return error ? null : parseQueue(data);
}
