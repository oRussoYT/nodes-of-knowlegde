"use server";

// Steward side of graduate confirmation (ROTEIRO etapa 6): create the private
// links for a list. Sending them is up to the institution (its own email or
// newsletter); the links are listed on the list's page to copy.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createConfirmationLinksAction(formData: FormData): Promise<void> {
  const batchId = String(formData.get("batchId") ?? "");
  if (!UUID.test(batchId)) redirect("/review/import");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("steward_create_confirmations", { p_batch_id: batchId });
  const path = `/review/import/${batchId}`;
  if (error) redirect(`${path}?error=${encodeURIComponent("The links could not be created. Please try again.")}`);
  revalidatePath(path);
  redirect(`${path}?notice=${encodeURIComponent(data === 0 ? "Every decided row already has a link." : `${data} confirmation links created.`)}#confirm-heading`);
}
