"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function dismissSuggestionAction(formData: FormData): Promise<void> {
  const personId = String(formData.get("personId") ?? "");
  if (UUID.test(personId)) {
    const supabase = await createClient();
    await supabase.rpc("dismiss_suggestion", { p_person_id: personId });
  }
  revalidatePath("/member/suggestions");
  redirect("/member/suggestions");
}

export async function setSuggestionOptOutAction(formData: FormData): Promise<void> {
  const optOut = formData.get("optOut") === "true";
  const supabase = await createClient();
  await supabase.rpc("set_my_suggestion_opt_out", { p_opt_out: optOut });
  revalidatePath("/member/suggestions");
  redirect("/member/suggestions");
}
