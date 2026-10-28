import { createClient } from "@/lib/supabase/server";

import { parseCandidates, parseOptions, type RecordCandidate, type RecordOptions } from "./parse";

export async function getRecordOptions(): Promise<RecordOptions> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_record_options");
  return parseOptions(error ? null : data);
}

export async function getMyRecordCandidates(): Promise<RecordCandidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_record_candidates");
  return error ? [] : parseCandidates(data);
}

/** Null when the queue cannot be read (not a steward, or an error). */
export async function getRecordQueue(): Promise<RecordCandidate[] | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_list_record_candidates");
  return error ? null : parseCandidates(data);
}

/** Signed links (10 minutes) for a proposal's private evidence files. */
export async function signEvidence(paths: string[]): Promise<{ path: string; name: string; url: string | null }[]> {
  if (paths.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.storage.from("evidence").createSignedUrls(paths, 600);
  return paths.map((path) => ({
    path,
    name: path.split("/").pop()?.replace(/^\d+-/, "") ?? path,
    url: data?.find((d) => d.path === path)?.signedUrl ?? null,
  }));
}

export async function getMyUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return typeof sub === "string" ? sub : null;
}
