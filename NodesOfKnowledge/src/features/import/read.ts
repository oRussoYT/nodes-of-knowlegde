// Server-only reads for the import screens. The database functions are the
// authorization boundary (reviewer-gated); these fail closed.

import { createClient } from "@/lib/supabase/server";

import { parseImportBatches, parseImportCandidates } from "./parse";
import type { ImportBatchSummary, ImportCandidatesDocument } from "./types";

export async function listImportBatches(): Promise<ImportBatchSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_list_import_batches");
  return error ? [] : parseImportBatches(data);
}

export async function getImportCandidates(batchId: string): Promise<ImportCandidatesDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_import_candidates", { p_batch_id: batchId });
  return error ? null : parseImportCandidates(data);
}

export interface InstitutionOption {
  id: string;
  name: string;
}

export async function listInstitutionOptions(): Promise<InstitutionOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_organizations");
  if (error || !Array.isArray(data)) return [];
  return data
    .filter((o) => typeof o.id === "string" && typeof o.name === "string")
    .map((o) => ({ id: o.id, name: o.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
