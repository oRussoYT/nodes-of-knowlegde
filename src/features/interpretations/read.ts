import { createClient } from "@/lib/supabase/server";

import { parseInterpretations, parsePendingInterpretations, type Interpretation, type PendingInterpretation } from "./parse";

export async function getInterpretations(subjectType: "person" | "contribution", subjectId: string): Promise<Interpretation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("interpretations_for", { p_type: subjectType, p_subject: subjectId });
  return error ? [] : parseInterpretations(data);
}

export async function getPendingInterpretations(): Promise<PendingInterpretation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_list_interpretations");
  return error ? [] : parsePendingInterpretations(data);
}
