import { createClient } from "@/lib/supabase/server";

import { parseCv, type Cv } from "./parse";

export async function getPersonCv(personId: string): Promise<Cv | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("person_cv", { p_person_id: personId });
  return error ? null : parseCv(data);
}
