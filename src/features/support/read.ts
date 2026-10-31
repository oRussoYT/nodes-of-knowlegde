import { createClient } from "@/lib/supabase/server";

import { parseSupportDraft, type SupportDraft } from "./parse";

export async function getSupportDraft(): Promise<SupportDraft | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_support_draft");
  return error ? null : parseSupportDraft(data);
}
