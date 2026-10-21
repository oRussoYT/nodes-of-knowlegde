// Server-only: the confirmation links of one list and their answers.

import { createClient } from "@/lib/supabase/server";

export interface ConfirmationLinkRow {
  id: string;
  token: string;
  displayName: string;
  expiresAt: string;
  respondedAt: string | null;
  response: string | null;
  note: string | null;
}

export async function listConfirmationLinks(batchId: string): Promise<ConfirmationLinkRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_list_confirmations", { p_batch_id: batchId });
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => ({
    id: r.id,
    token: r.token,
    displayName: r.display_name,
    expiresAt: r.expires_at,
    respondedAt: r.responded_at,
    response: r.response,
    note: r.note,
  }));
}
