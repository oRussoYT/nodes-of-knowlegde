"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function setMyPrivacyAction(form: FormData): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_privacy", { p_limit_revelations: form.get("limitRevelations") === "on" });
  if (error) redirect(`/profile?privacyError=${encodeURIComponent("Link your account to your record first.")}#privacy`);
  revalidatePath("/profile");
  redirect("/profile?privacySaved=1#privacy");
}
