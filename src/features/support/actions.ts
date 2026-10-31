"use server";

// One's own support list: private to its owner (the database lets nobody
// else read it, stewards included).

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { readSupportForm } from "./parse";

const PAGE = "/workspace/support";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveSupportItemAction(form: FormData): Promise<void> {
  const parsed = readSupportForm((k) => String(form.get(k) ?? ""));
  if (!parsed.ok) redirect(`${PAGE}?error=${encodeURIComponent(parsed.error)}`);
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_support_item", { p: parsed.value, p_id: UUID.test(id) ? id : null });
  if (error) redirect(`${PAGE}?error=${encodeURIComponent("That could not be saved.")}`);
  revalidatePath(PAGE);
  redirect(`${PAGE}?saved=1`);
}

export async function deleteSupportItemAction(form: FormData): Promise<void> {
  const id = String(form.get("id") ?? "");
  if (UUID.test(id)) {
    const supabase = await createClient();
    await supabase.rpc("delete_support_item", { p_id: id });
  }
  revalidatePath(PAGE);
  redirect(PAGE);
}
