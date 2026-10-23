// Server-only read of external proposals for one import batch.

import { createClient } from "@/lib/supabase/server";

import { parseExternalBatch } from "./parse";
import type { ExternalBatchDocument } from "./types";

export async function getExternalBatch(batchId: string): Promise<ExternalBatchDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_import_external", { p_batch_id: batchId });
  return error ? null : parseExternalBatch(data);
}

export interface RecordSourceLink {
  source: "openalex" | "ror";
  url: string;
}

/** The public link an imported record came from (OpenAlex, ROR), if any. */
export async function getRecordSource(
  subjectType: "organization" | "participation" | "contribution",
  subjectId: string,
): Promise<RecordSourceLink | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("external_record_sources")
    .select("source, url")
    .eq("subject_type", subjectType)
    .eq("subject_id", subjectId)
    .limit(1)
    .maybeSingle();
  if (!data || typeof data.url !== "string" || !/^https?:\/\//i.test(data.url)) return null;
  return { source: data.source === "ror" ? "ror" : "openalex", url: data.url };
}
