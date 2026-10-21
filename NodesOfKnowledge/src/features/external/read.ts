// Server-only read of external proposals for one import batch.

import { createClient } from "@/lib/supabase/server";

import { parseExternalBatch } from "./parse";
import type { ExternalBatchDocument } from "./types";

export async function getExternalBatch(batchId: string): Promise<ExternalBatchDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_import_external", { p_batch_id: batchId });
  return error ? null : parseExternalBatch(data);
}
